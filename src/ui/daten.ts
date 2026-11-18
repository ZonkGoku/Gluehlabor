// Gemeinsame Datenquellen der Ansichten. Alles live: Änderungen an Einträgen
// oder Gewichten rendern sofort jede Ansicht neu.
import { useEffect, useState } from 'preact/hooks';
import { db, leseEinstellung, leseGewichte, type Geraet, type LokalerEintrag } from '../daten/db';
import { DEFAULT_GEWICHTE, type Eintrag, type Gewichte } from '../lib/modell';
import { standardSaison } from '../lib/startseite';
import { useLive } from './hooks';

export function useEintraege(): LokalerEintrag[] | null {
  return useLive<LokalerEintrag[] | null>(() => db.eintraege.toArray(), [], null);
}

export function useGewichte(): Gewichte {
  return useLive(leseGewichte, [], { ...DEFAULT_GEWICHTE });
}

/** Anonyme Kennung dieses Geräts; null, solange noch nie etwas erfasst wurde. */
export function useGeraetId(): string | null {
  return useLive(async () => (await leseEinstellung<Geraet | null>('geraet', null))?.id ?? null, [], null);
}

/** Der freiwillige Anzeigename dieses Geräts ('' = anonym). */
export function useName(): string {
  return useLive(() => leseEinstellung<string>('name', ''), [], '');
}

/** Wie viele Becher stammen von diesem Gerät? */
export function useMeineAnzahl(): number {
  return useLive(
    async () => {
      const g = await leseEinstellung<Geraet | null>('geraet', null);
      return g ? db.eintraege.filter((e) => e.geraet === g.id).count() : 0;
    },
    [],
    0,
  );
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
