// Günstig oder teuer auf einen Blick: der Preis eines Stands gegen den mittleren Preis der gezeigten Stände. Rein ein Vergleich, keine Bewertung.
import type { Stand } from './staende';

export type PreisKlasse = 'guenstig' | 'normal' | 'teuer';

/** Mittlerer Preis (Median der Stand-Preise, je 0,2 l); null, wenn weniger als drei Stände einen Preis haben. */
export function referenzMedian(preise: readonly number[]): number | null {
  if (preise.length < 3) return null;
  const s = [...preise].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}

/** Ab 50 Cent unter dem Mittel „günstig", ab 50 Cent darüber „teuer". */
export function preisKlasse(preis: number | null, referenz: number | null): PreisKlasse | null {
  if (preis === null || referenz === null) return null;
  if (preis <= referenz - 0.5) return 'guenstig';
  if (preis >= referenz + 0.5) return 'teuer';
  return 'normal';
}

/** Mittelpreis der Stände (für `preisKlasse`). */
export const referenzVon = (staende: readonly Stand[]): number | null => referenzMedian(staende.map((s) => s.preis.median).filter((x): x is number => x !== null));

/** Günstigste zuerst; Stände ohne Preis fallen weg. Gleicher Preis: bessere Note zuerst. */
export function guenstigste(staende: readonly Stand[]): Stand[] {
  return staende
    .filter((s) => s.preis.median !== null)
    .sort((a, b) => (a.preis.median as number) - (b.preis.median as number) || (b.wert.gesamt ?? 0) - (a.wert.gesamt ?? 0) || a.stand.localeCompare(b.stand, 'de'));
}
