// Himmel hinter allem: nachts tiefes Blau mit Glut, tagsüber warmer Morgenhimmel. Dazu eine Lichterkette, die leise funkelt.
// Rein dekorativ, ohne Klicks, hinter dem Inhalt. Die Farben kommen aus --nm-* (src/nacht.css).

/** Feste Positionen (kein Zufall), damit nichts springt: Abstand von links in %, Höhe in px, Größe in px, RGB, Versatz in s. */
const LICHTER: Array<[number, number, number, string, number]> = [
  [4, 30, 7, '255 200 87', 0],
  [13, 52, 5, '255 138 61', 1.1],
  [23, 26, 8, '240 52 79', 2.3],
  [33, 58, 5, '255 226 154', 0.6],
  [44, 34, 7, '255 138 61', 1.8],
  [55, 60, 5, '255 200 87', 2.9],
  [65, 28, 8, '240 52 79', 0.9],
  [75, 54, 5, '255 226 154', 2.1],
  [85, 32, 7, '255 138 61', 1.4],
  [95, 56, 5, '255 200 87', 3.2],
];

export function Hintergrund() {
  return (
    <div aria-hidden="true" class="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      <div class="nm-himmel absolute inset-0" />
      {/* Lichterkette: ein durchhängendes Kabel mit warmen Punkten */}
      <svg class="absolute left-0 top-0 h-24 w-full opacity-60" viewBox="0 0 100 24" preserveAspectRatio="none">
        <path d="M0 4 Q 12 14 25 6 T 50 7 T 75 6 T 100 5" fill="none" stroke="var(--nm-rand-stark)" stroke-width="0.25" />
      </svg>
      {LICHTER.map(([links, hoehe, groesse, rgb, versatz]) => (
        <span
          class="animate-funkeln absolute rounded-full"
          style={{
            left: `${links}%`,
            top: `${hoehe - 22}px`,
            width: `${groesse}px`,
            height: `${groesse}px`,
            background: `light-dark(rgb(${rgb} / 0.75), rgb(${rgb}))`,
            boxShadow: `0 0 ${groesse * 3}px ${groesse}px light-dark(rgb(${rgb} / 0.28), rgb(${rgb} / 0.33))`,
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
