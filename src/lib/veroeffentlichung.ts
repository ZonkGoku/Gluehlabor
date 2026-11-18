// Wie ein Eintrag als Datei im Repo aussieht. Reine Funktionen.

import { KRITERIEN, SORTEN, type Eintrag } from './modell';
import { istGueltigeNote } from './scoring';

/** Nur die Felder des Datenmodells, feste Reihenfolge, keine lokalen Zusatzfelder. */
export function eintragAlsJson(e: Eintrag): string {
  const sauber: Record<string, unknown> = {
    id: e.id,
    stand: e.stand,
    markt: e.markt,
    saison: e.saison,
  };
  if (e.stadt) sauber.stadt = e.stadt;
  if (e.datum) sauber.datum = e.datum;
  if (e.sorte) sauber.sorte = e.sorte;
  if (e.becherNr !== undefined) sauber.becherNr = e.becherNr;
  if (e.preis !== undefined) sauber.preis = e.preis;
  if (e.notiz) sauber.notiz = e.notiz;
  if (e.foto) sauber.foto = e.foto;
  sauber.noten = Object.fromEntries(KRITERIEN.map((k) => [k, e.noten[k]]));
  sauber.erstelltAm = e.erstelltAm;
  return JSON.stringify(sauber, null, 2) + '\n';
}

/** Prüft einen von außen kommenden Eintrag (z. B. aus dem Datenbestand). */
export function istEintrag(x: unknown): x is Eintrag {
  if (!x || typeof x !== 'object') return false;
  const e = x as Record<string, unknown>;
  if (typeof e.id !== 'string' || typeof e.stand !== 'string' || !e.stand) return false;
  if (typeof e.markt !== 'string' || !Number.isInteger(e.saison)) return false;
  if (typeof e.erstelltAm !== 'number') return false;
  if (e.stadt !== undefined && typeof e.stadt !== 'string') return false;
  if (e.sorte !== undefined && !(SORTEN as readonly string[]).includes(e.sorte as string)) return false;
  const noten = e.noten as Record<string, unknown> | undefined;
  if (!noten || typeof noten !== 'object') return false;
  return KRITERIEN.every((k) => istGueltigeNote(noten[k] ?? null));
}
