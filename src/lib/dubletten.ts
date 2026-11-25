// Mögliche Doppelte unter den Ständen: dieselbe Bude, nur anders geschrieben („Elbschlösdchen" / „Elbschlossen").
// Reine Funktion. Die Prüfstelle entscheidet, nichts wird automatisch zusammengeführt.
import { abstand } from './standvorschlag';
import type { Stand } from './staende';

export interface Dublette {
  /** Dieser Stand wandert … */
  von: Stand;
  /** … zu diesem (der mit den meisten Bewertungen). */
  nach: Stand;
  grund: 'schreibweise' | 'enthalten';
}

/** Nur Buchstaben und Ziffern, ohne Umlaute und Akzente: „Schänke" = „schanke". */
function gekuerzt(s: string): string {
  return s
    .normalize('NFKD')
    .replace(/\p{M}/gu, '')
    .replace(/ß/g, 'ss')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');
}

const ziffern = (s: string) => s.replace(/\D/g, '');

function aehnlich(a: string, b: string): Dublette['grund'] | null {
  if (!a || !b || a === b) return null;
  // „Stand 8" und „Stand 9" sind verschiedene Buden
  if (ziffern(a) !== ziffern(b)) return null;
  const kurz = Math.min(a.length, b.length);
  if (kurz < 5) return null;
  if (a.includes(b) || b.includes(a)) return 'enthalten';
  if (abstand(a, b) <= Math.max(1, Math.floor(kurz * 0.25))) return 'schreibweise';
  return null;
}

const stadtKey = (s: Stand) => (s.stadt ?? '').trim().toLowerCase();

/** Paare von Ständen derselben Stadt, die wie dieselbe Bude aussehen. Der kleinere wandert zum größeren. */
export function findeDubletten(staende: readonly Stand[]): Dublette[] {
  const out: Dublette[] = [];
  for (let i = 0; i < staende.length; i++) {
    for (let j = i + 1; j < staende.length; j++) {
      const a = staende[i];
      const b = staende[j];
      if (stadtKey(a) !== stadtKey(b)) continue;
      const grund = aehnlich(gekuerzt(a.stand), gekuerzt(b.stand));
      if (!grund) continue;
      const [von, nach] = b.bewertungen.length > a.bewertungen.length ? [a, b] : [b, a];
      out.push({ von, nach, grund });
    }
  }
  return out.sort((x, y) => y.von.bewertungen.length + y.nach.bewertungen.length - (x.von.bewertungen.length + x.nach.bewertungen.length));
}
