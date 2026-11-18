// Datenmodell. Reine Typen und Konstanten, keine Logik.

export const KRITERIEN = [
  'geschmack',
  'geruch',
  'temperatur',
  'personal',
  'atmosphaere',
  'preisLeistung',
  'becher',
] as const;

export type Kriterium = (typeof KRITERIEN)[number];

/** Ganzzahl 1..10 oder null (nicht bewertet). null ist NIE gleich 0. */
export type Note = number | null;

export type Noten = Record<Kriterium, Note>;
export type Gewichte = Record<Kriterium, number>;

export const GLUEHWEIN_KRITERIEN: readonly Kriterium[] = ['geschmack', 'geruch', 'temperatur'];
export const DRUMHERUM_KRITERIEN: readonly Kriterium[] = [
  'personal',
  'atmosphaere',
  'preisLeistung',
  'becher',
];

export const DEFAULT_GEWICHTE: Readonly<Gewichte> = Object.freeze({
  geschmack: 3,
  geruch: 2,
  temperatur: 2,
  preisLeistung: 2,
  personal: 1,
  atmosphaere: 1,
  becher: 1,
});

export const SORTEN = [
  'rot',
  'weiss',
  'kirsch',
  'winzer',
  'feuerzangen',
  'alkoholfrei',
  'sonstiges',
] as const;
export type Sorte = (typeof SORTEN)[number];

export interface Eintrag {
  id: string;
  stand: string;
  markt: string;
  /** Stadt, falls nicht aus der gepflegten Marktliste ableitbar (bewertet wird in ganz Deutschland). */
  stadt?: string;
  saison: number;
  datum?: string; // ISO yyyy-mm-dd
  sorte?: Sorte;
  becherNr?: number; // 1..7
  preis?: number; // Euro
  notiz?: string;
  foto?: string; // relativer Pfad im veröffentlichten Datenbestand
  noten: Noten;
  erstelltAm: number; // ms seit Epoche
}

export function leereNoten(): Noten {
  return {
    geschmack: null,
    geruch: null,
    temperatur: null,
    personal: null,
    atmosphaere: null,
    preisLeistung: null,
    becher: null,
  };
}
