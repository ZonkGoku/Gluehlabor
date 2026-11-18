// Erzeugt alle Logo-Dateien aus assets/logo-marke.svg (zwei Köpfe mit Mützen, dazwischen Kolben und dampfende Tasse).
// Dieselbe SVG wird in der App inline gezeigt (src/ui/nacht/Logo.tsx); die PNGs brauchen Favicon, App-Symbole, Story-Bild und Vorschaubild.
//
//   public/logo.png           512 px, rund mit transparenten Ecken
//   public/logo-klein.png     128 px, Linien verstärkt
//   public/favicon.png        64 px, Linien stark verstärkt
//   public/icon-192.png, icon-512.png, icon-maskable-512.png, apple-touch-icon.png   App-Symbole (dunkles Quadrat)
//
// Aufruf: node scripts/logo.mjs   (Playwright kommt aus der Umgebung, wie bei scripts/og.mjs)
import { readFileSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const { chromium } = createRequire(import.meta.url)('playwright');
const pfad = (p) => fileURLToPath(new URL(p, import.meta.url));
const svg = readFileSync(pfad('../assets/logo-marke.svg'), 'utf8');

// strich: Strichstärke in SVG-Einheiten (kleine Größen brauchen kräftigere Linien); quadrat: dunkles Quadrat statt transparenter Ecken
const ziele = [
  { datei: 'logo.png', px: 512, strich: 3.2 },
  { datei: 'logo-klein.png', px: 128, strich: 5 },
  { datei: 'favicon.png', px: 64, strich: 7.5 },
  { datei: 'icon-192.png', px: 192, strich: 4.6, quadrat: true, skala: 1 },
  { datei: 'icon-512.png', px: 512, strich: 3.2, quadrat: true, skala: 1 },
  { datei: 'icon-maskable-512.png', px: 512, strich: 3.2, quadrat: true, skala: 0.74 },
  { datei: 'apple-touch-icon.png', px: 180, strich: 4.6, quadrat: true, skala: 1 },
];

const browser = await chromium.launch();
const seite = await browser.newPage();
for (const z of ziele) {
  const d = Math.round(z.px * (z.skala ?? 1));
  await seite.setViewportSize({ width: z.px, height: z.px });
  await seite.setContent(
    `<body style="margin:0;background:${z.quadrat ? '#070b11' : 'transparent'}"><div id="k" style="width:${z.px}px;height:${z.px}px;display:grid;place-items:center">` +
      `<div style="width:${d}px;height:${d}px;--sw:${z.strich}">${svg}</div></div></body>`,
  );
  const bild = await seite.locator('#k').screenshot({ omitBackground: !z.quadrat });
  writeFileSync(pfad(`../public/${z.datei}`), bild);
  console.log(z.datei, z.px);
}
await browser.close();
