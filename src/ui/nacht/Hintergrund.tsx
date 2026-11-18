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

/** Feine Sterne im oberen Himmel (nur nachts sichtbar): Abstand links in %, von oben in %, Größe in px, Versatz in s. */
const STERNE: Array<[number, number, number, number]> = [
  [6, 9, 2, 0.2], [17, 16, 1.5, 1.4], [28, 6, 2, 2.6], [39, 14, 1.5, 0.8], [49, 5, 2, 3.1], [58, 18, 1.5, 1.9],
  [67, 8, 2, 0.5], [77, 15, 1.5, 2.2], [86, 6, 2, 1.1], [94, 17, 1.5, 3.4], [12, 30, 1.5, 2.8], [33, 27, 1.5, 0.3],
  [62, 31, 1.5, 1.6], [90, 34, 1.5, 2.4],
];
/** Schneeflocken: Abstand links in %, Größe in px, Fallzeit in s, Versatz in s (negativ = schon unterwegs), seitlicher Zug in px, Deckkraft. */
const FLOCKEN: Array<[number, number, number, number, number, number]> = [
  [3, 3, 17, -2, 20, 0.55], [9, 2, 13, -9, -14, 0.4], [15, 4, 19, -5, 26, 0.6], [22, 2, 12, -11, 12, 0.4], [29, 3, 16, -1, -22, 0.55],
  [35, 2, 14, -7, 16, 0.45], [41, 4, 20, -13, -18, 0.6], [47, 2, 12, -4, 22, 0.4], [53, 3, 17, -10, -12, 0.55], [59, 2, 13, -6, 18, 0.45],
  [64, 4, 19, -15, -24, 0.6], [70, 3, 15, -3, 14, 0.5], [76, 2, 12, -8, -16, 0.4], [81, 4, 18, -12, 24, 0.6], [87, 3, 16, -5, -10, 0.5],
  [92, 2, 13, -14, 20, 0.4], [97, 3, 17, -9, -20, 0.5], [12, 3, 15, -16, 10, 0.45], [44, 3, 18, -17, -14, 0.5], [73, 2, 14, -18, 16, 0.4],
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
      {/* Glühen der Buden am unteren Rand: warmes Flackern wie Lampen und Kerzen */}
      <div class="animate-flackern absolute -bottom-24 -left-24 size-[420px] rounded-full blur-3xl" style={{ background: 'light-dark(rgb(255 170 90 / 0.28), rgb(255 138 61 / 0.22))' }} />
      <div class="animate-flackern absolute -bottom-28 right-[8%] size-[360px] rounded-full blur-3xl" style={{ background: 'light-dark(rgb(255 120 110 / 0.22), rgb(240 52 79 / 0.16))', animationDelay: '1.7s' }} />
      <div class="animate-flackern absolute -bottom-20 left-[42%] size-[300px] rounded-full blur-3xl" style={{ background: 'light-dark(rgb(255 210 120 / 0.2), rgb(255 200 87 / 0.12))', animationDelay: '3.2s' }} />
      {/* Sterne */}
      {STERNE.map(([links, oben, groesse, versatz]) => (
        <span
          class="animate-funkeln absolute rounded-full"
          style={{ left: `${links}%`, top: `${oben}%`, width: `${groesse}px`, height: `${groesse}px`, background: 'light-dark(transparent, #fff8e6)', animationDelay: `${versatz}s` }}
        />
      ))}
      {/* Leise fallender Schnee */}
      {FLOCKEN.map(([links, groesse, dauer, versatz, zug, deckkraft]) => (
        <span
          class="animate-schnee absolute left-0 top-0 rounded-full"
          style={{
            left: `${links}%`,
            width: `${groesse}px`,
            height: `${groesse}px`,
            background: 'light-dark(rgb(255 150 120 / 0.9), rgb(255 255 255 / 0.95))',
            animationDuration: `${dauer}s`,
            animationDelay: `${versatz}s`,
            '--w': `${zug}px`,
            '--o': deckkraft,
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
