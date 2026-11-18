// App-Gerüst „Night Market": Nachthimmel, schwebender Kopf, Inhalt, schwebende Navigation unten (auch am Rechner).
import type { ComponentChildren } from 'preact';
import { MARKE } from '../marke';
import { useMeineAnzahl } from './daten';
import { Hintergrund } from './nacht/Hintergrund';
import { Navigation } from './nacht/Navigation';
import { Symbol } from './Symbol';
import { SyncAnzeige } from './SyncAnzeige';

const ICONKNOPF =
  'glas grid size-10 place-items-center rounded-full text-dunst no-underline transition duration-200 hover:text-gold-300 hover:shadow-glut';

export function Geruest({ route, children }: { route: string; children: ComponentChildren }) {
  const darf = useMeineAnzahl() > 0; // Sync-Status erst zeigen, wenn von diesem Gerät etwas erfasst wurde
  return (
    <div class="relative min-h-dvh font-sans text-eis">
      <Hintergrund />

      <header
        class="nm sticky top-0 z-30 flex items-center gap-3 px-4 pb-2"
        style={{ paddingTop: 'calc(env(safe-area-inset-top) + 12px)' }}
      >
        <a href="#/" class="flex items-center gap-2.5 text-eis no-underline" aria-label={`${MARKE.name}, zur Übersicht`}>
          <img src="./icon.svg" alt="" class="size-9 rounded-xl shadow-[0_0_24px_-4px_rgb(240_52_79/0.7)]" />
          <span class="flex flex-col leading-none">
            <span class="font-display text-[22px] uppercase tracking-wider">{MARKE.name}</span>
            <span class="etikett mt-1 !text-[9.5px]">Bayern × Hamburg</span>
          </span>
        </a>
        <span class="flex-1" />
        {darf && <SyncAnzeige />}
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

      <main class="inhalt">{children}</main>

      <Navigation route={route} />
    </div>
  );
}
