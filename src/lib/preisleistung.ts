// Preis-Leistung wird nicht mehr von Hand bewertet, sondern aus dem Preis und den Glühwein-Noten (Geschmack, Geruch,
// Temperatur) berechnet. Reine Funktionen.
//
//   Preis-Leistung = Glühwein-Note − 0,5 je Euro, den die Tasse über dem Referenzpreis kostet (darunter: plus), auf 1 bis 10 begrenzt.
//
// Der Referenzpreis ist der Median der Stadt (nur Glühwein mit Alkohol, auf 0,2 l umgerechnet), mit dem Startwert 5,00 €
// verrechnet, damit wenige Meldungen nicht durchschlagen (wie bei der Rangliste). Der Startwert stammt aus der Schätzung des
// Bundesverbands Deutscher Weinkellereien für 2025 (etwa 5 € je Tasse); die Meldungen der Bewertenden lösen ihn ab.

import type { Eintrag, Gewichte, Noten, Sorte } from './modell';
import { stadtVon, type MarktListe } from './orte';
import { bewerte } from './scoring';

export const START_REFERENZ = 5;
/** So viele Meldungen wiegt der Startwert gegen den Median der Stadt. */
export const REFERENZ_GEWICHT = 5;
export const PUNKTE_JE_EURO = 0.5;
/** Preise werden auf diese Menge umgerechnet. */
export const BASIS_MENGE = 0.2;
export const MENGEN = [0.2, 0.25, 0.3] as const;
/** Plausible Preise für eine Tasse in der App. */
export const PREIS_MIN = 2;
export const PREIS_MAX = 12;
/** Ab dieser Preis-Leistung heißt ein Stand „Top Deal". */
export const TOP_DEAL = 8;

const cent = (x: number) => Math.round(x * 100) / 100;

/** Nur Glühwein mit Alkohol lässt sich preislich vergleichen. */
export function vergleichbar(sorte?: Sorte | null): boolean {
  return sorte !== 'alkoholfrei' && sorte !== 'feuerzangen';
}

/** Preis auf 0,2 l umgerechnet. Ohne Mengenangabe gilt 0,2 l. */
export function preisJeBasis(preis: number, menge?: number | null): number {
  return cent((preis * BASIS_MENGE) / (menge && menge > 0 ? menge : BASIS_MENGE));
}

export function medianVon(zahlen: readonly number[]): number | null {
  if (zahlen.length === 0) return null;
  const s = [...zahlen].sort((a, b) => a - b);
  const m = s.length >> 1;
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}

/** Brauchbare, vergleichbare Preise der Einträge, auf 0,2 l umgerechnet. */
export function vergleichspreise(eintraege: readonly Pick<Eintrag, 'preis' | 'menge' | 'sorte'>[]): number[] {
  return eintraege
    .filter((e) => typeof e.preis === 'number' && e.preis >= 1 && e.preis <= 15 && vergleichbar(e.sorte))
    .map((e) => preisJeBasis(e.preis!, e.menge));
}

/** Referenzpreis einer Stadt: Median ihrer Meldungen, mit dem Startwert verrechnet. Ohne Stadt oder Meldungen der Startwert. */
export function referenzPreis(eintraege: readonly Eintrag[], stadt: string | null | undefined, liste: MarktListe): number {
  if (!stadt) return START_REFERENZ;
  const preise = vergleichspreise(eintraege.filter((e) => stadtVon(liste, e) === stadt));
  const median = medianVon(preise);
  if (median === null) return START_REFERENZ;
  const n = preise.length;
  return cent((n * median + REFERENZ_GEWICHT * START_REFERENZ) / (n + REFERENZ_GEWICHT));
}

/**
 * Preis-Leistung als Note 1 bis 10 (ganzzahlig, wie alle Noten). null, wenn sie sich nicht berechnen lässt:
 * kein Preis, keine Glühwein-Note, oder eine Sorte, die man nicht vergleichen kann.
 */
export function berechnePreisLeistung(
  noten: Noten,
  gewichte: Gewichte,
  preis: number | undefined | null,
  menge: number | undefined | null,
  referenz: number,
  sorte?: Sorte | null,
): number | null {
  if (typeof preis !== 'number' || !(preis > 0) || !vergleichbar(sorte)) return null;
  const q = bewerte({ ...noten, preisLeistung: null }, gewichte).gluehwein;
  if (q === null) return null;
  const roh = q - PUNKTE_JE_EURO * (preisJeBasis(preis, menge) - referenz);
  return Math.min(10, Math.max(1, Math.round(roh + 1e-9)));
}
