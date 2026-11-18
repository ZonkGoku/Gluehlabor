// Gemeinsame Datenquellen der Ansichten. Alles live: Änderungen an Einträgen
// oder Gewichten rendern sofort jede Ansicht neu.
import { useEffect, useState } from 'preact/hooks';
import { db, leseEinstellung, leseGewichte, type LokalerEintrag } from '../daten/db';
import { DEFAULT_GEWICHTE, type Gewichte } from '../lib/modell';
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
export type SaisonWahl = number | 'alle';
const KEY = 'becherwerk.saison';
let saison: SaisonWahl = (() => {
  try {
    const v = localStorage.getItem(KEY);
    return v === null || v === 'alle' ? 'alle' : Number(v);
  } catch {
    return 'alle';
  }
})();
const hoerer = new Set<(s: SaisonWahl) => void>();

export function useSaison(): [SaisonWahl, (s: SaisonWahl) => void] {
  const [s, setS] = useState(saison);
  useEffect(() => {
    hoerer.add(setS);
    return () => void hoerer.delete(setS);
  }, []);
  const setze = (neu: SaisonWahl) => {
    saison = neu;
    try {
      localStorage.setItem(KEY, String(neu));
    } catch {
      /* egal */
    }
    hoerer.forEach((h) => h(neu));
  };
  return [s, setze];
}
