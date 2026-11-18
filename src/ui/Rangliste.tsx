import { useState } from 'preact/hooks';
import { filtere, ranglisteMitWertung, saisons } from '../lib/auswertung';
import { zahl2 } from '../lib/format';
import { KRITERIEN } from '../lib/modell';
import { stadtVon } from '../lib/orte';
import { Betreiber, Notenbalken, SaisonSchalter, UrteilPill } from './bausteine';
import { useEintraege, useGewichte, useSaison } from './daten';
import { GewichteEditor } from './GewichteEditor';
import { MARKTLISTE } from './stammdaten';
import { Symbol } from './Symbol';

export function Rangliste() {
  const alle = useEintraege();
  const gewichte = useGewichte();
  const [saison, setSaison] = useSaison(alle);
  const [markt, setMarkt] = useState<string>('alle');
  const [gewichteOffen, setGewichteOffen] = useState(false);
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
  const filter = markt.startsWith('stadt:')
    ? { saison, markt: 'alle', stadt: markt.slice(6) }
    : { saison, markt };
  const zeilen = ranglisteMitWertung(filtere(alle, filter, MARKTLISTE), gewichte);
  const gehe = (id: string) => (location.hash = `#/becher/${id}`);

  return (
    <>
      <div class="seitenkopf">
        <div>
          <p class="eyebrow">{zeilen.length} Becher · absteigend nach Gesamtnote</p>
          <h1>Rangliste</h1>
        </div>
        <div class="filterreihe">
          <SaisonSchalter saisons={jahre} wert={saison} onWahl={setSaison} />
          <select class="auswahl" aria-label="Markt" value={markt} onChange={(e) => setMarkt((e.target as HTMLSelectElement).value)}>
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
          <button type="button" class="pillknopf" aria-expanded={gewichteOffen} onClick={() => setGewichteOffen(!gewichteOffen)}>
            Gewichtung <span class="mono">{KRITERIEN.map((k) => gewichte[k]).join('·')}</span>
          </button>
        </div>
      </div>

      {gewichteOffen && (
        <section class="karte" style={{ marginBottom: '14px' }}>
          <h2>Gewichtung · rechnet alles sofort neu</h2>
          <GewichteEditor gewichte={gewichte} />
        </section>
      )}

      <section class="karte">
        {zeilen.length === 0 ? (
          <div class="leer">
            <b>Keine Becher für diese Auswahl.</b>
            Andere Saison oder anderen Markt wählen.
          </div>
        ) : (
          <>
            <table class="tabelle nur-breit">
              <thead>
                <tr>
                  <th>Rang</th>
                  <th>Stand</th>
                  <th>Note</th>
                  <th class="num">Glühwein</th>
                  <th class="num">Drumherum</th>
                  <th>Urteil</th>
                </tr>
              </thead>
              <tbody>
                {zeilen.map((z) => (
                  <tr class={z.rang === 1 ? 'erster' : ''} onClick={() => gehe(z.eintrag.id)}>
                    <td class="rangzelle">{z.rang ?? '–'}</td>
                    <td class="standzelle">
                      <a href={`#/becher/${z.eintrag.id}`} style={{ color: 'inherit', textDecoration: 'none' }}>
                        <b>{z.eintrag.stand}</b>
                      </a>
                      <small>
                        {z.eintrag.markt} · {z.eintrag.saison}
                      </small>
                    </td>
                    <td class="notezelle">
                      <div class="innen">
                        {zahl2(z.wertung.gesamt)}
                        <Notenbalken wert={z.wertung.gesamt} />
                      </div>
                    </td>
                    <td class="num">{zahl2(z.wertung.gluehwein)}</td>
                    <td class="num">{zahl2(z.wertung.drumherum)}</td>
                    <td>
                      <UrteilPill urteil={z.wertung.urteil} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            <ol class="rangkarten">
              {zeilen.map((z) => (
                <li>
                  <a href={`#/becher/${z.eintrag.id}`}>
                    <span class={z.rang === 1 ? 'rang eins' : 'rang'}>{z.rang ?? '–'}</span>
                    <span class="name">{z.eintrag.stand}</span>
                    <span class="note">
                      <span class="zahl-gross">{zahl2(z.wertung.gesamt)}</span>
                      <UrteilPill urteil={z.wertung.urteil} />
                    </span>
                    <span class="unter">
                      G {zahl2(z.wertung.gluehwein)} · D {zahl2(z.wertung.drumherum)} · {z.eintrag.markt}
                    </span>
                  </a>
                </li>
              ))}
            </ol>
          </>
        )}
      </section>
      <p class="unterzeile" style={{ color: 'var(--text-2)', fontSize: '12.5px', marginTop: '10px' }}>
        <Symbol name="pfeil" groesse={12} /> G = Glühwein (Geschmack, Geruch, Temperatur) · D = Drumherum (Personal,
        Atmosphäre, Preis/Leistung, Becher). Gleiche Note, gleicher Platz.
      </p>
      <Betreiber />
    </>
  );
}
