// „Entdecken": alles, was die Startseite nicht tragen muss. Zahlen, Karte, Top Deals, Preise, Saisonverlauf.
import { saisons, filtere } from '../lib/auswertung';
import { euro } from '../lib/format';
import { staedte } from '../lib/orte';
import { preisindex } from '../lib/preisindex';
import { baueStaende } from '../lib/staende';
import { gesamtZahlen, saisonVerlauf } from '../lib/startseite';
import { Betreiber } from './bausteine';
import { Deutschlandkarte } from './Deutschlandkarte';
import { useEintraege, useGewichte, useSaison } from './daten';
import { abendDatum } from '../lib/abend';
import { Chips } from './nacht/Chips';
import { Kachel, Kennzahl } from './nacht/Kachel';
import { useEinblenden } from './nacht/bewegung';
import { DealZeile } from './nacht/StandKarten';
import { Saisonverlauf } from './Saisonverlauf';
import { MARKTLISTE } from './stammdaten';
import { t } from '../i18n';

export function Entdecken() {
  const alle = useEintraege();
  const gewichte = useGewichte();
  const [saison, setSaison] = useSaison(alle);
  const raster = useEinblenden<HTMLDivElement>();
  if (!alle) return null;

  const jetzt = new Date();
  const heute = abendDatum(jetzt);
  const jahre = [...new Set([...saisons(alle), jetzt.getFullYear()])].sort();
  const auswahl = filtere(alle, { saison, markt: 'alle' });
  const k = gesamtZahlen(auswahl, MARKTLISTE);
  const orte = staedte(MARKTLISTE, auswahl);
  const preise = preisindex(auswahl, MARKTLISTE);
  const staende = baueStaende(auswahl, MARKTLISTE, gewichte);
  const topDeals = staende.filter((s) => s.deal.punkte !== null).sort((a, b) => (a.deal.rang ?? 1e9) - (b.deal.rang ?? 1e9)).slice(0, 3);
  const verlauf = typeof saison === 'number' ? saisonVerlauf(alle, saison, gewichte, heute) : null;

  return (
    <div class="nm">
      <div class="mb-5 mt-2">
        <p class="etikett !text-gold-300">{t('Mehr entdecken')}</p>
        <h1 class="mt-2 font-display text-[44px] uppercase leading-[1] tracking-wide text-eis sm:text-5xl">{t('Entdecken')}</h1>
        <div class="mt-4">
          <Chips optionen={['alle', ...jahre] as const} wert={saison} onWahl={setSaison} beschriftung={t('Saison')} label={(o) => (o === 'alle' ? t('Alle') : String(o))} />
        </div>
      </div>

      <div ref={raster} class="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Kennzahl wert={k.staende} label={t('Stände')} />
        <Kennzahl wert={k.maerkte} label={t('Märkte')} />
        <Kennzahl wert={k.staedte} label={k.staedte === 1 ? t('Stadt') : t('Städte')} />
        <Kennzahl wert={k.bewertungen} label={t('Bewertungen')} />

        <Kachel titel={t('Wo ihr wart')} link={{ href: '#/vergleich', text: t('Alle Märkte') }} klasse="col-span-2">
          <Deutschlandkarte staedte={orte} />
        </Kachel>

        <Kachel titel={t('Top Deals')} link={{ href: '#/rangliste?deals=1', text: t('Alle Deals') }} klasse="col-span-2" innen="p-3">
          {topDeals.length === 0 ? (
            <p class="px-1 py-2 text-sm text-dunst">{t('Sobald Preise gemeldet sind, erscheinen hier die besten Deals.')}</p>
          ) : (
            <ol class="space-y-2">
              {topDeals.map((s) => (
                <li>
                  <DealZeile stand={s} />
                </li>
              ))}
            </ol>
          )}
        </Kachel>

        <Kachel titel={t('Glühwein-Preise')} klasse="col-span-2 md:col-span-4">
          {preise.zeilen.length === 0 ? (
            <p class="text-sm text-dunst">
              {preise.meldungen === 0
                ? t('Noch keine Preise gemeldet.')
                : t('{n} von {schwelle} Preismeldungen.', { n: preise.meldungen, schwelle: preise.schwelle })}
            </p>
          ) : (
            <>
              <ul class="space-y-2">
                {preise.zeilen.slice(0, 6).map((p) => (
                  <li
                    class="flex items-center gap-3 rounded-2xl border border-rand bg-flaeche px-3.5 py-2.5"
                    title={t('{stadt}: Median {median}, Mittel {mittel}, {min} bis {max}, {n} Meldungen', { stadt: p.stadt, median: euro(p.median), mittel: euro(p.mittel), min: euro(p.min), max: euro(p.max), n: p.n })}
                  >
                    <span class="flex-1 font-semibold">{p.stadt}</span>
                    <span class="font-mono text-xs text-dunst">
                      {euro(p.min)} – {euro(p.max)} · {p.n}×
                    </span>
                    <span class="shrink-0 whitespace-nowrap font-display text-2xl leading-none text-gold-300">{euro(p.median)}</span>
                  </li>
                ))}
              </ul>
              <p class="mt-3 text-xs text-dunst">{t('Median je Tasse.')}</p>
            </>
          )}
        </Kachel>

        {verlauf && (
          <Kachel titel={t('Saisonverlauf · Bewertungen je Abend')} klasse="col-span-2 md:col-span-4">
            <Saisonverlauf verlauf={verlauf} saison={saison as number} />
          </Kachel>
        )}
      </div>
      <Betreiber />
    </div>
  );
}
