// Glühwein-Preisindex: Preis je Tasse nach Stadt, aus den Meldungen der Bewertenden.
// Gezeigt wird eine Stadt erst ab einer Mindestzahl an Meldungen. Reine Funktionen.

import type { Eintrag } from './modell';
import { stadtVon, type MarktListe } from './orte';
import { preisJeBasis } from './preisleistung';

export const MINDESTMELDUNGEN = 5;
/** Plausible Preise für eine Tasse. Alles darunter oder darüber ist ein Vertipper oder kein Glühwein. */
const MIN_PREIS = 1;
const MAX_PREIS = 15;

export interface PreisStatistik {
  n: number;
  median: number;
  mittel: number;
  min: number;
  max: number;
}

export interface StadtPreis extends PreisStatistik {
  stadt: string;
}

export interface Preisindex {
  zeilen: StadtPreis[];
  /** Über alle Meldungen, auch ohne bekannte Stadt. null, solange es zu wenige gibt. */
  gesamt: PreisStatistik | null;
  /** Wie viele gültige Preismeldungen es insgesamt gibt. */
  meldungen: number;
  schwelle: number;
}

const cent = (x: number) => Math.round(x * 100) / 100;

function statistik(preise: number[]): PreisStatistik {
  const s = [...preise].sort((a, b) => a - b);
  const m = s.length >> 1;
  return {
    n: s.length,
    median: cent(s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2),
    mittel: cent(s.reduce((a, b) => a + b, 0) / s.length),
    min: s[0],
    max: s.at(-1)!,
  };
}

export function preisindex(eintraege: readonly Eintrag[], liste: MarktListe, schwelle = MINDESTMELDUNGEN): Preisindex {
  const gueltig = eintraege.filter(
    (e) => typeof e.preis === 'number' && e.preis >= MIN_PREIS && e.preis <= MAX_PREIS && e.sorte !== 'alkoholfrei',
  );
  const jeStadt = new Map<string, number[]>();
  for (const e of gueltig) {
    const s = stadtVon(liste, e);
    if (s) jeStadt.set(s, [...(jeStadt.get(s) ?? []), preisJeBasis(e.preis!, e.menge)]);
  }
  const zeilen = [...jeStadt.entries()]
    .filter(([, p]) => p.length >= schwelle)
    .map(([stadt, p]) => ({ stadt, ...statistik(p) }))
    .sort((a, b) => b.n - a.n || a.stadt.localeCompare(b.stadt, 'de'));
  return {
    zeilen,
    gesamt: gueltig.length >= schwelle ? statistik(gueltig.map((e) => preisJeBasis(e.preis!, e.menge))) : null,
    meldungen: gueltig.length,
    schwelle,
  };
}
