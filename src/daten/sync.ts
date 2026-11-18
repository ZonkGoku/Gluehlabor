// Hintergrund-Synchronisation.
//
// Hochladen: Jeder offene Eintrag wird als eigene Datei data/eintraege/<id>.json
// per GitHub-Contents-API auf main geschrieben (Fotos vorher nach data/fotos/).
// Holen: Der beim Deploy erzeugte Datenbestand ./daten/eintraege.json wird
// gelesen; Einträge des anderen Geräts landen lokal als „fertig".
//
// Läuft beim Start, nach jedem Speichern, wenn das Netz zurückkommt, wenn die
// App wieder sichtbar wird, und alle 30 s, solange etwas offen ist.

import { eintragAlsJson, istEintrag } from '../lib/veroeffentlichung';
import { PFAD_EINTRAEGE, PFAD_FOTOS, REPO, URL_DATENBESTAND } from './config';
import { db, leseEinstellung, type LokalerEintrag } from './db';

export type SyncZustand = 'bereit' | 'laeuft' | 'offline' | 'kein-token' | 'token-ungueltig' | 'fehler';

export interface SyncInfo {
  zustand: SyncZustand;
  meldung?: string;
  zuletzt?: number;
}

let info: SyncInfo = { zustand: 'bereit' };
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

class HttpFehler extends Error {
  constructor(
    public status: number,
    text: string,
  ) {
    super(`GitHub ${status}: ${text}`);
  }
}

function utf8ZuBase64(s: string): string {
  const bytes = new TextEncoder().encode(s);
  let bin = '';
  for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(bin);
}

async function blobZuBase64(b: Blob): Promise<string> {
  const bytes = new Uint8Array(await b.arrayBuffer());
  let bin = '';
  for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(bin);
}

/** Legt eine Datei an. Existiert sie schon (frühere, unbestätigte Übertragung), gilt das als Erfolg. */
async function legeDateiAn(token: string, pfad: string, base64: string, message: string): Promise<void> {
  const url = `https://api.github.com/repos/${REPO.owner}/${REPO.name}/contents/${pfad}`;
  const res = await fetch(url, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
    },
    body: JSON.stringify({ message, content: base64, branch: REPO.branch }),
  });
  if (res.ok) return;
  // 422 ohne sha = Datei existiert bereits. Einträge sind unveränderlich, also fertig.
  if (res.status === 422) {
    const text = await res.text();
    if (/sha/i.test(text)) return;
    throw new HttpFehler(422, text);
  }
  throw new HttpFehler(res.status, await res.text().catch(() => ''));
}

async function ladeHoch(token: string, e: LokalerEintrag): Promise<void> {
  let eintrag = e;
  if (e.fotoBlob && !e.foto) {
    const pfad = `${PFAD_FOTOS}/${e.id}.jpg`;
    await legeDateiAn(token, pfad, await blobZuBase64(e.fotoBlob), `Foto: ${e.stand}`);
    eintrag = { ...e, foto: `fotos/${e.id}.jpg` };
    await db.eintraege.update(e.id, { foto: eintrag.foto });
  }
  await legeDateiAn(
    token,
    `${PFAD_EINTRAEGE}/${e.id}.json`,
    utf8ZuBase64(eintragAlsJson(eintrag)),
    `Becher: ${e.stand} (${e.markt}, ${e.saison})`,
  );
  await db.eintraege.update(e.id, { sync: 'fertig', syncFehler: undefined, fotoBlob: undefined });
}

/** Holt den veröffentlichten Datenbestand und ergänzt lokal, was fehlt. */
export async function holeDatenbestand(): Promise<number> {
  const res = await fetch(URL_DATENBESTAND, { cache: 'no-cache' });
  if (!res.ok) return 0;
  const daten: unknown = await res.json();
  if (!Array.isArray(daten)) return 0;
  const gueltig = daten.filter(istEintrag);
  return db.transaction('rw', db.eintraege, async () => {
    let neu = 0;
    for (const e of gueltig) {
      const lokal = await db.eintraege.get(e.id);
      if (lokal?.sync === 'offen') continue; // lokale Fassung gewinnt, bis sie hochgeladen ist
      if (!lokal) neu++;
      await db.eintraege.put({ ...e, sync: 'fertig' });
    }
    return neu;
  });
}

let laufend: Promise<void> | null = null;

export function synchronisiere(): Promise<void> {
  if (!laufend) laufend = lauf().finally(() => (laufend = null));
  return laufend;
}

async function lauf(): Promise<void> {
  if (!navigator.onLine) return setze({ ...info, zustand: 'offline' });
  setze({ ...info, zustand: 'laeuft' });

  try {
    await holeDatenbestand();
  } catch {
    // Datenbestand nicht erreichbar: Hochladen trotzdem versuchen.
  }

  const offen = await db.eintraege.where('sync').equals('offen').sortBy('erstelltAm');
  if (offen.length === 0) return setze({ zustand: 'bereit', zuletzt: Date.now() });

  const token = await leseEinstellung<string>('token', '');
  if (!token) return setze({ zustand: 'kein-token' });

  for (const e of offen) {
    try {
      await ladeHoch(token, e);
    } catch (err) {
      if (err instanceof HttpFehler && (err.status === 401 || err.status === 403 || err.status === 404)) {
        return setze({ zustand: 'token-ungueltig', meldung: err.message });
      }
      if (!(err instanceof HttpFehler)) {
        // Netzfehler: Funkloch. Später erneut.
        return setze({ zustand: 'offline' });
      }
      await db.eintraege.update(e.id, { syncFehler: err.message });
      return setze({ zustand: 'fehler', meldung: err.message });
    }
  }
  setze({ zustand: 'bereit', zuletzt: Date.now() });
}

let gestartet = false;

/** Richtet die automatischen Auslöser ein. Einmal beim App-Start aufrufen. */
export function starteSync(): void {
  if (gestartet) return;
  gestartet = true;
  const anstossen = () => void synchronisiere();
  window.addEventListener('online', anstossen);
  window.addEventListener('offline', () => setze({ ...info, zustand: 'offline' }));
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') anstossen();
  });
  setInterval(async () => {
    if ((await db.eintraege.where('sync').equals('offen').count()) > 0) anstossen();
  }, 30_000);
  anstossen();
}
