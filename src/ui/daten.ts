// Gemeinsame Datenquellen der Ansichten. Alles live: Änderungen an Einträgen
// oder Gewichten rendern sofort jede Ansicht neu.
import { useEffect, useState } from 'preact/hooks';
import { db, leseEinstellung, leseGewichte, type LokalerEintrag } from '../daten/db';
import { DEFAULT_GEWICHTE, type Eintrag, type Gewichte } from '../lib/modell';
import { standardSaison } from '../lib/startseite';
import { useLive } from './hooks';

export function useEintraege(): LokalerEintrag[] | null {
  return useLive<LokalerEintrag[] | null>(() => db.eintraege.toArray(), [], null);
}

export function useGewichte(): Gewichte {
  return useLive(leseGewichte, [], { ...DEFAULT_GEWICHTE });
}

/** Darf dieses Gerät eintragen? (Token hinterlegt oder schon lokal erfasst.) */
export function useDarfErfassen(): boolean {
  const token = useLive(() => leseEinstellung<string>('token', ''), [], '');
  const offen = useLive(() => db.eintraege.where('sync').equals('offen').count(), [], 0);
  return Boolean(token) || offen > 0;
}

// Saison-Auswahl: pro Betrachter gemerkt, über alle Ansichten geteilt.
// Ohne eigene Wahl gilt die Standard-Saison (laufendes Jahr, sonst die letzte).
export type SaisonWahl = number | 'alle';
const KEY = 'becherwerk.saison';
let gewaehlt: SaisonWahl | null = (() => {
  try {
    const v = localStorage.getItem(KEY);
    return v === null ? null : v === 'alle' ? 'alle' : Number(v);
  } catch {
    return null;
  }
})();
const hoerer = new Set<(s: SaisonWahl | null) => void>();

export function useSaison(eintraege: readonly Eintrag[] | null): [SaisonWahl, (s: SaisonWahl) => void] {
  const [s, setS] = useState(gewaehlt);
  useEffect(() => {
    hoerer.add(setS);
    return () => void hoerer.delete(setS);
  }, []);
  const standard = standardSaison(eintraege ?? [], new Date().getFullYear());
  const setze = (neu: SaisonWahl) => {
    gewaehlt = neu;
    try {
      localStorage.setItem(KEY, String(neu));
    } catch {
      /* egal */
    }
    hoerer.forEach((h) => h(neu));
  };
  return [s ?? standard, setze];
}
