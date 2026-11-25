// Rangliste „Night Market": die ersten drei als Sammelkarten zum Wischen, danach die Liste.
import { useState } from 'preact/hooks';
import { filtere, saisons } from '../lib/auswertung';
import { baueStaende, type Quelle } from '../lib/staende';
import { KRITERIEN } from '../lib/modell';
import { stadtVon } from '../lib/orte';
import { Betreiber } from './bausteine';
import { useAktuell } from './hooks';
import { useEintraege, useGewichte, useSaison } from './daten';
import { GewichteEditor } from './GewichteEditor';
import { useEinblenden } from './nacht/bewegung';
import { Chips } from './nacht/Chips';
import { PruefSiegel } from './nacht/PruefSiegel';
import { DealZeile, StandTopKarte, StandZeile } from './nacht/StandKarten';
import { MARKTLISTE } from './stammdaten';
import { Symbol } from './Symbol';
import { t, tn } from '../i18n';

const FELD =
  'glas min-h-[44px] appearance-none rounded-full bg-no-repeat py-2.5 pl-4 pr-9 text-sm text-eis outline-none transition focus-visible:ring-2 focus-visible:ring-gold-400/70';

export function Rangliste() {
  useAktuell();
  const alle = useEintraege();
  const gewichte = useGewichte();
  const [saison, setSaison] = useSaison(alle);
  const [stadt, setStadt] = useState<string>('alle');
  const [markt, setMarkt] = useState<string>('alle');
  const [mehrOffen, setMehrOffen] = useState(false);
  const [quelle, setQuelle] = useState<Quelle>('alle');
  const [ansicht, setAnsicht] = useState<'gesamt' | 'deals'>(() => (location.hash.includes('deals') ? 'deals' : 'gesamt'));
  const [gewichteOffen, setGewichteOffen] = useState(false);
  const wurzel = useEinblenden<HTMLDivElement>();
  if (!alle) return null;

  const jahre = [...new Set([...saisons(alle), new Date().getFullYear()])].sort();
  // Märkte nach Stadt gruppiert; „stadt:<Name>" filtert eine ganze Stadt.
  const gruppen = new Map<string, Set<string>>();
  for (const e of alle) {
    const st = stadtVon(MARKTLISTE, e) ?? 'Ohne Stadt';
    gruppen.set(st, (gruppen.get(st) ?? new Set()).add(e.markt));
  }
  const staedteListe = [...gruppen.entries()].sort(([a], [b]) =>
    a === 'Ohne Stadt' ? 1 : b === 'Ohne Stadt' ? -1 : a.localeCompare(b, 'de'),
  );
  const marktListe = [...(gruppen.get(stadt) ?? [])].filter((m) => m !== 'Sonstiger').sort((a, b) => a.localeCompare(b, 'de'));
  const waehleStadt = (neu: string) => {
    setStadt(neu);
    setMarkt('alle');
  };
  const aktiveExtras = (quelle !== 'alle' ? 1 : 0) + (stadt !== 'alle' && markt !== 'alle' ? 1 : 0);
  const filter = stadt === 'alle' ? { saison, markt: 'alle' } : markt === 'alle' ? { saison, markt: 'alle', stadt } : { saison, markt };
  const gewaehlt = filtere(alle, filter, MARKTLISTE);
  const zeilen = baueStaende(gewaehlt, MARKTLISTE, gewichte, quelle);
  const bewertungen = zeilen.reduce((n, s) => n + s.wert.anzahl, 0);
  const podest = zeilen.slice(0, 3);
  const rest = zeilen.slice(3);
  const deals = zeilen.filter((s) => s.deal.punkte !== null).sort((a, b) => (a.deal.rang ?? 1e9) - (b.deal.rang ?? 1e9));

  return (
    <div class="nm">
      <div class="mb-5 mt-2">
        <p class="etikett !text-gold-300">
          {tn(zeilen.length, '{n} Stand', '{n} Stände')} · {tn(bewertungen, '{n} Bewertung', '{n} Bewertungen')}
        </p>
        <h1 class="mt-2 font-display text-[44px] uppercase leading-[1] tracking-wide text-eis sm:text-5xl">{t('Rangliste')}</h1>
        <div class="mt-4 flex flex-wrap items-center gap-2.5">
          <span class="relative">
            <select class={FELD} aria-label={t('Stadt')} value={stadt} onChange={(e) => waehleStadt((e.target as HTMLSelectElement).value)}>
              <option value="alle">{t('Ganz Deutschland')}</option>
              {staedteListe.map(([st]) => (
                <option value={st}>{st === 'Ohne Stadt' ? t('Ohne Stadt') : st}</option>
              ))}
            </select>
            <span class="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 rotate-90 text-dunst">
              <Symbol name="pfeil" groesse={14} />
            </span>
          </span>
          <Chips optionen={['alle', ...jahre] as const} wert={saison} onWahl={setSaison} beschriftung={t('Saison')} label={(o) => (o === 'alle' ? t('Alle') : String(o))} />
          <Chips
            optionen={['gesamt', 'deals'] as const}
            wert={ansicht}
            onWahl={setAnsicht}
            beschriftung={t('Ansicht')}
            label={(o) => (o === 'gesamt' ? t('Gesamt') : t('Top Deals'))}
          />
          <button
            type="button"
            aria-expanded={mehrOffen}
            onClick={() => setMehrOffen(!mehrOffen)}
            class={`glas min-h-[44px] rounded-full px-4 py-2.5 text-sm transition ${mehrOffen ? 'text-gold-300' : 'text-eis hover:text-gold-300'}`}
          >
            {t('Mehr Filter')}
            {aktiveExtras > 0 && <span class="ml-1.5 rounded-full bg-gold-400 px-1.5 font-mono text-xs text-[#1a1020]">{aktiveExtras}</span>}
          </button>
        </div>
        {mehrOffen && (
          <div class="glas mt-3 grid gap-3 rounded-3xl p-4">
            <Chips
              optionen={['alle', 'pruefstelle', 'community'] as const}
              wert={quelle}
              onWahl={setQuelle}
              beschriftung={t('Wertung von')}
              label={(o) => (o === 'alle' ? t('Alle') : o === 'pruefstelle' ? t('Prüfstelle') : t('Community'))}
            />
            {stadt !== 'alle' && marktListe.length > 0 && (
              <span class="relative inline-block">
                <select class={FELD} aria-label={t('Markt')} value={markt} onChange={(e) => setMarkt((e.target as HTMLSelectElement).value)}>
                  <option value="alle">{t('Ganz {stadt}', { stadt })}</option>
                  {marktListe.map((m) => (
                    <option value={m}>{m}</option>
                  ))}
                </select>
                <span class="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 rotate-90 text-dunst">
                  <Symbol name="pfeil" groesse={14} />
                </span>
              </span>
            )}
            <button
              type="button"
              aria-expanded={gewichteOffen}
              onClick={() => setGewichteOffen(!gewichteOffen)}
              class={`glas min-h-[44px] justify-self-start rounded-full px-4 py-2.5 text-sm transition ${gewichteOffen ? 'text-gold-300' : 'text-eis hover:text-gold-300'}`}
            >
              {t('Gewichtung')} <span class="ml-1 font-mono text-xs text-dunst">{KRITERIEN.map((k) => gewichte[k]).join('·')}</span>
            </button>
          </div>
        )}
      </div>

      {gewichteOffen && (
        <section class="glas mb-4 rounded-3xl p-4">
          <h2 class="etikett mb-3 !text-[11px]">{t('Gewichtung · rechnet alles sofort neu')}</h2>
          <GewichteEditor gewichte={gewichte} />
        </section>
      )}

      {zeilen.length === 0 ? (
        <div class="glas rounded-3xl p-8 text-center">
          <p class="font-display text-3xl uppercase tracking-wide text-eis">{t('Keine Stände für diese Auswahl')}</p>
          <p class="mt-2 text-dunst">{t('Andere Saison, anderen Markt oder eine andere Wertung wählen.')}</p>
        </div>
      ) : (
        ansicht === 'deals' ? (
          <div ref={wurzel}>
            <p class="mb-3 text-sm text-dunst">
              {t('Top Deals: guter Glühwein für wenig Geld.')}
            </p>
            {deals.length === 0 ? (
              <p class="glas rounded-3xl p-6 text-center text-dunst">{t('Noch keine Preis-Leistung für diese Auswahl.')}</p>
            ) : (
              <ol class="grid gap-2 md:grid-cols-2">
                {deals.map((s) => (
                  <li data-ein>
                    <DealZeile stand={s} />
                  </li>
                ))}
              </ol>
            )}
          </div>
        ) : (
        <div ref={wurzel}>
          {/* Sammelkarten: am Telefon zum Wischen, am Rechner nebeneinander */}
          <ol class="ohne-balken -mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-6 pt-2 md:mx-0 md:grid md:grid-cols-3 md:items-stretch md:overflow-visible md:px-0">
            {podest.map((z) => (
              <li data-ein class="w-[86%] shrink-0 snap-center md:w-auto">
                <StandTopKarte stand={z} quelle={quelle} klein={podest.length > 1} />
              </li>
            ))}
          </ol>

          {rest.length > 0 && (
            <ol class="grid gap-2 md:grid-cols-2">
              {rest.map((z) => (
                <li data-ein>
                  <StandZeile stand={z} />
                </li>
              ))}
            </ol>
          )}
        </div>
        )
      )}
      <p class="mt-4 flex items-start gap-1.5 text-xs text-dunst">
        <span class="mt-0.5 shrink-0">
          <Symbol name="pfeil" groesse={12} />
        </span>
        <span class="mr-1 inline-block align-middle"><PruefSiegel groesse={16} /></span>
        {t('Siegel: von David & Philip getestet.')} {t('Durchschnitt aller Bewertungen je Stand.')}
      </p>
      <Betreiber />
    </div>
  );
}
