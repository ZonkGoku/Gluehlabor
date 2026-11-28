// Die Sorten als Bilder: eine Glühweintasse in der Farbe des Weins mit einem großen Merkmal (Kirschen, Trauben, Zuckerhut mit Flamme, 0 %).
// Rot und Weiß unterscheiden sich durch Farbe und Glanz; darunter steht immer ein Kurzwort, damit nichts erraten werden muss.
import type { Sorte } from '../../lib/modell';

const WEIN: Record<Sorte, string> = {
  rot: '#b3162f',
  weiss: '#f6e7a2',
  kirsch: '#7a0f35',
  winzer: '#a9561a',
  feuerzangen: '#c4551a',
  alkoholfrei: '#3fae6a',
  sonstiges: '#8f9ab3',
};

/** Kurzwort unter dem Bild (Schlüssel für die Übersetzung). */
export const SORTE_KURZ: Record<Sorte, string> = { rot: 'Rot', weiss: 'Weiß', kirsch: 'Kirsch', winzer: 'Winzer', feuerzangen: 'Feuer', alkoholfrei: '0 %', sonstiges: 'Andere' };

export function SorteIcon({ sorte, groesse = 40 }: { sorte: Sorte; groesse?: number }) {
  const farbe = WEIN[sorte];
  return (
    <svg viewBox="0 0 40 40" width={groesse} height={groesse} aria-hidden="true" stroke-linecap="round" stroke-linejoin="round">
      {/* Henkel */}
      <path d="M30 17h2.6a4.4 4.4 0 0 1 0 8.8H29" fill="none" stroke="currentColor" stroke-width="2.4" opacity="0.85" />
      {/* Tasse mit Wein */}
      <path d="M7 14h24v14a9 9 0 0 1-9 9h-6a9 9 0 0 1-9-9z" fill={farbe} stroke="currentColor" stroke-width="2.2" />
      <path d="M9 18h20" stroke="#fff" stroke-width="2" opacity="0.45" />
      {/* Weiß: Bläschen, damit es nicht wie leer wirkt */}
      {sorte === 'weiss' && (
        <>
          <circle cx="15" cy="27" r="1.6" fill="#fff" opacity="0.9" />
          <circle cx="21" cy="24" r="1.2" fill="#fff" opacity="0.9" />
          <circle cx="24" cy="30" r="1.5" fill="#fff" opacity="0.9" />
        </>
      )}
      {/* Kirsch: zwei große Kirschen */}
      {sorte === 'kirsch' && (
        <>
          <path d="M15 28q3-9 9-12M24 26q0-6-1-10" fill="none" stroke="#3d9a3d" stroke-width="2" />
          <circle cx="14" cy="30" r="4.4" fill="#ff3b5c" stroke="#3d0716" stroke-width="1.6" />
          <circle cx="24.5" cy="28.5" r="4.4" fill="#ff3b5c" stroke="#3d0716" stroke-width="1.6" />
        </>
      )}
      {/* Winzer: Traubenbündel mit Blatt */}
      {sorte === 'winzer' && (
        <>
          <circle cx="14.5" cy="24.5" r="3" fill="#7a3aa8" stroke="#2a0e3d" stroke-width="1.2" />
          <circle cx="20.5" cy="24.5" r="3" fill="#7a3aa8" stroke="#2a0e3d" stroke-width="1.2" />
          <circle cx="26.5" cy="24.5" r="3" fill="#7a3aa8" stroke="#2a0e3d" stroke-width="1.2" />
          <circle cx="17.5" cy="30" r="3" fill="#7a3aa8" stroke="#2a0e3d" stroke-width="1.2" />
          <circle cx="23.5" cy="30" r="3" fill="#7a3aa8" stroke="#2a0e3d" stroke-width="1.2" />
          <path d="M20.5 21.5v-3.5q4-.4 6 2.6-3.6 1.6-6-.2z" fill="#4cae4c" stroke="#1f5a1f" stroke-width="1.2" />
        </>
      )}
      {/* Feuerzangenbowle: Zuckerhut über der Tasse, darüber eine große Flamme */}
      {sorte === 'feuerzangen' && (
        <>
          <path d="M12 14l3-6h10l3 6z" fill="#fff8e8" stroke="currentColor" stroke-width="1.8" />
          <path d="M20 1.5c3.4 3 5 5.2 5 7.6a5 5 0 0 1-10 0c0-1.9 1.1-3.3 2.2-4.4.2 1.7 1.2 2.2 1.8 2.2.4-2.2.2-3.6 1-5.4z" fill="#ffc83a" stroke="#b5400c" stroke-width="1.5" />
          <path d="M20 18v0" />
        </>
      )}
      {/* Alkoholfrei: groß „0 %" in der Tasse */}
      {sorte === 'alkoholfrei' && (
        <text x="19" y="31" text-anchor="middle" font-size="13" font-weight="800" font-family="var(--mono), monospace" fill="#fff" stroke="none">
          0%
        </text>
      )}
      {sorte === 'sonstiges' && (
        <text x="19" y="32" text-anchor="middle" font-size="17" font-weight="800" font-family="var(--mono), monospace" fill="#fff" stroke="none">
          ?
        </text>
      )}
      {/* Dampf (nicht bei Feuerzange, dort sitzt die Flamme) */}
      {sorte !== 'feuerzangen' && <path d="M13 9c-2-2 2-3.4 0-6M19 9c-2-2 2-3.4 0-6M25 9c-2-2 2-3.4 0-6" fill="none" stroke="currentColor" stroke-width="1.7" opacity="0.4" />}
    </svg>
  );
}
