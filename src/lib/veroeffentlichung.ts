// Wie ein Eintrag zum Server geht und wie ein Eintrag vom Server geprüft wird. Reine Funktionen.

import { KRITERIEN, SORTEN, type Eintrag } from './modell';
import { istGueltigeNote } from './scoring';

/** Nur die Felder, die der Server annimmt. Name, Kennung und Siegel setzt der Server selbst. */
export function eintragFuerServer(e: Eintrag): Record<string, unknown> {
  const s: Record<string, unknown> = {
    id: e.id,
    stand: e.stand,
    markt: e.markt,
    saison: e.saison,
  };
  if (e.stadt) s.stadt = e.stadt;
  if (e.datum) s.datum = e.datum;
  if (e.sorte) s.sorte = e.sorte;
  if (e.becherNr !== undefined) s.becherNr = e.becherNr;
  if (e.preis !== undefined) s.preis = e.preis;
  if (e.menge !== undefined) s.menge = e.menge;
  if (e.notiz) s.notiz = e.notiz;
  if (e.tags && e.tags.length > 0) s.tags = e.tags;
  if (e.besuchId) s.besuchId = e.besuchId;
  s.noten = Object.fromEntries(KRITERIEN.map((k) => [k, e.noten[k]]));
  s.erstelltAm = e.erstelltAm;
  return s;
}

/** Prüft einen vom Server kommenden Eintrag, bevor er lokal gespeichert wird. */
export function istEintrag(x: unknown): x is Eintrag {
  if (!x || typeof x !== 'object') return false;
  const e = x as Record<string, unknown>;
  if (typeof e.id !== 'string' || typeof e.stand !== 'string' || !e.stand) return false;
  if (typeof e.markt !== 'string' || !Number.isInteger(e.saison)) return false;
  if (typeof e.erstelltAm !== 'number') return false;
  for (const feld of ['stadt', 'name', 'geraet', 'besuchId', 'notiz', 'datum']) {
    if (e[feld] !== undefined && typeof e[feld] !== 'string') return false;
  }
  if (e.pruefstelle !== undefined && typeof e.pruefstelle !== 'boolean') return false;
  if (e.tags !== undefined && !(Array.isArray(e.tags) && e.tags.every((x) => typeof x === 'string'))) return false;
  if (e.sorte !== undefined && !(SORTEN as readonly string[]).includes(e.sorte as string)) return false;
  const noten = e.noten as Record<string, unknown> | undefined;
  if (!noten || typeof noten !== 'object') return false;
  return KRITERIEN.every((k) => istGueltigeNote(noten[k] ?? null));
}
