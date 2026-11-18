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
/** Schneeflocken: feste Folge (kein Zufall zur Laufzeit), damit nichts springt. Zwei Schichten: kleine scharfe weit hinten, große weiche vorn (Tiefe). */
function macheFlocken(): Array<[number, number, number, number, number, number, number]> {
  let z = 7;
  const r = () => ((z = (z * 16807) % 2147483647) / 2147483647);
  return Array.from({ length: 46 }, (_, i) => {
    const vorn = i % 6 === 0;
    const groesse = vorn ? 7 + r() * 5 : 2 + r() * 3.5;
    return [r() * 100, groesse, vorn ? 9 + r() * 5 : 13 + r() * 9, -r() * 22, (r() - 0.5) * 60, vorn ? 0.5 : 0.55 + r() * 0.4, vorn ? 2.5 : 0];
  });
}
const FLOCKEN = macheFlocken();

export function Hintergrund() {
  return (
    <div aria-hidden="true" class="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      <div class="nm-himmel absolute inset-0" />
      {/* Budendach: rot-cremefarben gestreift mit Zacken, wie die Markisen der Glühweinbuden */}
      <div class="absolute inset-x-0 top-0 opacity-95" style={{ filter: 'drop-shadow(0 6px 14px rgb(240 52 79 / 0.35))' }}>
        <div class="h-2" style={{ background: 'repeating-linear-gradient(90deg,#c81e3d 0 22px,#fff1dc 22px 44px)' }} />
        <div class="h-[11px]" style={{ backgroundImage: 'radial-gradient(circle at 11px 0,#c81e3d 10.5px,transparent 11px),radial-gradient(circle at 33px 0,#fff1dc 10.5px,transparent 11px)', backgroundSize: '44px 100%' }} />
      </div>
      {/* Lichterkette: ein durchhängendes Kabel mit warmen Punkten */}
      <svg class="absolute left-0 top-[19px] h-24 w-full opacity-60" viewBox="0 0 100 24" preserveAspectRatio="none">
        <path d="M0 4 Q 12 14 25 6 T 50 7 T 75 6 T 100 5" fill="none" stroke="var(--nm-rand-stark)" stroke-width="0.25" />
      </svg>
      {LICHTER.map(([links, hoehe, groesse, rgb, versatz]) => (
        <span
          class="animate-funkeln absolute rounded-full"
          style={{
            left: `${links}%`,
            top: `${hoehe - 3}px`,
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
      {FLOCKEN.map(([links, groesse, dauer, versatz, zug, deckkraft, unschaerfe]) => (
        <span
          class="animate-schnee absolute left-0 top-0 rounded-full"
          style={{
            left: `${links}%`,
            width: `${groesse}px`,
            height: `${groesse}px`,
            background: 'light-dark(#fff, rgb(255 255 255 / 0.95))',
            boxShadow: 'light-dark(0 0 0 1px rgb(255 140 110 / 0.35), 0 0 6px rgb(255 255 255 / 0.5))',
            filter: unschaerfe ? `blur(${unschaerfe}px)` : undefined,
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
