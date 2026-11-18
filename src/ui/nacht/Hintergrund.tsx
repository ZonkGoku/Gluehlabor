// Nachthimmel hinter allem: tiefes Blau, ein Schimmer Glut unten links, ein Hauch Glühwein-Rot oben rechts
// und eine Lichterkette, die leise funkelt. Rein dekorativ, ohne Klicks, hinter dem Inhalt.

/** Feste Positionen (kein Zufall), damit nichts springt: Abstand von links in %, Höhe in px, Größe in px, Farbe, Versatz. */
const LICHTER: Array<[number, number, number, string, number]> = [
  [4, 30, 7, '#ffc857', 0],
  [13, 52, 5, '#ff8a3d', 1.1],
  [23, 26, 8, '#f0344f', 2.3],
  [33, 58, 5, '#ffe29a', 0.6],
  [44, 34, 7, '#ff8a3d', 1.8],
  [55, 60, 5, '#ffc857', 2.9],
  [65, 28, 8, '#f0344f', 0.9],
  [75, 54, 5, '#ffe29a', 2.1],
  [85, 32, 7, '#ff8a3d', 1.4],
  [95, 56, 5, '#ffc857', 3.2],
];

export function Hintergrund() {
  return (
    <div aria-hidden="true" class="pointer-events-none fixed inset-0 -z-10 overflow-hidden bg-nacht-900">
      <div
        class="absolute inset-0"
        style={{
          background:
            'radial-gradient(900px 520px at 85% -8%, rgb(240 52 79 / 0.20), transparent 62%),' +
            'radial-gradient(780px 560px at -8% 108%, rgb(255 138 61 / 0.17), transparent 60%),' +
            'radial-gradient(700px 500px at 50% 40%, rgb(40 56 140 / 0.22), transparent 70%),' +
            'linear-gradient(180deg, #060919 0%, #0a1030 55%, #0b0d24 100%)',
        }}
      />
      {/* Lichterkette: ein durchhängendes Kabel mit warmen Punkten */}
      <svg class="absolute left-0 top-0 h-24 w-full opacity-60" viewBox="0 0 100 24" preserveAspectRatio="none">
        <path d="M0 4 Q 12 14 25 6 T 50 7 T 75 6 T 100 5" fill="none" stroke="rgb(255 255 255 / 0.12)" stroke-width="0.25" />
      </svg>
      {LICHTER.map(([links, hoehe, groesse, farbe, versatz]) => (
        <span
          class="animate-funkeln absolute rounded-full"
          style={{
            left: `${links}%`,
            top: `${hoehe - 22}px`,
            width: `${groesse}px`,
            height: `${groesse}px`,
            background: farbe,
            boxShadow: `0 0 ${groesse * 3}px ${groesse}px ${farbe}55`,
            animationDelay: `${versatz}s`,
          }}
        />
      ))}
      {/* Körnung gegen Banding */}
      <div
        class="absolute inset-0 opacity-[0.035] mix-blend-overlay"
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='120' height='120'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='.9' numOctaves='2' stitchTiles='stitch'/></filter><rect width='120' height='120' filter='url(%23n)'/></svg>\")",
        }}
      />
    </div>
  );
}
