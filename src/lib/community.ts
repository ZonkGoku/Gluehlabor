// Regeln für Bewertungen von Fremden. Server und App prüfen mit demselben Code.
// Reine Funktionen.

import { KRITERIEN, SORTEN, type Eintrag, type Noten } from './modell';
import { istGueltigeNote } from './scoring';

export const GRENZEN = { stand: 80, markt: 80, stadt: 60, notiz: 500, name: 24, nameMin: 2 } as const;

/** Diese Namen kann nur die Prüfstelle führen. Das Siegel „Prüfstelle" hängt trotzdem nicht am Namen. */
export const RESERVIERTE_NAMEN = ['david', 'philip', 'prüfstelle', 'pruefstelle', 'admin', 'becherwerk', 'gluehlabor', 'glühlabor', 'moderator'];

// eslint-disable-next-line no-control-regex
const STEUERZEICHEN = /[\u0000-\u001f\u007f-\u009f​-‏‪-‮⁦-⁩]/g;
const LINK = /(https?:|www\.|@|:\/\/)/i;

/** Text säubern: Unicode normalisieren, Steuerzeichen raus, Leerraum glätten. */
export function saeubere(s: string): string {
  return s.normalize('NFC').replace(STEUERZEICHEN, '').replace(/\s+/g, ' ').trim();
}

export type NamePruefung = { ok: true; name: string | null } | { ok: false; grund: string };

/** Anzeigename. Leer (null) heißt „kein Name"; bewerten darf man aber nur mit Namen (2 bis 24 Zeichen), das erzwingt der Server. */
export function pruefeName(roh: unknown, istPruefstelle = false): NamePruefung {
  if (roh === null || roh === undefined) return { ok: true, name: null };
  if (typeof roh !== 'string') return { ok: false, grund: 'Der Name muss Text sein.' };
  const name = saeubere(roh);
  if (name === '') return { ok: true, name: null };
  if ([...name].length < GRENZEN.nameMin) return { ok: false, grund: `Mindestens ${GRENZEN.nameMin} Zeichen.` };
  if ([...name].length > GRENZEN.name) return { ok: false, grund: `Höchstens ${GRENZEN.name} Zeichen.` };
  if (LINK.test(name)) return { ok: false, grund: 'Links und Adressen sind im Namen nicht erlaubt.' };
  if (!/^[\p{L}\p{N}][\p{L}\p{N} .'_-]*$/u.test(name)) {
    return { ok: false, grund: 'Erlaubt sind Buchstaben, Ziffern, Leerzeichen und . \' _ -' };
  }
  if (!istPruefstelle && RESERVIERTE_NAMEN.includes(name.toLowerCase())) {
    return { ok: false, grund: 'Dieser Name ist reserviert.' };
  }
  return { ok: true, name };
}

export type EinreichungPruefung = { ok: true; eintrag: Eintrag } | { ok: false; grund: string };

const TAG = 86_400_000;

function gueltigesDatum(s: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  const t = Date.parse(`${s}T00:00:00Z`);
  return Number.isFinite(t) && new Date(t).toISOString().slice(0, 10) === s;
}

/** Prüft einen Textwert (säubern, Länge, keine Links). Gemeinsam für Einreichungen und Besuchs-Links. */
export function pruefeText(
  wert: unknown,
  feld: string,
  max: number,
  pflicht: boolean,
): { ok: true; wert: string | undefined } | { ok: false; grund: string } {
  if (wert === undefined || wert === null || wert === '') {
    return pflicht ? { ok: false, grund: `${feld} fehlt.` } : { ok: true, wert: undefined };
  }
  if (typeof wert !== 'string') return { ok: false, grund: `${feld} muss Text sein.` };
  const s = saeubere(wert);
  if (s === '') return pflicht ? { ok: false, grund: `${feld} fehlt.` } : { ok: true, wert: undefined };
  if ([...s].length > max) return { ok: false, grund: `${feld} ist zu lang (höchstens ${max} Zeichen).` };
  if (LINK.test(s)) return { ok: false, grund: `${feld}: Links sind nicht erlaubt.` };
  return { ok: true, wert: s };
}

/**
 * Prüft und bereinigt einen eingereichten Becher. Der Server vertraut nichts, was
 * aus der App kommt. Gesetzt werden nur die Felder des Datenmodells; Name,
 * Kennung und Prüfstellen-Siegel setzt der Server selbst.
 */
export function pruefeEinreichung(x: unknown, jetzt: number): EinreichungPruefung {
  if (!x || typeof x !== 'object' || Array.isArray(x)) return { ok: false, grund: 'Kein Eintrag.' };
  const e = x as Record<string, unknown>;

  if (typeof e.id !== 'string' || !/^[A-Za-z0-9_-]{8,64}$/.test(e.id)) return { ok: false, grund: 'Ungültige ID.' };
  const stand = pruefeText(e.stand, 'Stand', GRENZEN.stand, true);
  if (!stand.ok) return stand;
  const markt = pruefeText(e.markt, 'Markt', GRENZEN.markt, true);
  if (!markt.ok) return markt;
  const stadt = pruefeText(e.stadt, 'Stadt', GRENZEN.stadt, false);
  if (!stadt.ok) return stadt;
  const notiz = pruefeText(e.notiz, 'Notiz', GRENZEN.notiz, false);
  if (!notiz.ok) return notiz;

  const jahr = new Date(jetzt).getUTCFullYear();
  if (!Number.isInteger(e.saison) || (e.saison as number) < 2025 || (e.saison as number) > jahr + 1) {
    return { ok: false, grund: 'Ungültige Saison.' };
  }
  if (typeof e.erstelltAm !== 'number' || !Number.isFinite(e.erstelltAm)) return { ok: false, grund: 'Ungültiger Zeitpunkt.' };
  if (e.erstelltAm < jetzt - 120 * TAG || e.erstelltAm > jetzt + TAG) return { ok: false, grund: 'Zeitpunkt außerhalb des erlaubten Bereichs.' };

  if (e.datum !== undefined && e.datum !== null) {
    if (typeof e.datum !== 'string' || !gueltigesDatum(e.datum)) return { ok: false, grund: 'Ungültiges Datum.' };
    if (Date.parse(`${e.datum}T00:00:00Z`) > jetzt + 2 * TAG) return { ok: false, grund: 'Datum liegt in der Zukunft.' };
  }
  if (e.sorte !== undefined && e.sorte !== null && !(SORTEN as readonly string[]).includes(e.sorte as string)) {
    return { ok: false, grund: 'Ungültige Sorte.' };
  }
  if (e.becherNr !== undefined && e.becherNr !== null) {
    if (!Number.isInteger(e.becherNr) || (e.becherNr as number) < 1 || (e.becherNr as number) > 7) return { ok: false, grund: 'Becher-Nr. muss 1 bis 7 sein.' };
  }
  if (e.preis !== undefined && e.preis !== null) {
    if (typeof e.preis !== 'number' || !Number.isFinite(e.preis) || e.preis < 0 || e.preis > 50) return { ok: false, grund: 'Ungültiger Preis.' };
  }
  if (e.menge !== undefined && e.menge !== null) {
    if (typeof e.menge !== 'number' || !Number.isFinite(e.menge) || e.menge < 0.1 || e.menge > 1) return { ok: false, grund: 'Ungültige Menge.' };
  }
  if (e.besuchId !== undefined && e.besuchId !== null) {
    if (typeof e.besuchId !== 'string' || !/^[A-Za-z0-9_-]{4,32}$/.test(e.besuchId)) return { ok: false, grund: 'Ungültige Besuchs-Nr.' };
  }

  const roh = e.noten as Record<string, unknown> | undefined;
  if (!roh || typeof roh !== 'object') return { ok: false, grund: 'Noten fehlen.' };
  const noten = {} as Noten;
  for (const k of KRITERIEN) {
    const n = roh[k] ?? null;
    if (!istGueltigeNote(n)) return { ok: false, grund: `Ungültige Note bei ${k}.` };
    noten[k] = n;
  }
  if (KRITERIEN.every((k) => noten[k] === null)) return { ok: false, grund: 'Mindestens eine Note ist nötig.' };

  const eintrag: Eintrag = {
    id: e.id,
    stand: stand.wert!,
    markt: markt.wert!,
    saison: e.saison as number,
    noten,
    erstelltAm: Math.round(e.erstelltAm),
  };
  if (stadt.wert) eintrag.stadt = stadt.wert;
  if (typeof e.datum === 'string') eintrag.datum = e.datum;
  if (typeof e.sorte === 'string') eintrag.sorte = e.sorte as Eintrag['sorte'];
  if (typeof e.becherNr === 'number') eintrag.becherNr = e.becherNr;
  if (typeof e.preis === 'number') eintrag.preis = Math.round(e.preis * 100) / 100;
  if (typeof e.menge === 'number') eintrag.menge = Math.round(e.menge * 100) / 100;
  if (notiz.wert) eintrag.notiz = notiz.wert;
  if (typeof e.besuchId === 'string') eintrag.besuchId = e.besuchId;
  return { ok: true, eintrag };
}

/** Name, wie er an einer Bewertung steht. */
export function anzeigeName(e: { name?: string }): string {
  return e.name?.trim() || 'Anonym';
}

/** Prüfstellen-Becher: vom Server gesiegelt, oder die lokal importierten Bestandsdaten von 2025. */
export function istPruefstelle(e: { pruefstelle?: boolean; sync?: string }): boolean {
  return e.pruefstelle === true || e.sync === 'bestand';
}

/** Der Stand ohne Groß/Klein, Satzzeichen, Leerraum und Emoji: „Salz-Chrom" = „salz chrom". Identisch in PHP (php/api/lib/regeln.php). */
export function standKern(stand: string): string {
  return saeubere(stand).toLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ').trim();
}

/** Derselbe Stand: gleicher Name (Kern) in derselben Stadt. Der Markt zählt nicht: Wer ihn anders wählt, bewertet trotzdem dieselbe Bude. */
export function standIdent(e: { stand: string; stadt?: string | null }): string {
  return `${standKern(e.stand)}|${saeubere(e.stadt ?? '').toLowerCase()}`;
}

/** Der Abend einer Bewertung: das Datum, sonst der Tag der Erfassung (UTC). */
export function abendVon(e: { datum?: string | null; erstelltAm: number }): string {
  return e.datum || new Date(e.erstelltAm).toISOString().slice(0, 10);
}
