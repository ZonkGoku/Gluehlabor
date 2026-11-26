// „Mehr": alles, was nicht jeden Besucher betrifft. Hält die Hauptnavigation auf das Wesentliche (Start, Rangliste, Bewerten, Ich).
import { leseEinstellung } from '../daten/db';
import { t } from '../i18n';
import { Betreiber } from './bausteine';
import { useLive } from './hooks';
import { InstallKarte } from './InstallKarte';
import { Symbol } from './Symbol';

interface Punkt {
  href: string;
  symbol: string;
  titel: string;
  text: string;
}

export function Mehr() {
  const pruefstelle = useLive(() => leseEinstellung<boolean>('pruefstelle', false), [], false);
  const punkte: Punkt[] = [
    { href: '#/entdecken', symbol: 'uebersicht', titel: 'Entdecken', text: 'Karte, Top Deals, Preise und der Verlauf der Saison.' },
    { href: '#/schlittenfahren', symbol: 'ziel', titel: 'Schlittenfahren (Beta)', text: 'Wochenrennen für alle und Rennen mit Freunden: Jede Bewertung bringt deinen Schlitten weiter.' },
    { href: '#/spickzettel', symbol: 'spickzettel', titel: 'Hilfe & Regeln', text: 'So bewertest du: Regeln und was die Noten bedeuten.' },
    { href: '#/vergleich', symbol: 'vergleich', titel: 'Vergleich', text: 'Über die Jahre: welche Stände wieder dabei waren und welche Märkte noch fehlen.' },
    { href: '#/einstellungen', symbol: 'einstellungen', titel: 'Einstellungen', text: 'Sprache, Hell oder Dunkel.' },
    ...(pruefstelle ? [{ href: '#/statistik', symbol: 'statistik', titel: 'Statistik', text: 'Nutzen die Bewertenden die ganze Skala?' }] : []),
    ...(pruefstelle ? [{ href: '#/moderation', symbol: 'pokal', titel: 'Moderation', text: 'Meldungen, Bewertungen löschen, Stände pflegen.' }] : []),
  ];
  return (
    <div class="nm">
      <div class="mb-5 mt-2">
        <p class="etikett !text-gold-300">{t('Weitere Ansichten')}</p>
        <h1 class="mt-2 font-display text-[44px] uppercase leading-[1] tracking-wide text-eis sm:text-5xl">{t('Mehr')}</h1>
      </div>
      <div class="mb-4 empty:hidden">
        <InstallKarte />
      </div>
      <ul class="grid gap-3 md:grid-cols-2">
        {punkte.map((p) => (
          <li>
            <a href={p.href} class="glas flex min-h-[72px] items-center gap-4 rounded-3xl p-4 text-eis no-underline transition hover:shadow-glut">
              <span class="grid size-11 shrink-0 place-items-center rounded-2xl border border-rand bg-flaeche text-gold-300">
                <Symbol name={p.symbol} groesse={22} />
              </span>
              <span class="min-w-0 flex-1">
                <span class="block text-[17px] font-semibold">{t(p.titel)}</span>
                <span class="block text-sm text-dunst">{t(p.text)}</span>
              </span>
            </a>
          </li>
        ))}
      </ul>
      <p class="mt-5 flex flex-wrap gap-x-5 gap-y-1 text-sm">
        <a class="inline-block py-3 text-gold-300 no-underline hover:text-gold-400" href="#/impressum">
          {t('Impressum')}
        </a>
        <a class="inline-block py-3 text-gold-300 no-underline hover:text-gold-400" href="#/datenschutz">
          {t('Datenschutz')}
        </a>
      </p>
      <Betreiber />
    </div>
  );
}
