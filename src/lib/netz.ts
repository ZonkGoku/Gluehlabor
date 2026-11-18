// Geometrie für das Netzdiagramm (Radar): Achsen gleichmäßig im Kreis, erste Achse oben, im Uhrzeigersinn. Reine Funktionen.

export interface Punkt {
  x: number;
  y: number;
}

/** Winkel der Achse i von n in Bogenmaß (0 = rechts, erste Achse zeigt nach oben). */
export function achsenWinkel(i: number, n: number): number {
  return -Math.PI / 2 + (2 * Math.PI * i) / n;
}

/** Punkt auf Achse i bei Wert 0..max; Wert 0 liegt in der Mitte. */
export function netzPunkt(i: number, n: number, wert: number, radius: number, mitte: Punkt, max = 10): Punkt {
  const w = achsenWinkel(i, n);
  const r = (Math.min(max, Math.max(0, wert)) / max) * radius;
  return { x: mitte.x + r * Math.cos(w), y: mitte.y + r * Math.sin(w) };
}

/**
 * Punkte einer Reihe. Fehlende Werte (null) haben keinen Punkt und werden übersprungen; die Linie verbindet die vorhandenen.
 * Ein fehlender Wert ist nie 0.
 */
export function reihenPunkte(werte: readonly (number | null)[], radius: number, mitte: Punkt, max = 10): (Punkt & { index: number })[] {
  const n = werte.length;
  return werte.flatMap((w, i) => (w === null ? [] : [{ ...netzPunkt(i, n, w, radius, mitte, max), index: i }]));
}

/** Polygon als SVG-Punktliste. */
export const alsPunktliste = (p: readonly Punkt[]): string => p.map((q) => `${q.x.toFixed(1)},${q.y.toFixed(1)}`).join(' ');
