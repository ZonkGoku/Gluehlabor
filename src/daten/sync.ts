// Hintergrund-Synchronisation mit dem Community-Server.
//
// Reihenfolge: Gerät anmelden, Namen senden, offene Becher senden, neue Becher holen.
// Läuft beim Start, nach jedem Speichern, wenn das Netz zurückkommt, wenn die App
// wieder sichtbar wird, und alle 30 s, solange etwas offen ist. Ein Becher geht nie
// verloren: bis der Server ihn angenommen hat, bleibt er lokal "offen".

import { eintragFuerServer, istEintrag } from '../lib/veroeffentlichung';
import { api, ApiFehler } from './api';
import { HAT_SERVER } from './config';
import { db, holeGeraet, leseEinstellung, schreibeEinstellung, type LokalerEintrag } from './db';
import { bereiteFotoFuerUpload } from './foto';

export type SyncZustand = 'bereit' | 'laeuft' | 'offline' | 'kein-server' | 'fehler' | 'gesperrt';

export interface SyncInfo {
  zustand: SyncZustand;
  meldung?: string;
  zuletzt?: number;
}

let info: SyncInfo = { zustand: HAT_SERVER ? 'bereit' : 'kein-server' };
const hoerer = new Set<(i: SyncInfo) => void>();

function setze(neu: SyncInfo) {
  info = neu;
  hoerer.forEach((h) => h(info));
}

export function abonniereSync(h: (i: SyncInfo) => void): () => void {
  hoerer.add(h);
  h(info);
  return () => hoerer.delete(h);
}

interface Antwortzeile {
  id: string;
  status: 'ok' | 'bereits' | 'abgelehnt' | 'zu-viele' | 'name-fehlt';
  grund?: string;
}

async function anmelden(geraet: Awaited<ReturnType<typeof holeGeraet>>): Promise<void> {
  if (await leseEinstellung('registriert', false)) return;
  try {
    await api('/api/geraete', { methode: 'POST', body: { id: geraet.id, schluessel: geraet.schluessel } });
  } catch (err) {
    // 409: Die Kennung ist schon beim Server, z. B. weil die Antwort damals verloren ging. Dann prüfen, ob der Schlüssel passt.
    if (!(err instanceof ApiFehler) || err.status !== 409) throw err;
    await api('/api/ich', { geraet });
  }
  await schreibeEinstellung('registriert', true);
}

async function sendeName(geraet: Awaited<ReturnType<typeof holeGeraet>>): Promise<void> {
  const ich = await api<{ name: string | null; pruefstelle: boolean }>('/api/ich', { geraet });
  await schreibeEinstellung('pruefstelle', ich.pruefstelle);
  if (await leseEinstellung('nameGesendet', true)) return;
  const name = await leseEinstellung<string>('name', '');
  try {
    await api('/api/ich', { methode: 'PUT', geraet, body: { name } });
  } catch (err) {
    // Der Server lehnt den Namen ab (z. B. reserviert): lokal zurücknehmen, damit nichts hängen bleibt.
    if (err instanceof ApiFehler && err.status === 422) {
      await schreibeEinstellung('name', '');
      await schreibeEinstellung('nameFehler', err.message);
      await schreibeEinstellung('nameGesendet', true);
      return;
    }
    throw err;
  }
  await schreibeEinstellung('nameGesendet', true);
}

async function sendeBecher(geraet: Awaited<ReturnType<typeof holeGeraet>>): Promise<void> {
  const offen = await db.eintraege.where('sync').equals('offen').sortBy('erstelltAm');
  for (let i = 0; i < offen.length; i += 10) {
    const paket = offen.slice(i, i + 10);
    let antwort: { ergebnisse: Antwortzeile[] };
    try {
      antwort = await api('/api/becher', { methode: 'POST', geraet, body: { eintraege: paket.map(eintragFuerServer) } });
    } catch (err) {
      // Server kennt das Gerät nicht mehr (z. B. zurückgesetzt): beim nächsten Lauf neu anmelden.
      if (err instanceof ApiFehler && err.status === 401) await schreibeEinstellung('registriert', false);
      throw err;
    }
    for (const r of antwort.ergebnisse) {
      if (r.status === 'ok' || r.status === 'bereits') await db.eintraege.update(r.id, { sync: 'fertig', syncFehler: undefined });
      else if (r.status === 'abgelehnt') await db.eintraege.update(r.id, { sync: 'abgelehnt', syncFehler: r.grund });
      // 'zu-viele' und 'name-fehlt': bleibt offen und wird später erneut versucht
      else if (r.status === 'name-fehlt') await db.eintraege.update(r.id, { syncFehler: r.grund });
    }
    if (antwort.ergebnisse.some((r) => r.status === 'zu-viele')) {
      throw new ApiFehler(429, 'Tageslimit erreicht. Der Rest folgt morgen.');
    }
  }
}

/** Schickt nachträgliche Änderungen eigener Bewertungen (Noten, Preis, Größe, Sorte, Notiz) an den Server. */
async function sendeAenderungen(geraet: Awaited<ReturnType<typeof holeGeraet>>): Promise<void> {
  const offen = (await db.eintraege.toArray()).filter((e) => e.aenderung === true);
  for (const e of offen) {
    try {
      await api('/api/becher/aendern', {
        methode: 'POST',
        geraet,
        body: { id: e.id, noten: e.noten, preis: e.preis, menge: e.menge ?? null, sorte: e.sorte ?? null, notiz: e.notiz ?? null },
      });
      await db.eintraege.update(e.id, { aenderung: undefined, syncFehler: undefined });
    } catch (err) {
      if (err instanceof ApiFehler && err.status === 404) {
        // Die Bewertung gibt es auf dem Server nicht mehr (ausgeblendet): nichts mehr zu senden.
        await db.eintraege.update(e.id, { aenderung: undefined });
      } else if (err instanceof ApiFehler && err.status === 422) {
        // Der Server mag die Änderung nicht: Grund merken, die Änderung gilt dann nur auf diesem Gerät.
        await db.eintraege.update(e.id, { aenderung: undefined, syncFehler: err.message });
      } else {
        throw err;
      }
    }
  }
}

/** Lädt Fotos hoch, die der Bewertende für alle freigegeben hat (und nur die). Scheitert ein Bild dauerhaft, bleibt es privat und der Grund wird gemerkt. */
async function sendeFotos(geraet: Awaited<ReturnType<typeof holeGeraet>>): Promise<void> {
  const offen = (await db.eintraege.toArray()).filter((e) => e.sync === 'fertig' && e.fotoBlob && e.fotoOeffentlich && !e.fotoHochgeladen);
  for (const e of offen) {
    try {
      const { gross, klein } = await bereiteFotoFuerUpload(e.fotoBlob as Blob);
      await api('/api/foto', { methode: 'POST', geraet, body: { id: e.id, einwilligung: true, gross, klein } });
      await db.eintraege.update(e.id, { fotoHochgeladen: true, fotoFehler: undefined });
    } catch (err) {
      if (err instanceof ApiFehler && (err.status === 429 || err.status === 507)) {
        await db.eintraege.update(e.id, { fotoFehler: err.message });
        return; // später wieder
      }
      if (err instanceof ApiFehler && err.status >= 500) throw err;
      if (err instanceof TypeError) throw err; // kein Netz: später wieder
      // Das Bild ist nicht brauchbar oder der Server mag es nicht: privat lassen, Grund merken
      await db.eintraege.update(e.id, { fotoOeffentlich: false, fotoFehler: err instanceof Error ? err.message : 'Das Foto konnte nicht hochgeladen werden.' });
    }
  }
}

interface Seite {
  eintraege: unknown[];
  naechste: number;
  mehr: boolean;
}

/** Holt alle neuen oder geänderten Becher. Ausgeblendete Becher werden lokal entfernt. */
export async function holeBecher(): Promise<number> {
  let cursor = await leseEinstellung<number>('cursor', 0);
  let neu = 0;
  for (let runde = 0; runde < 50; runde++) {
    const seite = await api<Seite>(`/api/becher?nach=${cursor}&limit=200`);
    await db.transaction('rw', db.eintraege, async () => {
      for (const roh of seite.eintraege) {
        const r = roh as { id?: string; versteckt?: boolean };
        if (r.versteckt && typeof r.id === 'string') {
          const lokal = await db.eintraege.get(r.id);
          if (lokal && lokal.sync !== 'offen') await db.eintraege.delete(r.id);
          continue;
        }
        if (!istEintrag(roh)) continue;
        const lokal = await db.eintraege.get(roh.id);
        if (lokal?.sync === 'offen' || lokal?.aenderung) continue; // lokale Fassung gewinnt, bis sie gesendet ist
        if (!lokal) neu++;
        // Foto bleibt erhalten: es liegt nur lokal.
        // `foto` kommt immer vom Server (fehlt es dort, ist das Foto privat, gelöscht oder ausgeblendet)
        await db.eintraege.put({ ...(lokal ?? {}), ...roh, foto: (roh as { foto?: string }).foto, sync: 'fertig', syncFehler: undefined });
      }
    });
    cursor = seite.naechste;
    await schreibeEinstellung('cursor', cursor);
    if (!seite.mehr) break;
  }
  return neu;
}

export const MELDEGRUENDE: { wert: string; label: string }[] = [
  { wert: 'spam', label: 'Spam oder Werbung' },
  { wert: 'unpassend', label: 'Beleidigend oder unpassend' },
  { wert: 'falsch', label: 'Falsche Angaben' },
  { wert: 'persoenlich', label: 'Enthält persönliche Daten' },
  { wert: 'sonstiges', label: 'Sonstiges' },
];

/** Meldet einen Becher beim Server (Meldeverfahren). Wirft ApiFehler mit lesbarer Meldung. */
export async function meldeBecher(id: string, grund: string, text: string): Promise<void> {
  const geraet = await holeGeraet();
  await anmelden(geraet);
  await api('/api/melden', { methode: 'POST', geraet, body: { id, grund, ...(text.trim() ? { text: text.trim() } : {}) } });
}

let laufend: Promise<void> | null = null;

export function synchronisiere(): Promise<void> {
  if (!laufend) laufend = lauf().finally(() => (laufend = null));
  return laufend;
}

async function lauf(): Promise<void> {
  if (!HAT_SERVER) return setze({ zustand: 'kein-server' });
  if (!navigator.onLine) return setze({ ...info, zustand: 'offline' });
  setze({ ...info, zustand: 'laeuft' });
  try {
    const geraet = await holeGeraet();
    await anmelden(geraet);
    await sendeName(geraet);
    await sendeBecher(geraet);
    await sendeAenderungen(geraet);
    await sendeFotos(geraet);
    await holeBecher();
    setze({ zustand: 'bereit', zuletzt: Date.now() });
  } catch (err) {
    if (err instanceof ApiFehler) {
      if (err.status === 403) return setze({ zustand: 'gesperrt', meldung: err.message });
      return setze({ zustand: 'fehler', meldung: err.message });
    }
    // Netzfehler: Funkloch. Später erneut.
    setze({ zustand: 'offline' });
  }
}

let gestartet = false;

/** Richtet die automatischen Auslöser ein. Einmal beim App-Start aufrufen. */
export function starteSync(): void {
  if (gestartet) return;
  gestartet = true;
  const anstossen = () => void synchronisiere();
  window.addEventListener('online', anstossen);
  window.addEventListener('offline', () => setze({ ...info, zustand: HAT_SERVER ? 'offline' : 'kein-server' }));
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') anstossen();
  });
  setInterval(async () => {
    const offen = await db.eintraege.where('sync').equals('offen').count();
    const nameOffen = !(await leseEinstellung('nameGesendet', true));
    if (offen > 0 || nameOffen) anstossen();
  }, 30_000);
  anstossen();
}

export type { LokalerEintrag };

/** Stellt sicher, dass dieses Gerät beim Server angemeldet ist (für Funktionen außerhalb des Abgleichs, z. B. Rennen). */
export async function sorgeFuerAnmeldung(): Promise<Awaited<ReturnType<typeof holeGeraet>>> {
  const geraet = await holeGeraet();
  await anmelden(geraet);
  return geraet;
}
