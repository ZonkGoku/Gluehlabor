// App-Gerüst „Night Market": Himmel, Inhalt und Menü. Am Telefon immer die schwebende Leiste unten; am Rechner wahlweise
// Seitenleiste (Standard) oder dieselbe schwebende Leiste (Einstellungen oder Schalter im Kopf).
import type { ComponentChildren } from 'preact';
import { useMedia, useMenue } from '../daten/darstellung';
import { MARKE } from '../marke';
import { useMeineAnzahl } from './daten';
import { ICONKNOPF, MenueKnopf, SpracheKnopf, ThemeKnopf } from './nacht/DarstellungKnoepfe';
import { Hintergrund } from './nacht/Hintergrund';
import { Navigation } from './nacht/Navigation';
import { LogoMarke, Wortmarke } from './nacht/Logo';
import { Lichterkette } from './nacht/Lichterkette';
import { Seitenleiste } from './nacht/Seitenleiste';
import { Symbol } from './Symbol';
import { SyncAnzeige } from './SyncAnzeige';
import { t } from '../i18n';

export function Geruest({ route, children }: { route: string; children: ComponentChildren }) {
  const darf = useMeineAnzahl() > 0; // Sync-Status erst zeigen, wenn von diesem Gerät etwas erfasst wurde
  const breit = useMedia('(min-width: 900px)');
  const seitenleiste = breit && useMenue() === 'seitenleiste';
  return (
    <div class={`relative min-h-dvh font-sans text-eis ${seitenleiste ? 'pl-[276px]' : ''}`}>
      <Hintergrund />

      {seitenleiste ? (
        <>
          <Lichterkette fest />
          <Seitenleiste route={route} zeigeSync={darf} />
        </>
      ) : (
        <>
          <header
            class="nm sticky top-0 z-30 flex items-center gap-3 border-b border-rand px-4 pb-3 backdrop-blur-xl"
            style={{ paddingTop: 'calc(env(safe-area-inset-top) + 12px)', background: 'light-dark(rgb(251 246 242 / 0.88), rgb(7 11 26 / 0.86))' }}
          >
            <Lichterkette />
            <a href="#/" class="flex items-center gap-2.5 text-eis" aria-label={t('{name}, zur Übersicht', { name: MARKE.name })}>
              <LogoMarke groesse={42} strich={4} />
              <Wortmarke taglineKlasse="hidden min-[470px]:block" />
            </a>
            <span class="flex-1" />
            {darf && <SyncAnzeige />}
            {breit && <SpracheKnopf />}
            {breit && <MenueKnopf />}
            <ThemeKnopf />
            <a class={ICONKNOPF} href="#/spickzettel" aria-label={t('Hilfe & Regeln')}>
              <Symbol name="spickzettel" groesse={20} />
            </a>
          </header>
          <Navigation route={route} />
        </>
      )}

      <main class="inhalt">{children}</main>
    </div>
  );
}
