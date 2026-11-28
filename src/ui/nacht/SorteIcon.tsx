// Die Sorten als Bilder statt Text: eine Glühweintasse in der Farbe des Weins, dazu ein Merkmal (Flamme, Kirsche, Trauben …).
// Der Name steht nur als Beschriftung für Screenreader und als Tooltip daneben.
import type { Sorte } from '../../lib/modell';

const WEIN: Record<Sorte, string> = {
  rot: '#b3162f',
  weiss: '#f7e9a6',
  kirsch: '#7a0f35',
  winzer: '#b8631c',
  feuerzangen: '#e0701a',
  alkoholfrei: '#46b872',
  sonstiges: '#8f9ab3',
};

export function SorteIcon({ sorte, groesse = 36 }: { sorte: Sorte; groesse?: number }) {
  const farbe = WEIN[sorte];
  return (
    <svg viewBox="0 0 32 32" width={groesse} height={groesse} aria-hidden="true" stroke-linecap="round" stroke-linejoin="round">
      {/* Dampf */}
      <path d="M11 6c-1.4-1.6 1.4-2.6 0-4.4M16 6c-1.4-1.6 1.4-2.6 0-4.4M21 6c-1.4-1.6 1.4-2.6 0-4.4" fill="none" stroke="currentColor" stroke-width="1.3" opacity="0.45" />
      {/* Henkel */}
      <path d="M24.5 13h1.8a3.6 3.6 0 0 1 0 7.2h-2" fill="none" stroke="currentColor" stroke-width="2" opacity="0.8" />
      {/* Tasse mit Wein */}
      <path d="M6 9h19v11a7 7 0 0 1-7 7h-5a7 7 0 0 1-7-7z" fill={farbe} stroke="currentColor" stroke-width="1.8" />
      <path d="M6.9 12h17.2" stroke="#fff" stroke-width="1.6" opacity="0.5" />
      {/* Merkmal je Sorte */}
      {sorte === 'feuerzangen' && <path d="M15.5 12.5c3.2 2.4 4.6 4.4 4.6 6.6a4.6 4.6 0 0 1-9.2 0c0-1.7 1-3 2-4 .2 1.5 1 2 1.6 2 .3-2 .3-3.2 1-4.6z" fill="#ffd24a" stroke="#a8480c" stroke-width="1.2" />}
      {sorte === 'kirsch' && (
        <>
          <circle cx="12.6" cy="21.4" r="3.3" fill="#ff3b5c" stroke="#3d0716" stroke-width="1.1" />
          <circle cx="19.2" cy="20.4" r="3.3" fill="#ff3b5c" stroke="#3d0716" stroke-width="1.1" />
          <path d="M12.8 18.2q2.6-4.2 5.6-4.6M19 17.2q-.2-1.8-.3-3.2" fill="none" stroke="#3d9a3d" stroke-width="1.4" />
        </>
      )}
      {sorte === 'winzer' && (
        <>
          <circle cx="12.8" cy="19.8" r="2.3" fill="#7a3aa8" stroke="#2a0e3d" stroke-width="0.8" />
          <circle cx="18" cy="19.8" r="2.3" fill="#7a3aa8" stroke="#2a0e3d" stroke-width="0.8" />
          <circle cx="15.4" cy="23.6" r="2.3" fill="#7a3aa8" stroke="#2a0e3d" stroke-width="0.8" />
          <path d="M15.4 17.4v-2.4q3.6-.4 5.2 2.2-3.2 1.4-5.2.2z" fill="#4cae4c" stroke="#1f5a1f" stroke-width="0.9" />
        </>
      )}
      {sorte === 'alkoholfrei' && (
        <>
          <circle cx="15.5" cy="19.5" r="5" fill="none" stroke="#fff" stroke-width="2" />
          <path d="M12 23l7-7" stroke="#fff" stroke-width="2" fill="none" />
        </>
      )}
      {sorte === 'sonstiges' && <path d="M12.8 17.8a2.9 2.9 0 1 1 4 2.7c-.8.4-1.3 1-1.3 1.8M15.5 25h.01" fill="none" stroke="#fff" stroke-width="2.2" />}
    </svg>
  );
}
