// Die Sorten als Bilder statt Text: eine Glühweintasse in der Farbe des Weins, dazu ein Merkmal (Flamme, Kirsche, Trauben …).
// Der Name steht nur als Beschriftung für Screenreader und als Tooltip daneben.
import type { Sorte } from '../../lib/modell';

const WEIN: Record<Sorte, string> = {
  rot: '#c8213f',
  weiss: '#f2e3a0',
  kirsch: '#8c1238',
  winzer: '#b8631c',
  feuerzangen: '#e0701a',
  alkoholfrei: '#7ddc6a',
  sonstiges: '#aab4c8',
};

export function SorteIcon({ sorte, groesse = 32 }: { sorte: Sorte; groesse?: number }) {
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
      {sorte === 'feuerzangen' && <path d="M15.5 14c2.6 2 3.6 3.6 3.6 5.4a3.6 3.6 0 0 1-7.2 0c0-1.4.8-2.4 1.6-3.2.1 1.2.8 1.6 1.2 1.6.2-1.6.2-2.6.8-3.8z" fill="#ffd24a" stroke="#a8480c" stroke-width="1" />}
      {sorte === 'kirsch' && (
        <>
          <circle cx="13.2" cy="21" r="2.6" fill="#e5304f" stroke="#4a0a1b" stroke-width="1" />
          <circle cx="18.6" cy="20" r="2.6" fill="#e5304f" stroke="#4a0a1b" stroke-width="1" />
          <path d="M13.5 18.4q2-3.4 4.6-3.8M18.4 17.4q-.2-1.6-.3-2.8" fill="none" stroke="#2d7a2d" stroke-width="1.2" />
        </>
      )}
      {sorte === 'winzer' && (
        <>
          <circle cx="13.6" cy="19.6" r="1.7" fill="#6b2a8c" />
          <circle cx="17.4" cy="19.6" r="1.7" fill="#6b2a8c" />
          <circle cx="15.5" cy="22.6" r="1.7" fill="#6b2a8c" />
          <path d="M15.5 17.4v-2.2" stroke="#2d7a2d" stroke-width="1.4" fill="none" />
        </>
      )}
      {sorte === 'alkoholfrei' && (
        <>
          <circle cx="15.5" cy="19.5" r="4.4" fill="none" stroke="#fff" stroke-width="1.6" />
          <path d="M12.4 22.6l6.2-6.2" stroke="#fff" stroke-width="1.6" fill="none" />
        </>
      )}
      {sorte === 'sonstiges' && <path d="M13.4 18.2a2.3 2.3 0 1 1 3.2 2.1c-.6.3-1 .8-1 1.4M15.6 24h.01" fill="none" stroke="#fff" stroke-width="1.7" />}
    </svg>
  );
}
