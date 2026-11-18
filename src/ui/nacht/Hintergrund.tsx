// Himmel hinter allem: nachts tiefes Blau mit Glut, tagsüber warmer Morgenhimmel, dazu Sterne, Schnee und Budenlicht. Die Lichterkette sitzt am Header (Lichterkette.tsx).
// Rein dekorativ, ohne Klicks, hinter dem Inhalt. Die Farben kommen aus --nm-* (src/nacht.css).

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
