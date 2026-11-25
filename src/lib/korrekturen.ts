// Korrekturen: Stände zusammenführen, die dieselbe Bude in anderer Schreibweise sind. Reine Funktion, vom Deploy-Skript benutzt.
import { standIdent } from './community';

export interface Korrektur {
  /** Schreibweisen, die zusammengeführt werden (Groß/Klein, Satzzeichen, Umlaute egal). */
  von: string[];
  stadt: string;
  nach: { stand: string; markt: string; stadt: string };
}

export interface BecherZeile {
  id: string;
  stand: string;
  markt: string;
  stadt?: string;
}

/** Bewertungen, die zu einer der Schreibweisen gehören und noch nicht genau so heißen wie das Ziel. Leer = schon erledigt. */
export function trefferFuerKorrektur<T extends BecherZeile>(liste: readonly T[], k: Korrektur): T[] {
  const quellen = new Set(k.von.map((s) => standIdent({ stand: s, stadt: k.stadt })));
  const ziel = standIdent({ stand: k.nach.stand, stadt: k.nach.stadt });
  return liste.filter((e) => {
    // Ohne gespeicherte Stadt gilt die Stadt der Korrektur
    const id = standIdent({ stand: e.stand, stadt: e.stadt ?? k.stadt });
    if (!quellen.has(id) && id !== ziel) return false;
    return e.stand !== k.nach.stand || e.markt !== k.nach.markt || (e.stadt ?? '') !== k.nach.stadt;
  });
}
