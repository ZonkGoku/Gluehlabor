// Erzeugt das Vorschaubild für geteilte Links (public/og.jpg, 1200 x 630): WhatsApp, iMessage, Instagram, Slack.
// Einmalig bzw. nach Änderung des Designs: node scripts/og.mjs
// Playwright kommt aus der Umgebung (wie bei scripts/icons.mjs), die Schriften aus node_modules.
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const { chromium } = createRequire(import.meta.url)('playwright');
const pfad = (p) => fileURLToPath(new URL(p, import.meta.url));
// Schriften als data-URL einbetten: von about:blank aus dürfen file://-Adressen nicht geladen werden.
const schrift = (name, datei) => `@font-face{font-family:'${name}';src:url(data:font/woff2;base64,${readFileSync(pfad(datei)).toString('base64')}) format('woff2')}`;
const logo = `data:image/png;base64,${readFileSync(pfad('../public/logo.png')).toString('base64')}`;

const html = `<!doctype html><meta charset="utf-8"><style>
${schrift('Anton', '../node_modules/@fontsource/anton/files/anton-latin-400-normal.woff2')}
${schrift('Plex', '../node_modules/@fontsource/ibm-plex-sans/files/ibm-plex-sans-latin-500-normal.woff2')}
${schrift('PlexMono', '../node_modules/@fontsource/ibm-plex-mono/files/ibm-plex-mono-latin-400-normal.woff2')}
*{box-sizing:border-box;margin:0}
body{width:1200px;height:630px;overflow:hidden;position:relative;color:#f4f1ff;font-family:Plex,sans-serif;
 background:
  radial-gradient(700px 420px at 92% -10%,rgba(240,52,79,.34),transparent 62%),
  radial-gradient(640px 460px at -6% 112%,rgba(255,138,61,.30),transparent 60%),
  radial-gradient(560px 400px at 50% 40%,rgba(40,56,140,.35),transparent 70%),
  linear-gradient(180deg,#060919,#0a1030 60%,#0b0d24)}
.licht{position:absolute;border-radius:50%}
svg.kabel{position:absolute;left:0;top:0;width:1200px;height:90px}
.links{position:absolute;left:72px;top:218px;width:600px}
.marke{font-family:PlexMono;letter-spacing:.2em;font-size:20px;color:#a3accb;text-transform:uppercase}
h1{font-family:Anton;font-weight:400;text-transform:uppercase;font-size:100px;line-height:.98;letter-spacing:.01em}
h1 em{font-style:normal;background:linear-gradient(180deg,#ffe29a,#ffa05c 55%,#f0344f);-webkit-background-clip:text;color:transparent}
p{margin-top:20px;font-size:27px;line-height:1.35;color:#c9cfe6;max-width:560px}
.url{position:absolute;left:72px;bottom:52px;font-family:PlexMono;font-size:26px;color:#ffc857;letter-spacing:.04em}
.karte{position:absolute;right:70px;top:96px;width:400px;height:438px;border-radius:40px;padding:30px 34px;
 background:linear-gradient(160deg,rgba(26,34,82,.95),rgba(10,15,40,.95));border:3px solid transparent;
 background-clip:padding-box;box-shadow:0 0 0 3px #ff8a3d,0 0 90px -10px rgba(255,138,61,.6);transform:rotate(3deg)}
.rang{font-family:Anton;font-size:84px;line-height:1;background:linear-gradient(180deg,#ffe29a,#f0344f);-webkit-background-clip:text;color:transparent}
.stempel{position:absolute;right:30px;top:38px;border:2px solid rgba(255,200,87,.8);color:#ffe29a;font-family:PlexMono;font-size:15px;letter-spacing:.16em;padding:6px 12px;border-radius:9px;transform:rotate(-3deg)}
.stand{font-family:Anton;font-size:46px;text-transform:uppercase;margin-top:6px;letter-spacing:.01em}
.note{font-family:Anton;font-size:178px;line-height:1;margin-top:10px;background:linear-gradient(180deg,#ffe29a,#ffa05c 52%,#f0344f);-webkit-background-clip:text;color:transparent;filter:drop-shadow(0 0 30px rgba(255,138,61,.55))}
.bal{height:12px;border-radius:6px;background:rgba(255,255,255,.12);margin-top:12px;overflow:hidden}
.bal i{display:block;height:100%;border-radius:6px;background:linear-gradient(90deg,#ffc857,#ff8a3d 60%,#f0344f)}
.siegel{position:absolute;left:72px;top:38px;width:150px;height:150px;border-radius:50%;box-shadow:0 0 0 3px rgba(255,138,61,.85),0 0 60px -4px rgba(240,52,79,.75)}
</style>
<svg class="kabel" viewBox="0 0 1200 90" preserveAspectRatio="none"><path d="M0 18 Q 150 70 300 28 T 600 36 T 900 28 T 1200 24" fill="none" stroke="rgba(255,255,255,.16)" stroke-width="2"/></svg>
${[[60, 40, 12, '#ffc857'], [210, 62, 9, '#ff8a3d'], [380, 32, 13, '#f0344f'], [560, 54, 9, '#ffe29a'], [740, 38, 12, '#ff8a3d'], [900, 56, 9, '#ffc857'], [1060, 30, 13, '#f0344f'], [1160, 52, 9, '#ffe29a']]
  .map(([x, y, r, f]) => `<span class="licht" style="left:${x}px;top:${y}px;width:${r}px;height:${r}px;background:${f};box-shadow:0 0 ${r * 4}px ${r}px ${f}66"></span>`)
  .join('')}
<img class="siegel" src="${logo}" alt="">
<div class="marke" style="position:absolute;left:250px;top:96px">Prüfstelle für Glühwein</div>
<div class="links">
  
  <h1>Wer glüht<br><em>am besten?</em></h1>
  <p>Bewerte Glühwein auf Weihnachtsmärkten. Ohne Konto, mit Rangliste und Ticket.</p>
</div>
<div class="url">gluehlabor.de</div>
<div class="karte">
  <span class="stempel">PRÜFSTELLE</span>
  <div class="rang">01</div>
  <div class="stand">Chrom</div>
  <div class="note">6.33</div>
  <div class="bal"><i style="width:66%"></i></div><div class="bal"><i style="width:60%"></i></div>
</div>`;

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1200, height: 630 } });
await page.setContent(html);
await page.evaluate(() => document.fonts.ready);
await page.waitForTimeout(400);
// JPEG statt PNG: WhatsApp zeigt Vorschaubilder nur bis etwa 300 KB an.
await page.screenshot({ path: pfad('../public/og.jpg'), type: 'jpeg', quality: 82 });
await browser.close();
console.log('public/og.jpg geschrieben');
