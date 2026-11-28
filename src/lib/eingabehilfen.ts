// Vorschläge, damit beim Bewerten weniger getippt werden muss. Alles nur Vorschläge: sichtbar markiert, nie stillschweigend gespeichert.
import { standIdent } from './community';

interface Basis {
  stand: string;
  stadt?: string | null;
}
interface MitPreis extends Basis {
  preis?: number;
  menge?: number;
  sorte?: string;
}

const median = (w: number[]): number | null => {
  if (w.length === 0) return null;
  const s = [...w].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
};

/** Üblicher Preis an diesem Stand für dieselbe Tassengröße (Median der Meldungen, auf 10 Cent gerundet); null ohne Meldung. */
export function standPreisVorschlag(eintraege: readonly MitPreis[], stand: string, stadt: string | undefined, menge: number | undefined): number | null {
  const id = standIdent({ stand, stadt });
  const gleich = eintraege.filter((e) => e.preis !== undefined && standIdent(e) === id && (e.menge ?? 0.2) === (menge ?? 0.2)).map((e) => e.preis as number);
  const m = median(gleich);
  return m === null ? null : Math.round(m * 10) / 10;
}

/** Häufigste Sorte an diesem Stand (bei Gleichstand die zuerst gemeldete); undefined, wenn keine bekannt ist. */
export function haeufigsteSorte<S extends string>(eintraege: readonly (Basis & { sorte?: S })[], stand: string, stadt: string | undefined): S | undefined {
  const id = standIdent({ stand, stadt });
  const zaehler = new Map<S, number>();
  for (const e of eintraege) if (e.sorte && standIdent(e) === id) zaehler.set(e.sorte, (zaehler.get(e.sorte) ?? 0) + 1);
  let best: S | undefined;
  let n = 0;
  for (const [s, c] of zaehler) if (c > n) [best, n] = [s, c];
  return best;
}

export interface StandKurz {
  stand: string;
  markt: string;
  stadt?: string;
  anzahl: number;
  /** Heute Abend von diesem Gerät schon bewertet */
  heute?: boolean;
}

/** Reihenfolge der Stände zur Auswahl: heute schon von dir bewertete zuerst, dann zuletzt bewertete, dann nach Zahl der Bewertungen. */
export function ordneStaende(
  liste: readonly StandKurz[],
  eintraege: readonly (Basis & { geraet?: string; datum?: string; erstelltAm: number })[],
  ich: string | null,
  heute: string,
): StandKurz[] {
  const letzte = new Map<string, number>();
  const heuteMeine = new Set<string>();
  for (const e of eintraege) {
    const id = standIdent(e);
    letzte.set(id, Math.max(letzte.get(id) ?? 0, e.erstelltAm));
    if (ich && e.geraet === ich && e.datum === heute) heuteMeine.add(id);
  }
  return liste
    .map((s) => ({ ...s, heute: heuteMeine.has(standIdent(s)) }))
    .sort((a, b) => {
      const ia = standIdent(a);
      const ib = standIdent(b);
      return Number(b.heute) - Number(a.heute) || (letzte.get(ib) ?? 0) - (letzte.get(ia) ?? 0) || b.anzahl - a.anzahl || a.stand.localeCompare(b.stand, 'de');
    });
}
