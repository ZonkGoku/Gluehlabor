import preact from '@preact/preset-vite';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { defineConfig, type Plugin } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

const DATA = resolve(__dirname, 'data');

/** Liest alle synchronisierten Einträge aus data/eintraege/*.json. */
function sammleEintraege(): unknown[] {
  const dir = join(DATA, 'eintraege');
  if (!existsSync(dir)) return [];
  return readdirSync(dir)
    .filter((f) => f.endsWith('.json'))
    .map((f) => JSON.parse(readFileSync(join(dir, f), 'utf8')))
    .sort((a, b) => (a.erstelltAm ?? 0) - (b.erstelltAm ?? 0));
}

function fotos(): string[] {
  const dir = join(DATA, 'fotos');
  return existsSync(dir) ? readdirSync(dir).filter((f) => /\.(jpe?g|png|webp)$/i.test(f)) : [];
}

/**
 * Veröffentlicht den Datenbestand neben der App:
 *   daten/eintraege.json  – alle Einträge aus data/eintraege/
 *   daten/fotos/*         – alle Fotos aus data/fotos/
 * Im Dev-Server werden dieselben Pfade live ausgeliefert.
 */
function datenbestand(): Plugin {
  return {
    name: 'becherwerk-datenbestand',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const url = (req.url ?? '').split('?')[0];
        if (url.endsWith('/daten/eintraege.json')) {
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify(sammleEintraege()));
          return;
        }
        const m = url.match(/\/daten\/fotos\/([^/]+)$/);
        if (m && fotos().includes(m[1])) {
          res.setHeader('Content-Type', 'image/jpeg');
          res.end(readFileSync(join(DATA, 'fotos', m[1])));
          return;
        }
        next();
      });
    },
    generateBundle() {
      this.emitFile({ type: 'asset', fileName: 'daten/eintraege.json', source: JSON.stringify(sammleEintraege()) });
      for (const f of fotos()) {
        this.emitFile({ type: 'asset', fileName: `daten/fotos/${f}`, source: readFileSync(join(DATA, 'fotos', f)) });
      }
    },
  };
}

export default defineConfig({
  // Relativer base-Pfad: Die App läuft unter https://<user>.github.io/<Repo>/
  // ohne dass der Repo-Name (inkl. Groß-/Kleinschreibung) hier stehen muss.
  // Zusammen mit dem Hash-Router gibt es keine weiße Seite durch falsche Pfade.
  base: './',
  plugins: [
    preact(),
    datenbestand(),
    VitePWA({
      // „prompt": Der neue Service Worker wartet, bis src/daten/update.ts ihn freigibt,
      // nämlich sofort, außer während der Erfassung.
      registerType: 'prompt',
      injectRegister: null,
      includeAssets: ['icon.svg', 'logo.svg', 'apple-touch-icon.png'],
      manifest: {
        name: 'Becherwerk',
        short_name: 'Becherwerk',
        description: 'Prüfstelle für Glühwein auf Weihnachtsmärkten in ganz Deutschland – von David (Bayern) und Philip (Hamburg)',
        lang: 'de',
        start_url: './#/',
        scope: './',
        display: 'standalone',
        orientation: 'portrait',
        theme_color: '#7B1E2B',
        background_color: '#17100F',
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,woff2}'],
        navigateFallbackDenylist: [/\/daten\//],
        runtimeCaching: [
          {
            urlPattern: /\/daten\/eintraege\.json$/,
            handler: 'NetworkFirst',
            options: { cacheName: 'datenbestand', networkTimeoutSeconds: 5 },
          },
          {
            urlPattern: /\/daten\/fotos\//,
            handler: 'CacheFirst',
            options: { cacheName: 'fotos', expiration: { maxEntries: 500 } },
          },
        ],
      },
    }),
  ],
});
