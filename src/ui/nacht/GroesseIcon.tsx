// Tassengröße als Bild: kleine, mittlere und große Tasse (0,2 / 0,25 / 0,3 l). Die Zahl steht klein darunter.
const MASSE: Record<number, { b: number; h: number }> = { 0.2: { b: 11, h: 10 }, 0.25: { b: 13, h: 12.5 }, 0.3: { b: 15, h: 15 } };

export function GroesseIcon({ menge, groesse = 28 }: { menge: number; groesse?: number }) {
  const m = MASSE[menge] ?? MASSE[0.2];
  const x = 12 - m.b / 2 - 1.5;
  const y = 22 - m.h;
  return (
    <svg viewBox="0 0 24 24" width={groesse} height={groesse} aria-hidden="true" stroke-linecap="round" stroke-linejoin="round">
      <path d={`M${x} ${y}h${m.b}v${m.h - 3}a3 3 0 0 1-3 3h${-(m.b - 6)}a3 3 0 0 1-3-3z`} fill="currentColor" fill-opacity="0.2" stroke="currentColor" stroke-width="1.6" />
      <path d={`M${x + m.b} ${y + 2.5}h1.4a2.2 2.2 0 0 1 0 4.4h-1.4`} fill="none" stroke="currentColor" stroke-width="1.6" />
    </svg>
  );
}
