// Lichterkette: ein durchhängendes Kabel mit warmen Birnen (Gold, Glut, Rot, Warmweiß), die leise funkeln.
// Hängt an der Unterkante des Headers bzw. fest am oberen Rand, wenn es keinen Header gibt. Rein dekorativ.
const FARBEN = ['255 200 87', '255 138 61', '240 52 79', '255 236 190'];
const N = 15; // Birnen
const BREITE = 100; // Zeichenfläche in %, die Kurve wird gestreckt
const HOEHE = 22;

/** Kabel als Folge von Bögen; Birnen hängen am tiefsten Punkt jedes Bogens. */
const SCHRITT = BREITE / N;
const KABEL = Array.from({ length: N }, (_, i) => `${i === 0 ? 'M0 3' : ''} Q ${(i + 0.5) * SCHRITT} 15 ${(i + 1) * SCHRITT} 3`).join(' ');

export function Lichterkette({ fest = false }: { fest?: boolean }) {
  return (
    <div aria-hidden="true" class={`pointer-events-none inset-x-0 z-40 h-[26px] ${fest ? 'fixed top-0' : 'absolute -bottom-[17px]'}`}>
      <svg class="absolute inset-x-0 top-0 h-[22px] w-full" viewBox={`0 0 ${BREITE} ${HOEHE}`} preserveAspectRatio="none">
        <path d={KABEL} fill="none" style={{ stroke: 'light-dark(rgb(120 90 70 / 0.55), rgb(255 255 255 / 0.3))' }} stroke-width="1.2" vector-effect="non-scaling-stroke" />
      </svg>
      {Array.from({ length: N }, (_, i) => {
        const rgb = FARBEN[i % FARBEN.length];
        return (
          <span
            class="animate-funkeln absolute size-2 -translate-x-1/2 rounded-full"
            style={{
              left: `${(i + 0.5) * SCHRITT}%`,
              top: '9px',
              background: `rgb(${rgb})`,
              boxShadow: `0 0 10px 3px rgb(${rgb} / 0.55)`,
              animationDelay: `${(i * 0.7) % 3.6}s`,
            }}
          />
        );
      })}
    </div>
  );
}
