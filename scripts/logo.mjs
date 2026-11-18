// Erzeugt aus dem Original-Logo (assets/logo-original.jpeg: Linien-Zeichnung auf dunklem Kreis, weißer Grund) alle Logo-Dateien
// im Look der App: Die Linien werden aus dem Bild herausgelöst (die weichen Schleier des JPEGs fallen weg), kräftiger gezeichnet
// und in den Farben der Lichterkette (Gold, Glut, Glühwein-Rot) gefärbt; Schrift und Dampf bleiben weiß. Dahinter liegt der
// Nachthimmel der App, ein dünner Lichtring fasst den Kreis ein. Für kleine Größen werden die Linien dicker gezeichnet.
//
//   public/logo.png           512 px, rund mit transparenten Ecken (Seitenleiste, Story-Bild, Vorschaubild)
//   public/logo-klein.png     128 px, Linien verstärkt (Kopf der App)
//   public/favicon.png        64 px, Linien stark verstärkt
//   public/icon-192.png, icon-512.png, icon-maskable-512.png, apple-touch-icon.png   App-Symbole (dunkles Quadrat)
//
// Aufruf: node scripts/logo.mjs   (Playwright kommt aus der Umgebung, wie bei scripts/og.mjs)
import { readFileSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const { chromium } = createRequire(import.meta.url)('playwright');
const pfad = (p) => fileURLToPath(new URL(p, import.meta.url));
const quelle = `data:image/jpeg;base64,${readFileSync(pfad('../assets/logo-original.jpeg')).toString('base64')}`;

// verstaerkung: wie stark die Linien für diese Größe angehoben werden; quadrat: dunkles Quadrat statt transparenter Ecken
const ziele = [
  { datei: 'logo.png', px: 512, verstaerkung: 1.25 },
  { datei: 'logo-klein.png', px: 128, verstaerkung: 2.3 },
  { datei: 'favicon.png', px: 64, verstaerkung: 3.2 },
  { datei: 'icon-192.png', px: 192, verstaerkung: 1.8, quadrat: true, skala: 1 },
  { datei: 'icon-512.png', px: 512, verstaerkung: 1.25, quadrat: true, skala: 1 },
  { datei: 'icon-maskable-512.png', px: 512, verstaerkung: 1.25, quadrat: true, skala: 0.74 },
  { datei: 'apple-touch-icon.png', px: 180, verstaerkung: 1.8, quadrat: true, skala: 1 },
];

const browser = await chromium.launch();
const seite = await browser.newPage();
await seite.setContent('<body></body>');
const ergebnisse = await seite.evaluate(
  async ({ quelle, ziele }) => {
    const N = 2048;
    const bild = new Image();
    bild.src = quelle;
    await bild.decode();
    const leinwand = (b, h = b) => Object.assign(document.createElement('canvas'), { width: b, height: h });

    // ── 1. Linien herauslösen ──
    const c0 = leinwand(N);
    const g0 = c0.getContext('2d', { willReadFrequently: true });
    g0.drawImage(bild, 0, 0, N, N);
    const px = g0.getImageData(0, 0, N, N).data;
    const BG = [10, 29, 43];
    const R = N / 2 - N * 0.012; // außerhalb des Kreises (weißer Grund, JPEG-Saum) zählt nichts
    const abstand = new Uint8ClampedArray(N * N);
    const weiss = new Uint8Array(N * N);
    for (let y = 0; y < N; y++) {
      for (let x = 0; x < N; x++) {
        const i = y * N + x;
        if ((x - N / 2) ** 2 + (y - N / 2) ** 2 > R * R) continue;
        const r = px[i * 4], g = px[i * 4 + 1], b = px[i * 4 + 2];
        abstand[i] = Math.min(255, Math.hypot(r - BG[0], g - BG[1], b - BG[2]));
        const mn = Math.min(r, g, b), mx = Math.max(r, g, b);
        weiss[i] = mn > 85 && mx - mn < 80 ? 1 : 0;
      }
    }
    // Weiche Schleier (Unschärfe des JPEGs) entfernen: nur was schärfer ist als die Umgebung bleibt Linie
    const c1 = leinwand(N);
    const g1 = c1.getContext('2d', { willReadFrequently: true });
    const d1 = g1.createImageData(N, N);
    for (let i = 0; i < N * N; i++) {
      d1.data[i * 4] = d1.data[i * 4 + 1] = d1.data[i * 4 + 2] = abstand[i];
      d1.data[i * 4 + 3] = 255;
    }
    g1.putImageData(d1, 0, 0);
    const c2 = leinwand(N);
    const g2 = c2.getContext('2d', { willReadFrequently: true });
    g2.filter = 'blur(14px)';
    g2.drawImage(c1, 0, 0);
    const weich = g2.getImageData(0, 0, N, N).data;
    // Ergebnis: zwei Masken (Linie warm / Linie weiß) als Kanäle R und G einer Leinwand
    const masken = leinwand(N);
    const gm = masken.getContext('2d', { willReadFrequently: true });
    const dm = gm.createImageData(N, N);
    for (let i = 0; i < N * N; i++) {
      const detail = abstand[i] - weich[i * 4] * 0.9;
      const a = Math.min(1, Math.max(0, (detail - 8) / 55)) ** 0.72;
      const v = Math.round(a * 255);
      if (weiss[i]) dm.data[i * 4 + 1] = v;
      else dm.data[i * 4] = v;
      dm.data[i * 4 + 3] = 255;
    }
    gm.putImageData(dm, 0, 0);
    // Gepunktete Linien (Rauschen des JPEGs in den blassen Mützenlinien) schließen: leicht verwischen und die Lücken füllen
    const weichM = leinwand(N);
    const gw = weichM.getContext('2d', { willReadFrequently: true });
    gw.filter = 'blur(3.5px)';
    gw.drawImage(masken, 0, 0);
    const wm = gw.getImageData(0, 0, N, N).data;
    const dm2 = gm.getImageData(0, 0, N, N);
    for (let i = 0; i < N * N; i++) {
      for (let k = 0; k < 2; k++) dm2.data[i * 4 + k] = Math.max(dm2.data[i * 4 + k], Math.min(255, wm[i * 4 + k] * 2.6));
    }
    gm.putImageData(dm2, 0, 0);

    // ── 2. je Größe zeichnen ──
    const farbe = (t) => {
      // Gold → Glut → Glühwein-Rot, wie die Zahlen und Rahmen der App
      const stops = [[255, 200, 87], [255, 138, 61], [240, 52, 79]];
      const s = Math.min(1, Math.max(0, t)) * 2;
      const k = Math.min(1, Math.floor(s));
      const f = s - k;
      return stops[k].map((v, j) => v + (stops[k + 1][j] - v) * f);
    };
    const aus = [];
    for (const z of ziele) {
      const S = z.px;
      const c = leinwand(S);
      const g = c.getContext('2d', { willReadFrequently: true });
      g.imageSmoothingQuality = 'high';
      const d = S * (z.skala ?? 1);
      const off = (S - d) / 2;
      if (z.quadrat) {
        g.fillStyle = '#070b1a';
        g.fillRect(0, 0, S, S);
      }
      // Nachthimmel im Kreis
      const mitte = S / 2;
      const hg = g.createRadialGradient(mitte, off + d * 0.38, 0, mitte, mitte, d / 2);
      hg.addColorStop(0, '#18235e');
      hg.addColorStop(0.65, '#0d1438');
      hg.addColorStop(1, '#070b1f');
      g.fillStyle = hg;
      g.beginPath();
      g.arc(mitte, mitte, d / 2, 0, Math.PI * 2);
      g.fill();
      // Masken auf Zielgröße (Kreisfläche), mit Verstärkung
      const ms = leinwand(Math.round(d));
      const gs = ms.getContext('2d', { willReadFrequently: true });
      gs.imageSmoothingQuality = 'high';
      const rand = N * 0.012;
      gs.drawImage(masken, rand, rand, N - 2 * rand, N - 2 * rand, 0, 0, ms.width, ms.height);
      const m = gs.getImageData(0, 0, ms.width, ms.height);
      const W = ms.width;
      const lin = new Float32Array(W * W * 2);
      for (let i = 0; i < W * W; i++) {
        lin[i * 2] = Math.min(1, (m.data[i * 4] / 255) * z.verstaerkung);
        lin[i * 2 + 1] = Math.min(1, (m.data[i * 4 + 1] / 255) * z.verstaerkung);
      }
      // etwas dicker für kleine Größen: Nachbarn mitnehmen
      const dick = z.verstaerkung > 1.5 ? 0.55 : z.verstaerkung > 1.2 ? 0.25 : 0;
      const lin2 = dick ? new Float32Array(lin) : lin;
      if (dick) {
        for (let y = 1; y < W - 1; y++) {
          for (let x = 1; x < W - 1; x++) {
            for (let k = 0; k < 2; k++) {
              const i = (y * W + x) * 2 + k;
              const nachbar = Math.max(lin[i - 2], lin[i + 2], lin[i - W * 2], lin[i + W * 2]);
              lin2[i] = Math.min(1, Math.max(lin[i], nachbar * dick * 1.4));
            }
          }
        }
      }
      const ebene = g.getImageData(0, 0, S, S);
      const ox = Math.round(off);
      for (let y = 0; y < W; y++) {
        for (let x = 0; x < W; x++) {
          const a = lin2[(y * W + x) * 2];
          const w = lin2[(y * W + x) * 2 + 1];
          if (a < 0.01 && w < 0.01) continue;
          const i = ((y + ox) * S + (x + ox)) * 4;
          const [fr, fg, fb] = farbe((x + y) / (2 * W));
          let r = ebene.data[i], gg = ebene.data[i + 1], b = ebene.data[i + 2];
          r += (fr - r) * a; gg += (fg - gg) * a; b += (fb - b) * a;
          r += (244 - r) * w; gg += (241 - gg) * w; b += (255 - b) * w;
          ebene.data[i] = r; ebene.data[i + 1] = gg; ebene.data[i + 2] = b;
        }
      }
      g.putImageData(ebene, 0, 0);
      // Lichtring: dünn, Gold → Glut → Rot
      const lw = Math.max(1.5, d * 0.02);
      const rg = g.createLinearGradient(off, off, off + d, off + d);
      rg.addColorStop(0, '#ffc857');
      rg.addColorStop(0.5, '#ff8a3d');
      rg.addColorStop(1, '#f0344f');
      g.strokeStyle = rg;
      g.lineWidth = lw;
      g.beginPath();
      g.arc(mitte, mitte, d / 2 - lw / 2, 0, Math.PI * 2);
      g.stroke();
      aus.push(c.toDataURL('image/png'));
    }
    return aus;
  },
  { quelle, ziele },
);
ziele.forEach((z, i) => {
  writeFileSync(pfad(`../public/${z.datei}`), Buffer.from(ergebnisse[i].split(',')[1], 'base64'));
  console.log(z.datei, z.px);
});
await browser.close();
