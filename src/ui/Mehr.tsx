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
  text?: string;
}

function Gruppe({ titel, punkte }: { titel: string; punkte: Punkt[] }) {
  return (
    <section class="mb-5" aria-label={t(titel)}>
      <h2 class="etikett mb-2 !text-gold-300">{t(titel)}</h2>
      <ul class="glas divide-y divide-[var(--nm-rand)] overflow-hidden rounded-3xl">
        {punkte.map((p) => (
          <li>
            <a href={p.href} class="flex min-h-[56px] items-center gap-3.5 px-4 py-2.5 text-eis no-underline transition hover:bg-flaeche-hover">
              <span class="grid size-9 shrink-0 place-items-center rounded-xl border border-rand bg-flaeche text-gold-300">
                <Symbol name={p.symbol} groesse={20} />
              </span>
              <span class="min-w-0 flex-1">
                <span class="block text-[16px] font-semibold">{t(p.titel)}</span>
                {p.text && <span class="block text-[13px] leading-snug text-dunst">{t(p.text)}</span>}
              </span>
              <span aria-hidden="true" class="text-dunst">›</span>
            </a>
          </li>
        ))}
      </ul>
    </section>
  );
}

export function Mehr() {
  const pruefstelle = useLive(() => leseEinstellung<boolean>('pruefstelle', false), [], false);
  return (
    <div class="nm">
      <div class="mb-5 mt-2">
        <h1 class="font-display text-[44px] uppercase leading-[1] tracking-wide text-eis sm:text-5xl">{t('Mehr')}</h1>
      </div>
      <div class="mb-4 empty:hidden">
        <InstallKarte />
      </div>
      <Gruppe
        titel="Entdecken"
        punkte={[
          { href: '#/entdecken', symbol: 'uebersicht', titel: 'Karte und Zahlen', text: 'Wo bewertet wurde, Top Deals, Preise.' },
          { href: '#/fotos', symbol: 'kamera', titel: 'Fotos', text: 'Von der Community.' },
          { href: '#/schlittenfahren', symbol: 'ziel', titel: 'Schlittenfahren (Beta)', text: 'Rennen mit Freunden: jede Bewertung ein Schritt.' },
        ]}
      />
      <Gruppe
        titel="Hilfe und Einstellungen"
        punkte={[
          { href: '#/spickzettel', symbol: 'spickzettel', titel: 'Hilfe & Regeln' },
          { href: '#/einstellungen', symbol: 'einstellungen', titel: 'Einstellungen', text: 'Sprache, Hell oder Dunkel.' },
        ]}
      />
      {pruefstelle && (
        <Gruppe
          titel="Prüfstelle"
          punkte={[
            { href: '#/moderation', symbol: 'pokal', titel: 'Moderation', text: 'Meldungen, Stände pflegen, Bewertungen löschen.' },
            { href: '#/statistik', symbol: 'statistik', titel: 'Statistik' },
          ]}
        />
      )}
      <Betreiber />
    </div>
  );
}
