// Die Fahrzeuge für das Schlittenfahren (Auswahl wie bei Mario Kart). Eine Beschreibung für die Zeichnung auf dem Bildschirm (SVG) und für das Teilen-Bild (Canvas).
// Koordinaten in einem Feld von 46 × 34 Einheiten, das Fahrzeug fährt nach rechts.

export interface Teil {
  /** SVG-Pfad */
  d?: string;
  kreis?: [number, number, number];
  ellipse?: [number, number, number, number];
  /** Strichbreite; ohne Angabe wird nur gefüllt */
  strich?: number;
  /** Fläche füllen (Standard: ja, außer bei reinen Strichen mit `nurStrich`) */
  nurStrich?: boolean;
  /** Feste Farbe statt der Fahrzeugfarbe */
  farbe?: string;
  /** Füllfarbe, wenn Strich und Fläche verschieden sind */
  fuellung?: string;
}

export interface Fahrzeug {
  name: string;
  teile: Teil[];
}

/** Anzahl der Fahrzeuge; der Server prüft denselben Wert (FAHRZEUGE). */
export const FAHRZEUG_ANZAHL = 4;

export const FAHRZEUGE: readonly Fahrzeug[] = [
  {
    name: 'Schlitten',
    teile: [
      { d: 'M4 28h30c4 0 6-3 5-7', strich: 2.6, nurStrich: true },
      { d: 'M11 28v-6M27 28v-6', strich: 2.2, nurStrich: true },
      { d: 'M6 12c5-1 7 1 8 3h20l-3 8H9c0-5-1-8-3-11z', strich: 1 },
      { d: 'M12 15c1-5 5-6 9-5', strich: 2, nurStrich: true },
      { kreis: [30, 11, 3] },
    ],
  },
  {
    name: 'Rennwagen',
    teile: [
      { d: 'M3 23c0-4 3-6 8-7l6-5h10l5 5c4 .6 7 2 7 5v3H3z', strich: 1 },
      { d: 'M17 16l4-3.5h6.5l3.5 3.5z', farbe: 'rgba(10,16,40,.78)' },
      { d: 'M3 18l-1.5-6H7', strich: 2, nurStrich: true },
      { kreis: [11, 26, 4.6], farbe: '#10162b' },
      { kreis: [11, 26, 2], farbe: '#e8e8e8' },
      { kreis: [35, 26, 4.6], farbe: '#10162b' },
      { kreis: [35, 26, 2], farbe: '#e8e8e8' },
    ],
  },
  {
    name: 'Rentier',
    teile: [
      { ellipse: [19, 18, 11, 6] },
      { d: 'M28 15l5-7', strich: 3.2, nurStrich: true },
      { ellipse: [36, 7.5, 3.4, 2.4] },
      { kreis: [39.2, 8.6, 1.5], farbe: '#f0344f' },
      { d: 'M34 5l-2-4M34 5l3-3M33 3l-3-1', strich: 1.5, nurStrich: true },
      { d: 'M10 22v9M15 22v9M24 22v9M28 22v9', strich: 2.3, nurStrich: true },
      { d: 'M8 16l-3 2', strich: 2, nurStrich: true },
    ],
  },
  {
    name: 'Tasse',
    teile: [
      { d: 'M8 10h20v13a5 5 0 0 1-5 5H13a5 5 0 0 1-5-5z', strich: 1 },
      { d: 'M28 13h3a4 4 0 0 1 0 8h-3', strich: 2.4, nurStrich: true },
      { d: 'M13 7c-2-2 2-3 0-6M19 7c-2-2 2-3 0-6M25 7c-2-2 2-3 0-6', strich: 1.6, nurStrich: true },
      { d: 'M4 31h30c3 0 4-2 4-3', strich: 2.4, nurStrich: true },
    ],
  },
];

export const fahrzeugName = (i: number): string => FAHRZEUGE[i % FAHRZEUG_ANZAHL]?.name ?? FAHRZEUGE[0].name;
