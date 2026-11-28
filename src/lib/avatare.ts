// Vorgefertigte Figuren („Gesichter") für den Schlitten im Schlittenfahren. Zeichnungen statt Fotos: Alle im Rennen sehen sie, es gibt nichts
// Persönliches hochzuladen. Feld von 20 × 20 Einheiten, das Gesicht füllt den Kreis. Feste Farben (unabhängig von der Schlittenfarbe).
// Der Server prüft denselben Wert (AVATARE): -1 = keine Figur, sonst 0 bis AVATAR_ANZAHL - 1.
import type { Teil } from './fahrzeuge';

export const AVATAR_ANZAHL = 10;

const dunkel = '#1a1020';
const augen = (a: number, b: number, y: number, r = 1.1): Teil[] => [
  { kreis: [a, y, r], farbe: dunkel },
  { kreis: [b, y, r], farbe: dunkel },
];

export interface Avatar {
  name: string;
  teile: Teil[];
}

export const AVATARE: readonly Avatar[] = [
  {
    name: 'Bär',
    teile: [
      { kreis: [3.8, 3.8, 3], farbe: '#6e4420' },
      { kreis: [16.2, 3.8, 3], farbe: '#6e4420' },
      { kreis: [10, 10.5, 8.6], farbe: '#8b5a2b' },
      { ellipse: [10, 13.2, 4.2, 3.2], farbe: '#e0bd96' },
      { ellipse: [10, 12, 1.5, 1], farbe: dunkel },
      ...augen(7, 13, 8.6),
    ],
  },
  {
    name: 'Fuchs',
    teile: [
      { d: 'M1.5 9L2.5 0.8 9 5z', farbe: '#e0701a' },
      { d: 'M18.5 9L17.5 0.8 11 5z', farbe: '#e0701a' },
      { kreis: [10, 10.5, 8.4], farbe: '#f08a2e' },
      { ellipse: [6.2, 14, 4.6, 3.6], farbe: '#ffffff' },
      { ellipse: [13.8, 14, 4.6, 3.6], farbe: '#ffffff' },
      { kreis: [10, 15.3, 1.3], farbe: dunkel },
      ...augen(7, 13, 9.4),
    ],
  },
  {
    name: 'Pinguin',
    teile: [
      { kreis: [10, 10, 9], farbe: '#222a3d' },
      { ellipse: [10, 11.6, 6.2, 6.4], farbe: '#ffffff' },
      ...augen(7.6, 12.4, 9),
      { d: 'M8.1 12.4h3.8L10 15.2z', farbe: '#ff9f1c' },
    ],
  },
  {
    name: 'Schneemann',
    teile: [
      { d: 'M5 5.2h10v2.2H5z', farbe: '#222222' },
      { d: 'M7 0.8h6v4.6H7z', farbe: '#222222' },
      { kreis: [10, 11.6, 7.6], farbe: '#f3f8ff' },
      { d: 'M10 11.4l7.6 1.6-7.6 1.1z', farbe: '#ff7a1a' },
      { kreis: [7.2, 9.4, 1], farbe: '#222222' },
      { kreis: [12.8, 9.4, 1], farbe: '#222222' },
    ],
  },
  {
    name: 'Eule',
    teile: [
      { d: 'M2.5 6L3.4 0.8 8.4 4z', farbe: '#7d5530' },
      { d: 'M17.5 6L16.6 0.8 11.6 4z', farbe: '#7d5530' },
      { kreis: [10, 10.6, 8.6], farbe: '#9b6b3e' },
      { kreis: [6.8, 9, 3.3], farbe: '#fff6d6' },
      { kreis: [13.2, 9, 3.3], farbe: '#fff6d6' },
      { kreis: [6.8, 9, 1.5], farbe: dunkel },
      { kreis: [13.2, 9, 1.5], farbe: dunkel },
      { d: 'M9 11.8h2L10 14.4z', farbe: '#ff9f1c' },
    ],
  },
  {
    name: 'Hase',
    teile: [
      { ellipse: [6.6, 4.6, 2.3, 5], farbe: '#e9e3ec' },
      { ellipse: [13.4, 4.6, 2.3, 5], farbe: '#e9e3ec' },
      { ellipse: [6.6, 4.8, 1, 3.4], farbe: '#f4a6c0' },
      { ellipse: [13.4, 4.8, 1, 3.4], farbe: '#f4a6c0' },
      { kreis: [10, 12.4, 7.4], farbe: '#f3eef6' },
      ...augen(7.4, 12.6, 11.6, 1),
      { kreis: [10, 14, 1], farbe: '#f08aa6' },
    ],
  },
  {
    name: 'Katze',
    teile: [
      { d: 'M2.4 8.4L3 1.6 8.2 5z', farbe: '#5d6371' },
      { d: 'M17.6 8.4L17 1.6 11.8 5z', farbe: '#5d6371' },
      { kreis: [10, 11, 8.2], farbe: '#6d7380' },
      { kreis: [7.2, 10, 1.4], farbe: '#ffe27a' },
      { kreis: [12.8, 10, 1.4], farbe: '#ffe27a' },
      { ellipse: [7.2, 10, 0.5, 1.2], farbe: dunkel },
      { ellipse: [12.8, 10, 0.5, 1.2], farbe: dunkel },
      { d: 'M9 12.6h2L10 13.9z', farbe: '#f08aa6' },
      { d: 'M1.6 12.6h4.2M14.2 12.6h4.2', nurStrich: true, strich: 0.6, farbe: '#e7e9ee' },
    ],
  },
  {
    name: 'Roboter',
    teile: [
      { d: 'M10 1v3.6', nurStrich: true, strich: 1, farbe: '#aab6c6' },
      { kreis: [10, 1, 1.2], farbe: '#ff4d6d' },
      { d: 'M5 4.4h10a2 2 0 0 1 2 2v9.2a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6.4a2 2 0 0 1 2-2z', farbe: '#8fa3b8' },
      { kreis: [7, 9.6, 1.9], farbe: '#5ef0ff' },
      { kreis: [13, 9.6, 1.9], farbe: '#5ef0ff' },
      { d: 'M7 14.2h6', nurStrich: true, strich: 1, farbe: '#243447' },
    ],
  },
  {
    name: 'Außerirdischer',
    teile: [
      { d: 'M6.2 3.4L4.4 0.8M13.8 3.4l1.8-2.6', nurStrich: true, strich: 1, farbe: '#6ccf5a' },
      { ellipse: [10, 10.8, 8.4, 9], farbe: '#7ddc6a' },
      { ellipse: [6.8, 10.4, 2.2, 3.1], farbe: dunkel },
      { ellipse: [13.2, 10.4, 2.2, 3.1], farbe: dunkel },
      { d: 'M8.4 16q1.6 1.1 3.2 0', nurStrich: true, strich: 0.8, farbe: dunkel },
    ],
  },
  {
    name: 'Mütze',
    teile: [
      { kreis: [10, 12.2, 7], farbe: '#f3c9a0' },
      { d: 'M3 10.4C3 4.4 7 1.4 10 1.4s7 3 7 9z', farbe: '#e63950' },
      { ellipse: [10, 10.2, 7.6, 2.1], farbe: '#ffffff' },
      { kreis: [10, 1.4, 1.8], farbe: '#ffffff' },
      ...augen(7.5, 12.5, 13.2, 0.9),
      { d: 'M8 15.8q2 1.6 4 0', nurStrich: true, strich: 0.8, farbe: dunkel },
    ],
  },
];

export const avatarName = (nr: number): string => AVATARE[nr]?.name ?? '';
