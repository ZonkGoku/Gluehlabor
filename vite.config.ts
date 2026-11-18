import preact from '@preact/preset-vite';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  // Relativer base-Pfad: Die App läuft unter https://<user>.github.io/<Repo>/
  // ohne dass der Repo-Name (inkl. Groß-/Kleinschreibung) hier stehen muss.
  // Zusammen mit dem Hash-Router gibt es keine weiße Seite durch falsche Pfade.
  base: './',
  plugins: [
    preact(),
    tailwindcss(),
    VitePWA({
      // „prompt": Der neue Service Worker wartet, bis src/daten/update.ts ihn freigibt,
      // nämlich sofort, außer während der Erfassung.
      registerType: 'prompt',
      injectRegister: null,
      includeAssets: ['logo.png', 'logo-klein.png', 'favicon.png', 'apple-touch-icon.png'],
      manifest: {
        name: 'Glühlabor',
        short_name: 'Glühlabor',
        description: 'Prüfstelle für Glühwein auf Weihnachtsmärkten in ganz Deutschland – von David (Bayern) und Philip (Hamburg)',
        lang: 'de',
        start_url: './#/',
        scope: './',
        display: 'standalone',
        orientation: 'portrait',
        theme_color: '#070B1A',
        background_color: '#070B1A',
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,woff2}'],
      },
    }),
  ],
});
