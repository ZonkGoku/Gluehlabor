// Rastert public/icon.svg zu den PNG-Icons der PWA. Einmalig bzw. nach Icon-Änderung:
//   node scripts/icons.mjs
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';

// Playwright ist nicht Projektabhängigkeit; es wird aus der Umgebung genommen.
const { chromium } = createRequire(import.meta.url)('playwright');

const svg = readFileSync(new URL('../public/icon.svg', import.meta.url), 'utf8');
const ziele = [
  ['icon-192.png', 192, 1],
  ['icon-512.png', 512, 1],
  ['apple-touch-icon.png', 180, 1],
  ['icon-maskable-512.png', 512, 0.78], // Inhalt in die sichere Zone verkleinert
];
const browser = await chromium.launch();
const page = await browser.newPage();
for (const [datei, px, skala] of ziele) {
  await page.setViewportSize({ width: px, height: px });
  await page.setContent(
    `<body style="margin:0;background:#7B1E2B;display:grid;place-items:center;width:${px}px;height:${px}px">` +
      `<div style="width:${px * skala}px;height:${px * skala}px">${svg.replace('<svg ', '<svg width="100%" height="100%" ')}</div></body>`,
  );
  await page.screenshot({ path: new URL(`../public/${datei}`, import.meta.url).pathname });
}
await browser.close();
