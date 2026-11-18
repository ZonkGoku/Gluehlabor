// Rangliste „Night Market": die ersten drei als Sammelkarten zum Wischen, danach die Liste.
import { useState } from 'preact/hooks';
import { filtere, ranglisteMitWertung, saisons } from '../lib/auswertung';
import { KRITERIEN } from '../lib/modell';
import { ortText, stadtVon } from '../lib/orte';
import { Betreiber } from './bausteine';
import { useEintraege, useGewichte, useSaison } from './daten';
import { GewichteEditor } from './GewichteEditor';
import { useEinblenden } from './nacht/bewegung';
import { Chips } from './nacht/Chips';
import { RangZeile } from './nacht/RangZeile';
import { TopKarte } from './nacht/Ticket';
import { MARKTLISTE } from './stammdaten';
import { Symbol } from './Symbol';

const FELD =
  'glas appearance-none rounded-full bg-no-repeat py-2.5 pl-4 pr-9 text-sm text-eis outline-none transition focus-visible:ring-2 focus-visible:ring-gold-400/70';

export function Rangliste() {
  const alle = useEintraege();
  const gewichte = useGewichte();
  const [saison, setSaison] = useSaison(alle);
  const [markt, setMarkt] = useState<string>('alle');
  const [gewichteOffen, setGewichteOffen] = useState(false);
  const wurzel = useEinblenden<HTMLDivElement>();
  if (!alle) return null;

  const jahre = [...new Set([...saisons(alle), new Date().getFullYear()])].sort();
  // Märkte nach Stadt gruppiert; „stadt:<Name>" filtert eine ganze Stadt.
  const gruppen = new Map<string, Set<string>>();
  for (const e of alle) {
    const s = stadtVon(MARKTLISTE, e) ?? 'Ohne Stadt';
    gruppen.set(s, (gruppen.get(s) ?? new Set()).add(e.markt));
  }
  const stadtGruppen = [...gruppen.entries()].sort(([a], [b]) =>
    a === 'Ohne Stadt' ? 1 : b === 'Ohne Stadt' ? -1 : a.localeCompare(b, 'de'),
  );
  const filter = markt.startsWith('stadt:') ? { saison, markt: 'alle', stadt: markt.slice(6) } : { saison, markt };
  const zeilen = ranglisteMitWertung(filtere(alle, filter, MARKTLISTE), gewichte);
  const ortVon = (z: (typeof zeilen)[number]) => ortText(MARKTLISTE, z.eintrag);
  const podest = zeilen.slice(0, 3);
  const rest = zeilen.slice(3);

  return (
    <div class="nm">
      <div class="mb-5 mt-2">
        <p class="etikett !text-gold-300">{zeilen.length} Becher · absteigend nach Gesamtnote</p>
        <h1 class="mt-2 font-display text-[44px] uppercase leading-[1] tracking-wide text-eis sm:text-5xl">Rangliste</h1>
        <div class="mt-4 flex flex-wrap items-center gap-2.5">
          <Chips optionen={['alle', ...jahre] as const} wert={saison} onWahl={setSaison} beschriftung="Saison" label={(o) => (o === 'alle' ? 'Alle' : String(o))} />
          <span class="relative">
            <select class={FELD} aria-label="Markt" value={markt} onChange={(e) => setMarkt((e.target as HTMLSelectElement).value)}>
              <option value="alle">Ganz Deutschland</option>
              {stadtGruppen.map(([stadt, ms]) => (
                <optgroup label={stadt}>
                  {stadt !== 'Ohne Stadt' && <option value={`stadt:${stadt}`}>Ganz {stadt}</option>}
                  {[...ms]
                    .sort((a, b) => a.localeCompare(b, 'de'))
                    .map((m) => (
                      <option value={m}>{m}</option>
                    ))}
                </optgroup>
              ))}
            </select>
            <span class="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 rotate-90 text-dunst">
              <Symbol name="pfeil" groesse={14} />
            </span>
          </span>
          <button
            type="button"
            aria-expanded={gewichteOffen}
            onClick={() => setGewichteOffen(!gewichteOffen)}
            class={`glas rounded-full px-4 py-2.5 text-sm transition ${gewichteOffen ? 'text-gold-300' : 'text-eis hover:text-gold-300'}`}
          >
            Gewichtung <span class="ml-1 font-mono text-xs text-dunst">{KRITERIEN.map((k) => gewichte[k]).join('·')}</span>
          </button>
        </div>
      </div>

      {gewichteOffen && (
        <section class="glas mb-4 rounded-3xl p-4">
          <h2 class="etikett mb-3 !text-[11px]">Gewichtung · rechnet alles sofort neu</h2>
          <GewichteEditor gewichte={gewichte} />
        </section>
      )}

      {zeilen.length === 0 ? (
        <div class="glas rounded-3xl p-8 text-center">
          <p class="font-display text-3xl uppercase tracking-wide text-eis">Keine Becher für diese Auswahl</p>
          <p class="mt-2 text-dunst">Andere Saison oder anderen Markt wählen.</p>
        </div>
      ) : (
        <div ref={wurzel}>
          {/* Sammelkarten: am Telefon zum Wischen, am Rechner nebeneinander */}
          <ol class="ohne-balken -mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-6 pt-2 md:mx-0 md:grid md:grid-cols-3 md:overflow-visible md:px-0">
            {podest.map((z) => (
              <li data-ein class="w-[86%] shrink-0 snap-center md:w-auto">
                <TopKarte zeile={z} ort={ortVon(z)} klein={podest.length > 1} />
              </li>
            ))}
          </ol>

          {rest.length > 0 && (
            <ol class="grid gap-2 md:grid-cols-2">
              {rest.map((z) => (
                <li data-ein>
                  <RangZeile zeile={z} />
                </li>
              ))}
            </ol>
          )}
        </div>
      )}
      <p class="mt-4 flex items-start gap-1.5 text-xs text-dunst">
        <span class="mt-0.5 shrink-0">
          <Symbol name="pfeil" groesse={12} />
        </span>
        Glühwein = Geschmack, Geruch, Temperatur · Drumherum = Personal, Atmosphäre, Preis/Leistung, Becher. Gleiche Note, gleicher Platz.
      </p>
      <Betreiber />
    </div>
  );
}
