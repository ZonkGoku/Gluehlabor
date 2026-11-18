// Erzeugt aus dem Original-Logo (assets/logo-original.jpeg, runder dunkler Kreis auf weißem Grund) alle Logo-Dateien:
//   public/logo.png                   512 px, Kreis mit transparenten Ecken (App, Seitenleiste, Story-Bild)
//   public/favicon.png                64 px, Kreis
//   public/icon-192.png, icon-512.png App-Symbol: dunkles Quadrat, Kreis randvoll
//   public/icon-maskable-512.png      Android-Maske: Kreis im sicheren Bereich (74 %)
//   public/apple-touch-icon.png       180 px, dunkles Quadrat (iOS rundet selbst)
// Aufruf: node scripts/logo.mjs   (Playwright kommt aus der Umgebung, wie bei scripts/icons.mjs)
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const { chromium } = createRequire(import.meta.url)('playwright');
const pfad = (p) => fileURLToPath(new URL(p, import.meta.url));
const quelle = `data:image/jpeg;base64,${readFileSync(pfad('../assets/logo-original.jpeg')).toString('base64')}`;
const GRUND = '#0a1d2b'; // Hintergrundfarbe des Logos

const ziele = [
  { datei: 'logo.png', px: 512, art: 'kreis' },
  { datei: 'favicon.png', px: 64, art: 'kreis' },
  { datei: 'icon-192.png', px: 192, art: 'quadrat', skala: 1 },
  { datei: 'icon-512.png', px: 512, art: 'quadrat', skala: 1 },
  { datei: 'icon-maskable-512.png', px: 512, art: 'quadrat', skala: 0.74 },
  { datei: 'apple-touch-icon.png', px: 180, art: 'quadrat', skala: 1 },
];

const browser = await chromium.launch();
const seite = await browser.newPage();
await seite.setContent('<canvas id="c"></canvas>');
for (const z of ziele) {
  const daten = await seite.evaluate(
    async ({ quelle, z, GRUND }) => {
      const bild = new Image();
      bild.src = quelle;
      await bild.decode();
      const c = document.getElementById('c');
      c.width = c.height = z.px;
      const g = c.getContext('2d');
      g.imageSmoothingEnabled = true;
      g.imageSmoothingQuality = 'high';
      // Der Kreis des Originals füllt das Bild bis zum Rand; ein wenig nach innen schneiden entfernt den hellen JPEG-Saum.
      const rand = bild.width * 0.006;
      const quellkreis = bild.width - 2 * rand;
      if (z.art === 'quadrat') {
        g.fillStyle = GRUND;
        g.fillRect(0, 0, z.px, z.px);
      }
      const d = z.px * (z.skala ?? 1);
      const x = (z.px - d) / 2;
      g.save();
      g.beginPath();
      g.arc(z.px / 2, z.px / 2, d / 2, 0, Math.PI * 2);
      g.clip();
      g.drawImage(bild, rand, rand, quellkreis, quellkreis, x, x, d, d);
      g.restore();
      return c.toDataURL('image/png');
    },
    { quelle, z, GRUND },
  );
  const { writeFileSync } = await import('node:fs');
  writeFileSync(pfad(`../public/${z.datei}`), Buffer.from(daten.split(',')[1], 'base64'));
  console.log(z.datei, z.px);
}
await browser.close();
