// Schematische Deutschlandkarte: Projektion und Umriss. Reine Funktionen.
//
// Gleichabstandsprojektion mit Breitenkorrektur bei 51° N. Für eine Karte
// dieser Größe reicht das; Umriss und Städte nutzen dieselbe Projektion.

const LON0 = 5.6;
const LAT0 = 55.2;
const KOS = Math.cos((51 * Math.PI) / 180);
export const MASSSTAB = 40;
export const KARTE_BREITE = Math.round((15.3 - LON0) * KOS * MASSSTAB);
export const KARTE_HOEHE = Math.round((LAT0 - 47.1) * MASSSTAB);

export function projiziere(lat: number, lon: number): [number, number] {
  return [(lon - LON0) * KOS * MASSSTAB, (LAT0 - lat) * MASSSTAB];
}

/** Grober Umriss Deutschlands (Breite, Länge), im Uhrzeigersinn ab der dänischen Grenze. */
const UMRISS: [number, number][] = [
  [54.91, 8.65], [54.8, 9.45], [54.47, 9.95], [54.38, 10.2], [54.42, 10.9], [54.05, 10.85], [53.95, 11.15],
  [54.15, 11.6], [54.1, 12.1], [54.42, 12.65], [54.68, 13.4], [54.45, 13.75], [54.15, 13.75], [53.92, 14.22],
  [53.42, 14.38], [52.95, 14.15], [52.6, 14.62], [52.3, 14.6], [51.8, 14.72], [51.4, 14.95], [51.1, 15.02],
  [50.87, 14.82], [50.9, 14.3], [50.75, 13.55], [50.42, 13.0], [50.2, 12.1], [50.1, 12.35], [49.75, 12.5],
  [49.45, 12.75], [49.2, 13.05], [48.95, 13.5], [48.57, 13.82], [48.28, 13.4], [48.25, 13.0], [47.97, 12.85],
  [47.7, 13.05], [47.57, 12.95], [47.7, 12.45], [47.58, 11.65], [47.43, 11.1], [47.4, 10.5], [47.27, 10.2],
  [47.55, 9.75], [47.62, 9.4], [47.68, 8.95], [47.62, 8.55], [47.58, 7.6], [47.95, 7.58], [48.45, 7.75],
  [48.97, 8.2], [49.15, 7.6], [49.12, 7.05], [49.25, 6.6], [49.5, 6.35], [49.8, 6.5], [50.15, 6.15],
  [50.38, 6.4], [50.75, 6.02], [51.05, 6.1], [51.25, 6.2], [51.6, 6.05], [51.85, 6.1], [51.85, 6.8],
  [52.12, 7.05], [52.45, 7.0], [52.7, 7.05], [53.2, 7.2], [53.45, 7.0], [53.68, 7.25], [53.72, 7.9],
  [53.85, 8.6], [53.55, 8.55], [53.95, 8.95], [54.25, 8.85], [54.35, 8.6], [54.55, 8.95], [54.91, 8.65],
];

/** SVG-Pfad des Umrisses in Kartenkoordinaten. */
export function umrissPfad(): string {
  return (
    UMRISS.map(([lat, lon], i) => {
      const [x, y] = projiziere(lat, lon);
      return `${i ? 'L' : 'M'}${x.toFixed(1)} ${y.toFixed(1)}`;
    }).join(' ') + ' Z'
  );
}

export type Koordinaten = Record<string, [number, number] | string>;

/** Koordinaten einer Stadt; ohne Rücksicht auf Groß/Klein. null, wenn unbekannt. */
export function koordinatenVon(liste: Koordinaten, stadt: string): [number, number] | null {
  const k = Object.keys(liste).find((s) => !s.startsWith('_') && s.toLowerCase() === stadt.trim().toLowerCase());
  const v = k ? liste[k] : null;
  return Array.isArray(v) ? v : null;
}

export interface KartenPunkt {
  stadt: string;
  becher: number;
  x: number;
  y: number;
  /** Radius, flächentreu zur Zahl der Becher. */
  r: number;
}

/** Punkte für die Karte und die Städte, die nicht eingezeichnet werden können. */
export function kartenPunkte(
  staedte: readonly { stadt: string | null; becher: number }[],
  liste: Koordinaten,
): { punkte: KartenPunkt[]; ohneOrt: { stadt: string | null; becher: number }[] } {
  const max = Math.max(1, ...staedte.map((s) => s.becher));
  const punkte: KartenPunkt[] = [];
  const ohneOrt: { stadt: string | null; becher: number }[] = [];
  for (const s of staedte) {
    const k = s.stadt ? koordinatenVon(liste, s.stadt) : null;
    if (!k || !s.stadt) {
      ohneOrt.push(s);
      continue;
    }
    const [x, y] = projiziere(k[0], k[1]);
    punkte.push({ stadt: s.stadt, becher: s.becher, x, y, r: 4 + 10 * Math.sqrt(s.becher / max) });
  }
  return { punkte, ohneOrt };
}
