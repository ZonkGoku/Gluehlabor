// Glühlabor Community-Server: alle Endpunkte. Reine Logik, läuft auf Cloudflare Workers + D1
// (worker/) und auf dem eigenen Server mit SQLite (server/).
//
// Grundsätze
// - Keine Konten. Ein Gerät wählt eine Kennung und einen Schlüssel und meldet sich damit an.
//   Der Server kennt nur den Hash des Schlüssels.
// - Der Server vertraut nichts aus der App: jede Einreichung läuft durch dieselbe
//   Prüfung wie in der App (src/lib/community.ts).
// - Das Prüfstellen-Siegel gibt es nur über einen Code, den David und Philip kennen.
// - Ausgeblendete Becher werden als Platzhalter ausgeliefert, damit Geräte sie entfernen.

import { pruefeEinreichung, pruefeName, pruefeText, saeubere, GRENZEN } from '../../src/lib/community';
import type { D1Like } from './db';

export interface Env {
  DB: D1Like;
  /** Geheimnis für Moderation und Import. */
  ADMIN_TOKEN?: string;
  /** Geheimer Code, mit dem sich ein Gerät als Prüfstelle ausweist. */
  PRUEFSTELLE_CODE?: string;
  /** Kommagetrennte Ursprünge, die schreiben dürfen. */
  ERLAUBTE_URSPRUENGE?: string;
  /** Geheimes Salz, mit dem Adressen vor dem Zählen gehasht werden. Ohne Wert dient ADMIN_TOKEN als Salz. */
  IP_SALT?: string;
}

const LIMITS = {
  geraeteJeIpUndStunde: 150,
  becherJeGeraetUndTag: 100,
  becherJeGeraetUndTagPruefstelle: 1000,
  schreibzugriffeJeIpUndMinute: 240,
  meldungenJeGeraetUndTag: 20,
  rueckmeldungenJeGeraetUndTag: 10,
  rennenJeGeraetUndTag: 5,
  maxTeilnehmerJeRennen: 12,
  maxBodyBytes: 64_000,
  maxBodyFoto: 700_000,
  fotoMaxBytes: 400_000,
  fotoKleinMaxBytes: 40_000,
  fotosJeGeraetUndTag: 30,
  fotosGesamtMaxBytes: 1_500_000_000,
  maxEintraegeJeAnfrage: 20,
  maxImport: 100,
};
const MAX_STAND_IDS = 200;
const RENNEN_MIN = 2;
const RENNEN_MAX = 50;
const RENNEN_DAUER = 14 * 24 * 60 * 60_000;
const RENNEN_FARBEN = 8;
const FAHRZEUGE = 4;
const RENNEN_ID = /^[a-z0-9]{8}$/;

/** Fahrzeug aus der Anfrage: fehlt es, gilt 0 (Schlitten); sonst muss es eine ganze Zahl von 0 bis FAHRZEUGE - 1 sein. */
function fahrzeugAus(roh: unknown): number {
  if (roh === undefined || roh === null) return 0;
  if (typeof roh !== 'number' || !Number.isInteger(roh) || roh < 0 || roh >= FAHRZEUGE) throw new HttpFehler(400, 'Ungültiges Fahrzeug.');
  return roh;
}

const MELDEGRUENDE = ['unpassend', 'spam', 'falsch', 'persoenlich', 'sonstiges'];
const MIN = 60_000;
const STUNDE = 60 * MIN;
const TAG = 24 * STUNDE;

// ───────── Hilfen ─────────

function json(daten: unknown, status: number, kopf: HeadersInit = {}): Response {
  return new Response(JSON.stringify(daten), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8', ...kopf },
  });
}

class HttpFehler extends Error {
  constructor(
    public status: number,
    message: string,
    public extra: Record<string, unknown> = {},
  ) {
    super(message);
  }
}

async function sha256Hex(s: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Schlüssel für Zähler je Adresse. Die Adresse selbst wird nie gespeichert: gehasht mit einem
 * geheimen Salz und dem Tag, damit sich Zähler nicht über Tage hinweg verknüpfen lassen.
 */
export async function adressSchluessel(env: Env, art: string, ip: string, jetzt: number): Promise<string> {
  const salz = env.IP_SALT ?? env.ADMIN_TOKEN ?? '';
  const h = await sha256Hex(`${salz}|${Math.floor(jetzt / TAG)}|${ip}`);
  return `${art}:${h.slice(0, 24)}`;
}

/** Löscht abgelaufene Zähler. Läuft täglich per Zeitplan, siehe index.ts. */
export async function raeumeAuf(db: D1Like, jetzt: number): Promise<number> {
  const r = await db.prepare('DELETE FROM limits WHERE ablauf < ?').bind(jetzt - TAG).run();
  return r.meta.changes;
}

/** Vergleich ohne Zeitunterschiede. */
function gleich(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

async function lesen(request: Request, maxZeichen: number = LIMITS.maxBodyBytes): Promise<Record<string, unknown>> {
  const text = await request.text();
  if (text.length > maxZeichen) throw new HttpFehler(413, 'Anfrage zu groß.');
  try {
    const x = JSON.parse(text);
    if (!x || typeof x !== 'object' || Array.isArray(x)) throw new Error();
    return x as Record<string, unknown>;
  } catch {
    throw new HttpFehler(400, 'Kein gültiges JSON.');
  }
}

/** Zähler je Schlüssel und Zeitfenster. true = noch erlaubt. */
async function begrenze(db: D1Like, schluessel: string, fensterMs: number, max: number, jetzt: number): Promise<boolean> {
  const fenster = Math.floor(jetzt / fensterMs);
  await db
    .prepare(
      `INSERT INTO limits (schluessel, fenster, anzahl, ablauf) VALUES (?, ?, 1, ?)
       ON CONFLICT(schluessel) DO UPDATE SET
         anzahl = CASE WHEN fenster = excluded.fenster THEN anzahl + 1 ELSE 1 END,
         fenster = excluded.fenster,
         ablauf = excluded.ablauf`,
    )
    .bind(schluessel, fenster, (fenster + 1) * fensterMs)
    .run();
  const z = await db.prepare('SELECT anzahl FROM limits WHERE schluessel = ?').bind(schluessel).first<{ anzahl: number }>();
  return (z?.anzahl ?? 0) <= max;
}

interface GeraetZeile {
  id: string;
  schluessel_hash: string;
  name: string | null;
  pruefstelle: number;
  gesperrt: number;
}

async function anmelden(request: Request, db: D1Like): Promise<GeraetZeile> {
  const kopf = request.headers.get('Authorization') ?? request.headers.get('X-Auth') ?? '';
  const m = /^Bearer ([A-Za-z0-9_-]{16,64})\.([0-9a-f]{64})$/.exec(kopf);
  if (!m) throw new HttpFehler(401, 'Anmeldung fehlt.');
  const g = await db.prepare('SELECT * FROM geraete WHERE id = ?').bind(m[1]).first<GeraetZeile>();
  if (!g || !gleich(g.schluessel_hash, await sha256Hex(m[2]))) throw new HttpFehler(401, 'Unbekanntes Gerät.');
  if (g.gesperrt) throw new HttpFehler(403, 'Dieses Gerät ist gesperrt.');
  return g;
}

/** Moderation darf, wer das Admin-Token kennt (Kommandozeile) oder ein Gerät ist, das sich als Prüfstelle ausgewiesen hat (Browser). */
async function pruefeModeration(request: Request, env: Env, db: D1Like): Promise<void> {
  if (istAdmin(request, env)) return;
  try {
    const g = await anmelden(request, db);
    if (g.pruefstelle) return;
  } catch {
    /* kein gültiges Gerät */
  }
  throw new HttpFehler(401, 'Nur für die Prüfstelle.');
}

function istAdmin(request: Request, env: Env): boolean {
  const kopf = request.headers.get('Authorization') ?? request.headers.get('X-Auth') ?? '';
  const m = /^Bearer (.+)$/.exec(kopf);
  return Boolean(env.ADMIN_TOKEN && m && gleich(m[1], env.ADMIN_TOKEN));
}

const NAECHSTE_SEQ = '(SELECT COALESCE(MAX(seq), 0) + 1 FROM becher)';

interface BecherZeile {
  seq: number;
  id: string;
  geraet_id: string;
  name: string | null;
  pruefstelle: number;
  besuch_id: string | null;
  stand: string;
  markt: string;
  stadt: string | null;
  saison: number;
  datum: string | null;
  sorte: string | null;
  becher_nr: number | null;
  preis: number | null;
  menge: number | null;
  notiz: string | null;
  geschmack: number | null;
  geruch: number | null;
  temperatur: number | null;
  personal: number | null;
  atmosphaere: number | null;
  preis_leistung: number | null;
  becher: number | null;
  erstellt_am: number;
  versteckt: number;
  /** Nur in der Liste: Zeitpunkt des sichtbaren Fotos, sonst null */
  foto_am?: number | null;
}

function alsEintrag(z: BecherZeile): Record<string, unknown> {
  if (z.versteckt) return { id: z.id, versteckt: true, seq: z.seq };
  const e: Record<string, unknown> = {
    id: z.id,
    seq: z.seq,
    stand: z.stand,
    markt: z.markt,
    saison: z.saison,
    noten: {
      geschmack: z.geschmack,
      geruch: z.geruch,
      temperatur: z.temperatur,
      personal: z.personal,
      atmosphaere: z.atmosphaere,
      preisLeistung: z.preis_leistung,
      becher: z.becher,
    },
    erstelltAm: z.erstellt_am,
    geraet: z.geraet_id,
    pruefstelle: Boolean(z.pruefstelle),
  };
  if (z.stadt) e.stadt = z.stadt;
  if (z.datum) e.datum = z.datum;
  if (z.sorte) e.sorte = z.sorte;
  if (z.becher_nr !== null) e.becherNr = z.becher_nr;
  if (z.preis !== null) e.preis = z.preis;
  if (z.menge !== null) e.menge = z.menge;
  if (z.notiz) e.notiz = z.notiz;
  if (z.name) e.name = z.name;
  if (z.besuch_id) e.besuchId = z.besuch_id;
  if (z.foto_am) e.foto = `/api/foto/${z.id}?v=${z.foto_am}`;
  return e;
}

type Eintragsdaten = Extract<ReturnType<typeof pruefeEinreichung>, { ok: true }>['eintrag'];

/** Unterscheidet sich der gespeicherte Bestandsbecher vom Eintrag der CSV? */
function bestandGeaendert(z: BecherZeile, e: Eintragsdaten): boolean {
  const n = e.noten;
  return (
    z.stand !== e.stand || z.markt !== e.markt || (z.stadt ?? null) !== (e.stadt ?? null) || z.saison !== e.saison ||
    (z.datum ?? null) !== (e.datum ?? null) || (z.sorte ?? null) !== (e.sorte ?? null) || (z.becher_nr ?? null) !== (e.becherNr ?? null) ||
    (z.preis ?? null) !== (e.preis ?? null) || (z.notiz ?? null) !== (e.notiz ?? null) ||
    z.geschmack !== n.geschmack || z.geruch !== n.geruch || z.temperatur !== n.temperatur || z.personal !== n.personal ||
    z.atmosphaere !== n.atmosphaere || z.preis_leistung !== n.preisLeistung || z.becher !== n.becher
  );
}

function einfuegen(db: D1Like, e: Eintragsdaten, geraetId: string, name: string | null, pruefstelle: boolean, jetzt: number) {
  return db
    .prepare(
      `INSERT INTO becher (seq, id, geraet_id, name, pruefstelle, besuch_id, stand, markt, stadt, saison, datum, sorte,
         becher_nr, preis, menge, notiz, geschmack, geruch, temperatur, personal, atmosphaere, preis_leistung, becher,
         erstellt_am, eingegangen_am, versteckt)
       VALUES (${NAECHSTE_SEQ}, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0)`,
    )
    .bind(
      e.id, geraetId, name, pruefstelle ? 1 : 0, e.besuchId ?? null, e.stand, e.markt, e.stadt ?? null, e.saison,
      e.datum ?? null, e.sorte ?? null, e.becherNr ?? null, e.preis ?? null, e.menge ?? null, e.notiz ?? null,
      e.noten.geschmack, e.noten.geruch, e.noten.temperatur, e.noten.personal, e.noten.atmosphaere,
      e.noten.preisLeistung, e.noten.becher, e.erstelltAm, jetzt,
    );
}

// ───────── Ursprünge (CORS) ─────────

function erlaubteUrspruenge(env: Env): string[] {
  return (env.ERLAUBTE_URSPRUENGE ?? '').split(',').map((s) => s.trim()).filter(Boolean);
}

function corsKopf(request: Request, env: Env, nurLesen: boolean): Record<string, string> {
  const ursprung = request.headers.get('Origin');
  const basis = { Vary: 'Origin' };
  if (nurLesen) return { ...basis, 'Access-Control-Allow-Origin': '*' };
  if (ursprung && erlaubteUrspruenge(env).includes(ursprung)) return { ...basis, 'Access-Control-Allow-Origin': ursprung };
  return basis;
}

// ───────── Einstieg ─────────

export async function handle(request: Request, env: Env, jetzt: number = Date.now()): Promise<Response> {
  const url = new URL(request.url);
  const pfad = url.pathname.replace(/\/+$/, '') || '/';
  const methode = request.method.toUpperCase();
  const nurLesen = methode === 'GET' && (pfad === '/api/becher' || pfad === '/api/status' || pfad.startsWith('/api/rennen/') || pfad.startsWith('/api/foto/'));
  const cors = corsKopf(request, env, nurLesen);

  try {
    if (methode === 'OPTIONS') {
      const ursprung = request.headers.get('Origin');
      const ok = !ursprung || erlaubteUrspruenge(env).includes(ursprung);
      return new Response(null, {
        status: ok ? 204 : 403,
        headers: {
          ...corsKopf(request, env, false),
          'Access-Control-Allow-Methods': 'GET, POST, PUT, OPTIONS',
          'Access-Control-Allow-Headers': 'Authorization, Content-Type, X-Auth',
          'Access-Control-Max-Age': '86400',
        },
      });
    }

    // Schreibende Anfragen aus Browsern nur von erlaubten Seiten.
    if (methode !== 'GET') {
      const ursprung = request.headers.get('Origin');
      if (ursprung && !erlaubteUrspruenge(env).includes(ursprung)) throw new HttpFehler(403, 'Ursprung nicht erlaubt.');
    }

    const ip = request.headers.get('CF-Connecting-IP') ?? 'unbekannt';
    // Nur Schreibzugriffe werden gezählt. Lesen kostet keine Datenbank-Schreibzeile; dort schützt der Zwischenspeicher am Rand.
    if (methode !== 'GET' && !(await begrenze(env.DB, await adressSchluessel(env, 'schreiben', ip, jetzt), MIN, LIMITS.schreibzugriffeJeIpUndMinute, jetzt))) {
      throw new HttpFehler(429, 'Zu viele Anfragen. Bitte kurz warten.');
    }

    const antwort = await route(request, env, pfad, methode, ip, jetzt);
    for (const [k, v] of Object.entries(cors)) antwort.headers.set(k, v);
    return antwort;
  } catch (err) {
    if (err instanceof HttpFehler) return json({ fehler: err.message, ...err.extra }, err.status, cors);
    console.error(err);
    return json({ fehler: 'Interner Fehler.' }, 500, cors);
  }
}

async function route(request: Request, env: Env, pfad: string, methode: string, ip: string, jetzt: number): Promise<Response> {
  const db = env.DB;

  if (pfad === '/api/status' && methode === 'GET') return json({ ok: true, zeit: jetzt }, 200);

  // ── Gerät anmelden ──
  if (pfad === '/api/geraete' && methode === 'POST') {
    if (!(await begrenze(db, await adressSchluessel(env, 'geraete', ip, jetzt), STUNDE, LIMITS.geraeteJeIpUndStunde, jetzt))) {
      throw new HttpFehler(429, 'Zu viele neue Geräte von dieser Adresse. Bitte später erneut versuchen.');
    }
    const b = await lesen(request);
    if (typeof b.id !== 'string' || !/^[A-Za-z0-9_-]{16,64}$/.test(b.id)) throw new HttpFehler(400, 'Ungültige Kennung.');
    if (typeof b.schluessel !== 'string' || !/^[0-9a-f]{64}$/.test(b.schluessel)) throw new HttpFehler(400, 'Ungültiger Schlüssel.');
    const vorhanden = await db.prepare('SELECT id FROM geraete WHERE id = ?').bind(b.id).first();
    if (vorhanden) throw new HttpFehler(409, 'Diese Kennung ist schon vergeben.');
    await db
      .prepare('INSERT INTO geraete (id, schluessel_hash, erstellt_am) VALUES (?, ?, ?)')
      .bind(b.id, await sha256Hex(b.schluessel), jetzt)
      .run();
    return json({ ok: true }, 201);
  }

  // ── Eigene Daten ──
  if (pfad === '/api/ich') {
    const g = await anmelden(request, db);
    if (methode === 'GET') return json({ id: g.id, name: g.name, pruefstelle: Boolean(g.pruefstelle) }, 200);
    if (methode === 'PUT') {
      const b = await lesen(request);
      const p = pruefeName(b.name, Boolean(g.pruefstelle));
      if (!p.ok) throw new HttpFehler(422, p.grund);
      await db.prepare('UPDATE geraete SET name = ? WHERE id = ?').bind(p.name, g.id).run();
      // Wer sich erst nach dem ersten Becher einen Namen gibt, soll nicht rückwirkend anonym bleiben:
      // bisher namenlose Becher dieses Geräts bekommen den Namen. Schon benannte bleiben, wie sie sind.
      let nachbenannt = 0;
      if (p.name) {
        const { results } = await db.prepare('SELECT id FROM becher WHERE geraet_id = ? AND name IS NULL').bind(g.id).all<{ id: string }>();
        for (const z of results) {
          await db.prepare(`UPDATE becher SET name = ?, seq = ${NAECHSTE_SEQ} WHERE id = ?`).bind(p.name, z.id).run();
          nachbenannt++;
        }
      }
      return json({ ok: true, name: p.name, nachbenannt }, 200);
    }
  }

  if (pfad === '/api/pruefstelle' && methode === 'POST') {
    const g = await anmelden(request, db);
    const b = await lesen(request);
    if (!(await begrenze(db, `code:${g.id}`, STUNDE, 10, jetzt))) throw new HttpFehler(429, 'Zu viele Versuche.');
    // Leerzeichen und Zeilenumbrüche am Rand zählen nicht (beim Einfügen ins Secret oder in die App rutschen sie leicht mit).
    const soll = (env.PRUEFSTELLE_CODE ?? '').trim();
    if (!soll) throw new HttpFehler(503, 'Auf dem Server ist kein Prüfstellen-Code eingerichtet (Secret PRUEFSTELLE_CODE fehlt).');
    if (typeof b.code !== 'string' || !gleich(b.code.trim(), soll)) throw new HttpFehler(403, 'Falscher Code.');
    await db.prepare('UPDATE geraete SET pruefstelle = 1 WHERE id = ?').bind(g.id).run();
    return json({ ok: true, pruefstelle: true }, 200);
  }

  // ── Becher ──
  if (pfad === '/api/becher' && methode === 'POST') {
    const g = await anmelden(request, db);
    const b = await lesen(request);
    if (!Array.isArray(b.eintraege) || b.eintraege.length === 0 || b.eintraege.length > LIMITS.maxEintraegeJeAnfrage) {
      throw new HttpFehler(400, `Bitte 1 bis ${LIMITS.maxEintraegeJeAnfrage} Einträge senden.`);
    }
    // Bewerten kann nur, wer einen Namen hat. Die Becher bleiben in der App „offen" und gehen mit dem Namen später durch.
    if (!g.name) {
      return json(
        {
          ergebnisse: b.eintraege.map((roh) => ({ id: (roh as { id?: unknown } | null)?.id, status: 'name-fehlt', grund: 'Bitte zuerst einen Namen eingeben.' })),
        },
        200,
      );
    }
    const limit = g.pruefstelle ? LIMITS.becherJeGeraetUndTagPruefstelle : LIMITS.becherJeGeraetUndTag;
    const schonHeute = (
      await db
        .prepare('SELECT COUNT(*) AS n FROM becher WHERE geraet_id = ? AND eingegangen_am > ?')
        .bind(g.id, jetzt - TAG)
        .first<{ n: number }>()
    )?.n ?? 0;
    let frei = Math.max(0, limit - schonHeute);

    const ergebnisse: { id: unknown; status: 'ok' | 'bereits' | 'abgelehnt' | 'zu-viele' | 'name-fehlt'; grund?: string }[] = [];
    for (const roh of b.eintraege) {
      const rohId = (roh as { id?: unknown } | null)?.id;
      const p = pruefeEinreichung(roh, jetzt);
      if (!p.ok) {
        ergebnisse.push({ id: rohId, status: 'abgelehnt', grund: p.grund });
        continue;
      }
      // Preis-Leistung wird aus dem Preis berechnet: Ohne Preis nimmt der Server keine neue Bewertung an.
      if (p.eintrag.preis === undefined) {
        ergebnisse.push({ id: p.eintrag.id, status: 'abgelehnt', grund: 'Der Preis fehlt.' });
        continue;
      }
      const vorhanden = await db.prepare('SELECT geraet_id FROM becher WHERE id = ?').bind(p.eintrag.id).first<{ geraet_id: string }>();
      if (vorhanden) {
        ergebnisse.push(
          vorhanden.geraet_id === g.id
            ? { id: p.eintrag.id, status: 'bereits' }
            : { id: p.eintrag.id, status: 'abgelehnt', grund: 'ID ist schon vergeben.' },
        );
        continue;
      }
      if (frei <= 0) {
        ergebnisse.push({ id: p.eintrag.id, status: 'zu-viele', grund: 'Tageslimit erreicht.' });
        continue;
      }
      // Mehrere Bewertungen desselben Stands am selben Abend sind erlaubt (jeder Becher ist eine Bewertung); es bleibt beim Tageslimit.
      await einfuegen(db, p.eintrag, g.id, g.name, Boolean(g.pruefstelle), jetzt).run();
      frei--;
      ergebnisse.push({ id: p.eintrag.id, status: 'ok' });
    }
    return json({ ergebnisse }, 200);
  }

  // Eigene Bewertung nachträglich ändern: Noten, Preis, Größe, Sorte, Notiz. Stand, Ort, Zeitpunkt und Besuch bleiben.
  // Fehlen menge, sorte oder notiz (oder sind sie null), werden sie gelöscht. Dieselbe Prüfung wie beim Einreichen.
  if (pfad === '/api/becher/aendern' && methode === 'POST') {
    const g = await anmelden(request, db);
    const b = await lesen(request);
    if (typeof b.id !== 'string') throw new HttpFehler(400, 'Bewertung nötig.');
    const z = await db.prepare('SELECT * FROM becher WHERE id = ? AND geraet_id = ? AND versteckt = 0').bind(b.id, g.id).first<BecherZeile>();
    if (!z) throw new HttpFehler(404, 'Bewertung nicht gefunden.');
    const roh = { ...alsEintrag(z), noten: b.noten, preis: b.preis ?? null, menge: b.menge ?? null, sorte: b.sorte ?? null, notiz: b.notiz ?? null };
    const p = pruefeEinreichung(roh, z.erstellt_am);
    if (!p.ok) throw new HttpFehler(422, p.grund);
    if (p.eintrag.preis === undefined) throw new HttpFehler(422, 'Der Preis fehlt.');
    const e = p.eintrag;
    await db
      .prepare(
        `UPDATE becher SET sorte = ?, preis = ?, menge = ?, notiz = ?, geschmack = ?, geruch = ?, temperatur = ?, personal = ?,
           atmosphaere = ?, preis_leistung = ?, becher = ?, seq = ${NAECHSTE_SEQ} WHERE id = ? AND geraet_id = ?`,
      )
      .bind(e.sorte ?? null, e.preis, e.menge ?? null, e.notiz ?? null, e.noten.geschmack, e.noten.geruch, e.noten.temperatur, e.noten.personal, e.noten.atmosphaere, e.noten.preisLeistung, e.noten.becher, z.id, g.id)
      .run();
    return json({ ok: true }, 200);
  }

  // ── Fotos ──
  // Ein Foto je Bewertung, nur vom Besitzer, nur mit ausdrücklicher Einwilligung (alle dürfen es sehen). JPEG als Base64.
  if (pfad === '/api/foto' && methode === 'POST') {
    const g = await anmelden(request, db);
    const b = await lesen(request, LIMITS.maxBodyFoto);
    if (typeof b.id !== 'string') throw new HttpFehler(400, 'Bewertung nötig.');
    if (b.einwilligung !== true) throw new HttpFehler(422, 'Bitte bestätige, dass alle das Foto sehen dürfen.');
    const z = await db.prepare('SELECT id FROM becher WHERE id = ? AND geraet_id = ? AND versteckt = 0').bind(b.id, g.id).first<{ id: string }>();
    if (!z) throw new HttpFehler(404, 'Bewertung nicht gefunden.');
    const pruefeBild = (roh: unknown, max: number): number => {
      if (typeof roh !== 'string' || !/^[A-Za-z0-9+/]+={0,2}$/.test(roh)) throw new HttpFehler(422, 'Das Foto ist kein gültiges Bild.');
      if (!roh.startsWith('/9j/')) throw new HttpFehler(422, 'Das Foto muss ein JPEG sein.');
      const bytes = Math.floor((roh.length * 3) / 4) - (roh.endsWith('==') ? 2 : roh.endsWith('=') ? 1 : 0);
      if (bytes > max) throw new HttpFehler(413, 'Das Foto ist zu groß.');
      return bytes;
    };
    const groesse = pruefeBild(b.gross, LIMITS.fotoMaxBytes);
    pruefeBild(b.klein, LIMITS.fotoKleinMaxBytes);
    if (!(await begrenze(db, `foto:${g.id}`, TAG, LIMITS.fotosJeGeraetUndTag, jetzt))) throw new HttpFehler(429, 'Heute schon viele Fotos hochgeladen.');
    const summe = (await db.prepare('SELECT COALESCE(SUM(groesse), 0) AS s FROM fotos').first<{ s: number }>())?.s ?? 0;
    if (summe + groesse > LIMITS.fotosGesamtMaxBytes) throw new HttpFehler(507, 'Der Speicher für Fotos ist voll.');
    await db.prepare('DELETE FROM fotos WHERE becher_id = ?').bind(b.id).run();
    await db
      .prepare('INSERT INTO fotos (becher_id, geraet_id, groesse, gross, klein, erstellt_am, versteckt) VALUES (?, ?, ?, ?, ?, ?, 0)')
      .bind(b.id, g.id, groesse, b.gross, b.klein, jetzt)
      .run();
    await db.prepare(`UPDATE becher SET seq = ${NAECHSTE_SEQ} WHERE id = ?`).bind(b.id).run();
    return json({ ok: true }, 201);
  }
  if (pfad === '/api/foto/loeschen' && methode === 'POST') {
    const g = await anmelden(request, db);
    const b = await lesen(request);
    if (typeof b.id !== 'string') throw new HttpFehler(400, 'Bewertung nötig.');
    const r = await db.prepare('DELETE FROM fotos WHERE becher_id = ? AND geraet_id = ?').bind(b.id, g.id).run();
    if (r.meta.changes === 0) throw new HttpFehler(404, 'Foto nicht gefunden.');
    await db.prepare(`UPDATE becher SET seq = ${NAECHSTE_SEQ} WHERE id = ?`).bind(b.id).run();
    return json({ ok: true }, 200);
  }
  if (pfad.startsWith('/api/foto/') && methode === 'GET') {
    const id = decodeURIComponent(pfad.slice('/api/foto/'.length));
    if (!/^[A-Za-z0-9_-]{8,64}$/.test(id)) throw new HttpFehler(404, 'Foto nicht gefunden.');
    const z = await db
      .prepare('SELECT f.gross AS gross, f.klein AS klein FROM fotos f JOIN becher b ON b.id = f.becher_id WHERE f.becher_id = ? AND f.versteckt = 0 AND b.versteckt = 0')
      .bind(id)
      .first<{ gross: string; klein: string }>();
    if (!z) throw new HttpFehler(404, 'Foto nicht gefunden.');
    const klein = new URL(request.url).searchParams.get('g') === 'klein';
    const bin = atob(klein ? z.klein : z.gross);
    const bytes = Uint8Array.from(bin, (c) => c.charCodeAt(0));
    return new Response(bytes, { status: 200, headers: { 'Content-Type': 'image/jpeg', 'Cache-Control': 'public, max-age=86400', 'X-Content-Type-Options': 'nosniff' } });
  }

  if (pfad === '/api/becher' && methode === 'GET') {
    const q = new URL(request.url).searchParams;
    const nach = Math.max(0, Math.floor(Number(q.get('nach') ?? 0)) || 0);
    const limit = Math.min(500, Math.max(1, Math.floor(Number(q.get('limit') ?? 200)) || 200));
    const { results } = await db
      .prepare('SELECT b.*, f.erstellt_am AS foto_am FROM becher b LEFT JOIN fotos f ON f.becher_id = b.id AND f.versteckt = 0 WHERE b.seq > ? ORDER BY b.seq ASC LIMIT ?')
      .bind(nach, limit + 1)
      .all<BecherZeile>();
    const mehr = results.length > limit;
    const seite = mehr ? results.slice(0, limit) : results;
    return json(
      { eintraege: seite.map(alsEintrag), naechste: seite.at(-1)?.seq ?? nach, mehr },
      200,
      // Der Rand darf 5 s zwischenspeichern, ein Browser nie (siehe src/daten/api.ts).
      { 'Cache-Control': 'public, s-maxage=5, max-age=0' },
    );
  }

  // ── Melden (Meldeverfahren) ──
  if (pfad === '/api/melden' && methode === 'POST') {
    const g = await anmelden(request, db);
    const b = await lesen(request);
    if (typeof b.id !== 'string' || typeof b.grund !== 'string' || !MELDEGRUENDE.includes(b.grund)) {
      throw new HttpFehler(400, 'Becher und Grund nötig.');
    }
    if (b.text !== undefined && b.text !== null && typeof b.text !== 'string') throw new HttpFehler(400, 'Der Text muss Text sein.');
    const text = typeof b.text === 'string' ? [...saeubere(b.text)].slice(0, 300).join('') || null : null;
    if (!(await begrenze(db, `melden:${g.id}`, TAG, LIMITS.meldungenJeGeraetUndTag, jetzt))) {
      throw new HttpFehler(429, 'Heute schon viele Meldungen. Bitte morgen wieder.');
    }
    const z = await db.prepare('SELECT id FROM becher WHERE id = ? AND versteckt = 0').bind(b.id).first();
    if (!z) throw new HttpFehler(404, 'Becher nicht gefunden.');
    await db
      .prepare('INSERT OR IGNORE INTO meldungen (becher_id, geraet_id, grund, text, erstellt_am) VALUES (?, ?, ?, ?, ?)')
      .bind(b.id, g.id, b.grund, text, jetzt)
      .run();
    return json({ ok: true }, 200);
  }

  // ── Rückmeldung aus der App („Was fehlt dir?“) ──
  if (pfad === '/api/feedback' && methode === 'POST') {
    const g = await anmelden(request, db);
    const b = await lesen(request);
    if (typeof b.text !== 'string') throw new HttpFehler(400, 'Bitte schreib uns ein paar Worte.');
    const text = [...saeubere(b.text)].slice(0, 1000).join('').trim();
    if ([...text].length < 3) throw new HttpFehler(400, 'Bitte schreib uns ein paar Worte.');
    const seite = typeof b.seite === 'string' ? [...saeubere(b.seite)].slice(0, 60).join('') || null : null;
    if (!(await begrenze(db, `feedback:${g.id}`, TAG, LIMITS.rueckmeldungenJeGeraetUndTag, jetzt))) {
      throw new HttpFehler(429, 'Heute schon viele Rückmeldungen. Bitte morgen wieder.');
    }
    await db.prepare('INSERT INTO rueckmeldungen (geraet_id, text, seite, erstellt_am) VALUES (?, ?, ?, ?)').bind(g.id, text, seite, jetzt).run();
    return json({ ok: true }, 200);
  }

  // ── Schlittenfahren (Beta) ──
  if (pfad === '/api/rennen' && methode === 'POST') {
    const g = await anmelden(request, db);
    const b = await lesen(request);
    const rname = pruefeName(b.name);
    const kname = pruefeName(b.kamel);
    if (!rname.ok || !rname.name) throw new HttpFehler(422, 'Das Rennen braucht einen Namen.');
    if (!kname.ok || !kname.name) throw new HttpFehler(422, 'Dein Schlitten braucht einen Namen.');
    if (typeof b.ziel !== 'number' || !Number.isInteger(b.ziel) || b.ziel < RENNEN_MIN || b.ziel > RENNEN_MAX) throw new HttpFehler(400, 'Ungültiges Ziel.');
    if (typeof b.farbe !== 'number' || !Number.isInteger(b.farbe) || b.farbe < 0 || b.farbe >= RENNEN_FARBEN) throw new HttpFehler(400, 'Ungültige Farbe.');
    const fahrzeug = fahrzeugAus(b.fahrzeug);
    if (!(await begrenze(db, `rennen:${g.id}`, TAG, LIMITS.rennenJeGeraetUndTag, jetzt))) throw new HttpFehler(429, 'Heute schon viele Rennen angelegt.');
    const id = [...crypto.getRandomValues(new Uint8Array(8))].map((x) => 'abcdefghijkmnpqrstuvwxyz23456789'[x % 32]).join('');
    await db.prepare('INSERT INTO rennen (id, name, ziel, ersteller, erstellt_am, ende) VALUES (?, ?, ?, ?, ?, ?)').bind(id, rname.name, b.ziel, g.id, jetzt, jetzt + RENNEN_DAUER).run();
    await db.prepare('INSERT INTO rennen_teilnehmer (rennen_id, geraet_id, kamel, farbe, seit, fahrzeug) VALUES (?, ?, ?, ?, ?, ?)').bind(id, g.id, kname.name, b.farbe, jetzt, fahrzeug).run();
    return json({ ok: true, id }, 201);
  }
  if (pfad === '/api/rennen/beitreten' && methode === 'POST') {
    const g = await anmelden(request, db);
    const b = await lesen(request);
    if (typeof b.id !== 'string' || !RENNEN_ID.test(b.id)) throw new HttpFehler(400, 'Ungültiges Rennen.');
    const kname = pruefeName(b.kamel);
    if (!kname.ok || !kname.name) throw new HttpFehler(422, 'Dein Schlitten braucht einen Namen.');
    if (typeof b.farbe !== 'number' || !Number.isInteger(b.farbe) || b.farbe < 0 || b.farbe >= RENNEN_FARBEN) throw new HttpFehler(400, 'Ungültige Farbe.');
    const fahrzeug = fahrzeugAus(b.fahrzeug);
    const r = await db.prepare('SELECT id, ende FROM rennen WHERE id = ?').bind(b.id).first<{ id: string; ende: number }>();
    if (!r) throw new HttpFehler(404, 'Rennen nicht gefunden.');
    const schon = await db.prepare('SELECT geraet_id FROM rennen_teilnehmer WHERE rennen_id = ? AND geraet_id = ?').bind(b.id, g.id).first();
    if (schon) return json({ ok: true, schon: true }, 200);
    if (r.ende < jetzt) throw new HttpFehler(410, 'Dieses Rennen ist vorbei.');
    const n = await db.prepare('SELECT COUNT(*) AS n FROM rennen_teilnehmer WHERE rennen_id = ?').bind(b.id).first<{ n: number }>();
    if ((n?.n ?? 0) >= LIMITS.maxTeilnehmerJeRennen) throw new HttpFehler(409, 'Das Rennen ist voll.');
    await db.prepare('INSERT INTO rennen_teilnehmer (rennen_id, geraet_id, kamel, farbe, seit, fahrzeug) VALUES (?, ?, ?, ?, ?, ?)').bind(b.id, g.id, kname.name, b.farbe, jetzt, fahrzeug).run();
    return json({ ok: true }, 200);
  }
  if ((pfad === '/api/rennen/verlassen' || pfad === '/api/rennen/loeschen') && methode === 'POST') {
    const g = await anmelden(request, db);
    const b = await lesen(request);
    if (typeof b.id !== 'string' || !RENNEN_ID.test(b.id)) throw new HttpFehler(400, 'Ungültiges Rennen.');
    const r = await db.prepare('SELECT id, ersteller FROM rennen WHERE id = ?').bind(b.id).first<{ id: string; ersteller: string }>();
    if (!r) throw new HttpFehler(404, 'Rennen nicht gefunden.');
    if (pfad === '/api/rennen/loeschen') {
      if (r.ersteller !== g.id) throw new HttpFehler(403, 'Nur wer das Rennen angelegt hat, darf es löschen.');
      await db.prepare('DELETE FROM rennen_teilnehmer WHERE rennen_id = ?').bind(b.id).run();
      await db.prepare('DELETE FROM rennen WHERE id = ?').bind(b.id).run();
      return json({ ok: true }, 200);
    }
    await db.prepare('DELETE FROM rennen_teilnehmer WHERE rennen_id = ? AND geraet_id = ?').bind(b.id, g.id).run();
    return json({ ok: true }, 200);
  }
  if (pfad.startsWith('/api/rennen/') && methode === 'GET') {
    const id = pfad.slice('/api/rennen/'.length);
    if (!RENNEN_ID.test(id)) throw new HttpFehler(404, 'Rennen nicht gefunden.');
    const r = await db.prepare('SELECT id, name, ziel, ersteller, erstellt_am, ende FROM rennen WHERE id = ?').bind(id).first<Record<string, unknown>>();
    if (!r) throw new HttpFehler(404, 'Rennen nicht gefunden.');
    const { results } = await db
      .prepare('SELECT geraet_id, kamel, farbe, seit, fahrzeug FROM rennen_teilnehmer WHERE rennen_id = ? ORDER BY seit ASC, geraet_id ASC')
      .bind(id)
      .all<{ geraet_id: string; kamel: string; farbe: number; seit: number; fahrzeug: number }>();
    return json({ rennen: r, teilnehmer: results.map((t) => ({ geraet: t.geraet_id, kamel: t.kamel, farbe: t.farbe, fahrzeug: t.fahrzeug ?? 0, seit: t.seit })) }, 200, { 'Cache-Control': 'no-store' });
  }

  // ── Moderation ──
  if (pfad.startsWith('/api/admin/')) {
    await pruefeModeration(request, env, db);

    if (pfad === '/api/admin/meldungen' && methode === 'GET') {
      const { results } = await db
        .prepare(
          `SELECT m.becher_id AS id, COUNT(*) AS anzahl, MAX(m.erstellt_am) AS zuletzt, GROUP_CONCAT(m.grund) AS gruende,
                  b.stand, b.markt, b.name, b.notiz, b.versteckt, b.geraet_id
             FROM meldungen m LEFT JOIN becher b ON b.id = m.becher_id
            WHERE m.bearbeitet = 0
            GROUP BY m.becher_id
            ORDER BY anzahl DESC, zuletzt DESC
            LIMIT 100`,
        )
        .all();
      return json({ meldungen: results }, 200);
    }

    if (pfad === '/api/admin/feedback' && methode === 'GET') {
      const { results } = await db.prepare('SELECT id, text, seite, erstellt_am FROM rueckmeldungen WHERE bearbeitet = 0 ORDER BY erstellt_am DESC LIMIT 100').all();
      return json({ rueckmeldungen: results }, 200);
    }

    const b = await lesen(request);

    if (pfad === '/api/admin/meldung-verwerfen' && methode === 'POST') {
      if (typeof b.id !== 'string') throw new HttpFehler(400, 'id nötig.');
      const r = await db.prepare('UPDATE meldungen SET bearbeitet = 1 WHERE becher_id = ?').bind(b.id).run();
      return json({ ok: true, betroffen: r.meta.changes }, 200);
    }

    if (pfad === '/api/admin/verstecken' && methode === 'POST') {
      if (typeof b.id !== 'string' || typeof b.versteckt !== 'boolean') throw new HttpFehler(400, 'id und versteckt nötig.');
      const r = await db
        .prepare(`UPDATE becher SET versteckt = ?, seq = ${NAECHSTE_SEQ} WHERE id = ?`)
        .bind(b.versteckt ? 1 : 0, b.id)
        .run();
      if (r.meta.changes === 0) throw new HttpFehler(404, 'Becher nicht gefunden.');
      if (b.versteckt) await db.prepare('UPDATE meldungen SET bearbeitet = 1 WHERE becher_id = ?').bind(b.id).run();
      return json({ ok: true }, 200);
    }

    // Foto ausblenden (oder wieder einblenden), ohne die Bewertung anzutasten.
    if (pfad === '/api/admin/foto-verstecken' && methode === 'POST') {
      if (typeof b.id !== 'string' || typeof b.versteckt !== 'boolean') throw new HttpFehler(400, 'id und versteckt nötig.');
      const r = await db.prepare('UPDATE fotos SET versteckt = ? WHERE becher_id = ?').bind(b.versteckt ? 1 : 0, b.id).run();
      if (r.meta.changes === 0) throw new HttpFehler(404, 'Foto nicht gefunden.');
      await db.prepare(`UPDATE becher SET seq = ${NAECHSTE_SEQ} WHERE id = ?`).bind(b.id).run();
      return json({ ok: true }, 200);
    }

    // Stand umbenennen oder zusammenführen: gibt allen genannten Bewertungen denselben Stand, Markt und dieselbe Stadt.
    if (pfad === '/api/admin/stand-aendern' && methode === 'POST') {
      if (!Array.isArray(b.ids) || b.ids.length === 0 || b.ids.length > MAX_STAND_IDS || !b.ids.every((x) => typeof x === 'string')) {
        throw new HttpFehler(400, `Bitte 1 bis ${MAX_STAND_IDS} Bewertungen nennen.`);
      }
      const stand = pruefeText(b.stand, 'Stand', GRENZEN.stand, true);
      if (!stand.ok) throw new HttpFehler(422, stand.grund);
      const markt = pruefeText(b.markt, 'Markt', GRENZEN.markt, true);
      if (!markt.ok) throw new HttpFehler(422, markt.grund);
      const stadt = pruefeText(b.stadt, 'Stadt', GRENZEN.stadt, false);
      if (!stadt.ok) throw new HttpFehler(422, stadt.grund);
      let betroffen = 0;
      for (const id of b.ids as string[]) {
        const r = await db
          .prepare(`UPDATE becher SET stand = ?, markt = ?, stadt = ?, seq = ${NAECHSTE_SEQ} WHERE id = ? AND versteckt = 0`)
          .bind(stand.wert, markt.wert, stadt.wert ?? null, id)
          .run();
        betroffen += r.meta.changes;
      }
      return json({ ok: true, betroffen }, 200);
    }

    // Bewertungen endgültig entfernen (Testeinträge, Unfug): Inhalt und Name werden gelöscht, ein Platzhalter bleibt,
    // damit andere Geräte die Bewertung verlieren. Anders als „verstecken" ist das nicht umkehrbar.
    if (pfad === '/api/admin/entfernen' && methode === 'POST') {
      if (!Array.isArray(b.ids) || b.ids.length === 0 || b.ids.length > MAX_STAND_IDS || !b.ids.every((x) => typeof x === 'string')) {
        throw new HttpFehler(400, `Bitte 1 bis ${MAX_STAND_IDS} Bewertungen nennen.`);
      }
      let betroffen = 0;
      for (const id of b.ids as string[]) {
        const r = await db
          .prepare(
            `UPDATE becher SET versteckt = 1, name = NULL, notiz = NULL, stadt = NULL, stand = '-', markt = '-', besuch_id = NULL,
               geschmack = NULL, geruch = NULL, temperatur = NULL, personal = NULL, atmosphaere = NULL,
               preis_leistung = NULL, becher = NULL, preis = NULL, menge = NULL, seq = ${NAECHSTE_SEQ} WHERE id = ?`,
          )
          .bind(id)
          .run();
        betroffen += r.meta.changes;
        await db.prepare('DELETE FROM meldungen WHERE becher_id = ?').bind(id).run();
        await db.prepare('DELETE FROM fotos WHERE becher_id = ?').bind(id).run();
      }
      return json({ ok: true, betroffen }, 200);
    }

    // Zugang entziehen (Handy verloren): alle Geräte verlieren die Prüfstellen-Rechte, außer dem genannten. Danach den Code ändern.
    if (pfad === '/api/admin/pruefstelle-zuruecksetzen' && methode === 'POST') {
      const behalten = typeof b.behalten === 'string' ? b.behalten : '';
      const r = await db
        .prepare("UPDATE geraete SET pruefstelle = 0 WHERE pruefstelle = 1 AND id != 'bestand-pruefstelle' AND id != ?")
        .bind(behalten)
        .run();
      return json({ ok: true, betroffen: r.meta.changes }, 200);
    }

    if (pfad === '/api/admin/sperren' && methode === 'POST') {
      if (typeof b.geraet !== 'string' || typeof b.gesperrt !== 'boolean') throw new HttpFehler(400, 'geraet und gesperrt nötig.');
      const r = await db.prepare('UPDATE geraete SET gesperrt = ? WHERE id = ?').bind(b.gesperrt ? 1 : 0, b.geraet).run();
      if (r.meta.changes === 0) throw new HttpFehler(404, 'Gerät nicht gefunden.');
      // Alle Becher des Geräts ein- oder ausblenden, einzeln, damit jeder eine neue Sync-Nummer bekommt.
      const { results } = await db.prepare('SELECT id FROM becher WHERE geraet_id = ?').bind(b.geraet).all<{ id: string }>();
      for (const z of results) {
        await db
          .prepare(`UPDATE becher SET versteckt = ?, seq = ${NAECHSTE_SEQ} WHERE id = ?`)
          .bind(b.gesperrt ? 1 : 0, z.id)
          .run();
      }
      return json({ ok: true, betroffen: results.length }, 200);
    }

    // Löschen auf Anfrage (Art. 17 DSGVO). 'name': entfernt nur den Namen von allen Bechern des Geräts.
    // 'alles': macht alle Becher des Geräts unkenntlich und sperrt das Gerät. Platzhalter bleiben, damit
    // andere Geräte die Becher entfernen.
    if (pfad === '/api/admin/loeschen' && methode === 'POST') {
      if (typeof b.geraet !== 'string' || (b.modus !== 'name' && b.modus !== 'alles')) {
        throw new HttpFehler(400, 'geraet und modus (name oder alles) nötig.');
      }
      const g = await db.prepare('SELECT id FROM geraete WHERE id = ?').bind(b.geraet).first();
      if (!g) throw new HttpFehler(404, 'Gerät nicht gefunden.');
      const { results } = await db.prepare('SELECT id FROM becher WHERE geraet_id = ?').bind(b.geraet).all<{ id: string }>();
      for (const z of results) {
        await db
          .prepare(
            b.modus === 'name'
              ? `UPDATE becher SET name = NULL, seq = ${NAECHSTE_SEQ} WHERE id = ?`
              : `UPDATE becher SET versteckt = 1, name = NULL, notiz = NULL, stadt = NULL, stand = '-', markt = '-', besuch_id = NULL,
                   geschmack = NULL, geruch = NULL, temperatur = NULL, personal = NULL, atmosphaere = NULL,
                   preis_leistung = NULL, becher = NULL, preis = NULL, menge = NULL, seq = ${NAECHSTE_SEQ} WHERE id = ?`,
          )
          .bind(z.id)
          .run();
      }
      if (b.modus === 'alles') await db.prepare('DELETE FROM fotos WHERE geraet_id = ?').bind(b.geraet).run();
      if (b.modus === 'name') await db.prepare('UPDATE geraete SET name = NULL WHERE id = ?').bind(b.geraet).run();
      else await db.prepare("UPDATE geraete SET name = NULL, gesperrt = 1, schluessel_hash = '-' WHERE id = ?").bind(b.geraet).run();
      // Meldungen, die dieses Gerät abgegeben hat, und Meldungen über seine Becher sind damit erledigt.
      await db
        .prepare('DELETE FROM meldungen WHERE geraet_id = ? OR becher_id IN (SELECT id FROM becher WHERE geraet_id = ?)')
        .bind(b.geraet, b.geraet)
        .run();
      return json({ ok: true, betroffen: results.length }, 200);
    }

    if (pfad === '/api/admin/import' && methode === 'POST') {
      if (!Array.isArray(b.eintraege) || b.eintraege.length === 0 || b.eintraege.length > LIMITS.maxImport) {
        throw new HttpFehler(400, `Bitte 1 bis ${LIMITS.maxImport} Einträge senden.`);
      }
      await db
        .prepare(
          `INSERT OR IGNORE INTO geraete (id, schluessel_hash, name, pruefstelle, erstellt_am)
           VALUES ('bestand-pruefstelle', '-', 'Prüfstelle', 1, ?)`,
        )
        .bind(jetzt)
        .run();
      let neu = 0;
      let aktualisiert = 0;
      const abgelehnt: { id: unknown; grund: string }[] = [];
      for (const roh of b.eintraege) {
        // Bestandsdaten dürfen älter sein als das Einreichfenster der App.
        const p = pruefeEinreichung(
          { ...(roh as object), erstelltAm: Math.min(Math.max((roh as { erstelltAm?: number }).erstelltAm ?? jetzt, jetzt - 100 * TAG), jetzt) },
          jetzt,
        );
        if (!p.ok) {
          abgelehnt.push({ id: (roh as { id?: unknown })?.id, grund: p.grund });
          continue;
        }
        const e = { ...p.eintrag, erstelltAm: (roh as { erstelltAm: number }).erstelltAm ?? p.eintrag.erstelltAm };
        const r = await db.prepare('SELECT * FROM becher WHERE id = ?').bind(e.id).first<BecherZeile>();
        if (r) {
          // Bestandsdaten lassen sich über die CSV korrigieren (Stand umbenannt, Stadt ergänzt): gleiche ID, anderer Inhalt.
          // Die Sync-Nummer steigt, damit alle Geräte die Korrektur holen. Gleicher Inhalt: nichts passiert.
          if (r.geraet_id === 'bestand-pruefstelle' && bestandGeaendert(r, e)) {
            await db
              .prepare(
                `UPDATE becher SET stand = ?, markt = ?, stadt = ?, saison = ?, datum = ?, sorte = ?, becher_nr = ?, preis = ?, notiz = ?,
                   geschmack = ?, geruch = ?, temperatur = ?, personal = ?, atmosphaere = ?, preis_leistung = ?, becher = ?,
                   seq = ${NAECHSTE_SEQ} WHERE id = ?`,
              )
              .bind(
                e.stand, e.markt, e.stadt ?? null, e.saison, e.datum ?? null, e.sorte ?? null, e.becherNr ?? null, e.preis ?? null, e.notiz ?? null,
                e.noten.geschmack, e.noten.geruch, e.noten.temperatur, e.noten.personal, e.noten.atmosphaere, e.noten.preisLeistung, e.noten.becher,
                e.id,
              )
              .run();
            aktualisiert++;
          }
          continue;
        }
        await einfuegen(db, e, 'bestand-pruefstelle', 'Prüfstelle', true, jetzt).run();
        neu++;
      }
      return json({ neu, aktualisiert, abgelehnt }, 200);
    }
  }

  throw new HttpFehler(404, 'Nicht gefunden.');
}
