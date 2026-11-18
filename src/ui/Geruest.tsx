// App-Gerüst „Night Market": Himmel, Inhalt und Menü. Am Telefon immer die schwebende Leiste unten; am Rechner wahlweise
// Seitenleiste (Standard) oder dieselbe schwebende Leiste (Einstellungen oder Schalter im Kopf).
import type { ComponentChildren } from 'preact';
import { useMedia, useMenue } from '../daten/darstellung';
import { MARKE } from '../marke';
import { useMeineAnzahl } from './daten';
import { ICONKNOPF, MenueKnopf, ThemeKnopf } from './nacht/DarstellungKnoepfe';
import { Hintergrund } from './nacht/Hintergrund';
import { Navigation } from './nacht/Navigation';
import { Seitenleiste } from './nacht/Seitenleiste';
import { Symbol } from './Symbol';
import { SyncAnzeige } from './SyncAnzeige';

export function Geruest({ route, children }: { route: string; children: ComponentChildren }) {
  const darf = useMeineAnzahl() > 0; // Sync-Status erst zeigen, wenn von diesem Gerät etwas erfasst wurde
  const breit = useMedia('(min-width: 900px)');
  const seitenleiste = breit && useMenue() === 'seitenleiste';
  return (
    <div class={`relative min-h-dvh font-sans text-eis ${seitenleiste ? 'pl-[276px]' : ''}`}>
      <Hintergrund />

      {seitenleiste ? (
        <Seitenleiste route={route} zeigeSync={darf} />
      ) : (
        <>
          <header class="nm sticky top-0 z-30 flex items-center gap-3 px-4 pb-2" style={{ paddingTop: 'calc(env(safe-area-inset-top) + 12px)' }}>
            <a href="#/" class="flex items-center gap-2.5 text-eis" aria-label={`${MARKE.name}, zur Übersicht`}>
              <img src="./logo.png" alt="" class="size-10 rounded-full" />
              <span class="flex flex-col leading-none">
                <span class="font-display text-[22px] uppercase tracking-wider">{MARKE.name}</span>
                <span class="etikett mt-1 hidden whitespace-nowrap !text-[9.5px] min-[440px]:block">Bayern × Hamburg</span>
              </span>
            </a>
            <span class="flex-1" />
            {darf && <SyncAnzeige />}
            {breit && <MenueKnopf />}
            <ThemeKnopf />
            <a class={ICONKNOPF} href="#/spickzettel" aria-label="Spickzettel">
              <Symbol name="spickzettel" groesse={20} />
            </a>
            <a class={ICONKNOPF} href="#/profil" aria-label="Profil">
              <Symbol name="profil" groesse={20} />
            </a>
            <a class={ICONKNOPF} href="#/einstellungen" aria-label="Einstellungen">
              <Symbol name="einstellungen" groesse={20} />
            </a>
          </header>
          <Navigation route={route} />
        </>
      )}

      <main class="inhalt">{children}</main>
    </div>
  );
}
