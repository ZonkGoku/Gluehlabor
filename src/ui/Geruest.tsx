// App-Gerüst „Night Market": Himmel, Inhalt und Menü. Am Telefon immer die schwebende Leiste unten; am Rechner wahlweise
// Seitenleiste (Standard) oder dieselbe schwebende Leiste (Einstellungen oder Schalter im Kopf).
import type { ComponentChildren } from 'preact';
import { useMedia, useMenue } from '../daten/darstellung';
import { MARKE } from '../marke';
import { useMeineAnzahl } from './daten';
import { RennenLeiste } from './schlitten/RennenLeiste';
import { SyncProblem } from './SyncProblem';
import { ICONKNOPF, MenueKnopf, SpracheKnopf, ThemeKnopf } from './nacht/DarstellungKnoepfe';
import { Hintergrund } from './nacht/Hintergrund';
import { Navigation } from './nacht/Navigation';
import { LogoMarke, Wortmarke } from './nacht/Logo';
import { Lichterkette } from './nacht/Lichterkette';
import { Seitenleiste } from './nacht/Seitenleiste';
import { Symbol } from './Symbol';
import { SyncAnzeige } from './SyncAnzeige';
import { t } from '../i18n';

/** `ohneNavigation`: nur der Kopf (Logo führt immer zur Startseite), keine schwebende Leiste unten, z. B. beim Bewerten, wo unten „Speichern" sitzt. */
export function Geruest({ route, children, ohneNavigation = false }: { route: string; children: ComponentChildren; ohneNavigation?: boolean }) {
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
            class="nm sticky top-0 z-30 flex items-center gap-2 border-b min-[420px]:gap-3 border-rand px-4 pb-3 backdrop-blur-xl"
            style={{ paddingTop: 'calc(env(safe-area-inset-top) + 12px)', background: 'light-dark(rgb(251 246 242 / 0.88), rgb(7 11 26 / 0.86))' }}
          >
            <Lichterkette />
            <a href="#/" class="flex items-center gap-2.5 text-eis" aria-label={t('{name}, zur Übersicht', { name: MARKE.name })}>
              <LogoMarke groesse={42} strich={4} />
              <Wortmarke klasse="max-[339px]:hidden" taglineKlasse="hidden min-[470px]:block" />
            </a>
            <span class="flex-1" />
            {darf && <SyncAnzeige />}
            <SpracheKnopf />
            {breit && <MenueKnopf />}
            <ThemeKnopf />
            {/* Wer schon bewertet hat, kommt von überall mit einem Tipp zu seinen Bewertungen. Am Telefon ersetzt das Symbol die Hilfe (die steht unter „Mehr“). */}
            {darf && (
              <a class={ICONKNOPF} href="#/meine" aria-label={t('Meine Bewertungen')} aria-current={route === 'meine' ? 'page' : undefined} title={t('Meine Bewertungen')}>
                <Symbol name="rangliste" groesse={20} />
              </a>
            )}
            {(!darf || breit) && (
              <a class={ICONKNOPF} href="#/spickzettel" aria-label={t('Hilfe & Regeln')}>
                <Symbol name="spickzettel" groesse={20} />
              </a>
            )}
          </header>
          {!ohneNavigation && <Navigation route={route} />}
        </>
      )}

      <RennenLeiste route={route} />
      <SyncProblem />
      <main class={`inhalt${ohneNavigation ? ' inhalt-schmal' : ''}`}>{children}</main>
    </div>
  );
}
