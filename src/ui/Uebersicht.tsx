// Startansicht: Dashboard. Zahlen kommen ausschließlich aus src/lib.
import { filtere, marktCheckliste, ranglisteMitWertung, saisons, URTEILE, urteilVerteilung } from '../lib/auswertung';
import { zahl2 } from '../lib/format';
import { befunde, ueberblick } from '../lib/statistik';
import { Betreiber, Notenbalken, SaisonSchalter, UrteilPill } from './bausteine';
import { useEintraege, useGewichte, useSaison } from './daten';
import { LABELS, MAERKTE } from './stammdaten';

const UFARBE: Record<string, string> = {
  Nachschenken: 'var(--u1-bg)',
  'Richtig gut': 'var(--u2-fg)',
  'Geht klar': 'var(--gold)',
  'Einmal reicht': 'var(--u4-fg)',
  Weggießen: 'var(--u5-bg)',
};

export function Uebersicht() {
  const alle = useEintraege();
  const gewichte = useGewichte();
  const [saison, setSaison] = useSaison();
  if (!alle) return null;

  const jahre = [...new Set([...saisons(alle), new Date().getFullYear()])].sort();
  const auswahl = filtere(alle, { saison, markt: 'alle' });
  const zeilen = ranglisteMitWertung(auswahl, gewichte);
  const spitze = zeilen.filter((z) => z.rang === 1);
  const u = ueberblick(auswahl, gewichte);
  const verteilung = urteilVerteilung(zeilen);
  const maxV = Math.max(1, ...Object.values(verteilung));
  const checkliste = marktCheckliste(alle, MAERKTE.filter((m) => m !== 'Sonstiger'));
  const besucht = checkliste.filter((m) => m.becher > 0).length;
  const warnungen = befunde(auswahl, gewichte, LABELS).filter((b) => b.schwere !== 'gut').slice(0, 3);

  return (
    <>
      <div class="seitenkopf">
        <div>
          <p class="eyebrow">Prüfbericht {saison === 'alle' ? 'alle Saisons' : `Saison ${saison}`}</p>
          <h1>Übersicht</h1>
        </div>
        <SaisonSchalter saisons={jahre} wert={saison} onWahl={setSaison} />
      </div>

      {zeilen.length === 0 ? (
        <div class="karte leer">
          <b>In dieser Saison ist noch kein Becher bewertet.</b>
          Der erste Glühwein des Jahres wartet.
        </div>
      ) : (
        <div class="raster">
          <a class="karte spitze" href={`#/becher/${spitze[0].eintrag.id}`}>
            <img class="siegel" src="./logo.svg" alt="" />
            <p class="eyebrow">Spitzenreiter</p>
            <div class="stand">{spitze.map((z) => z.eintrag.stand).join(' & ')}</div>
            <div class="geteilt">
              {spitze.length > 1 ? `Teilen sich Platz 1 · ` : ''}
              {[...new Set(spitze.map((z) => z.eintrag.markt))].join(', ')}
            </div>
            <div class="zahlen">
              <span class="zahl-gross">{zahl2(spitze[0].wertung.gesamt)}</span>
              <span class="teil">
                Glühwein <b>{zahl2(spitze[0].wertung.gluehwein)}</b>
                <br />
                Drumherum <b>{zahl2(spitze[0].wertung.drumherum)}</b>
              </span>
              <UrteilPill urteil={spitze[0].wertung.urteil} />
            </div>
          </a>

          <div class="raster raster-kpi">
            <div class="karte kpi">
              <div class="wert">{u.eintraege}</div>
              <div class="label">Becher bewertet</div>
              <div class="zusatz">{u.einzelnoten} Einzelnoten</div>
            </div>
            <div class="karte kpi">
              <div class="wert">{zahl2(u.mittelGesamt)}</div>
              <div class="label">Ø Gesamtnote</div>
              <div class="zusatz">Spanne {zahl2(u.spanneGesamt)}</div>
            </div>
            <div class="karte kpi">
              <div class="wert">{u.genutzteStufen}/10</div>
              <div class="label">Stufen genutzt</div>
              <div class="zusatz">{u.zehner}× die 10 · {u.einsOderZwei}× 1–2</div>
            </div>
            <div class="karte kpi">
              <div class="wert">
                {besucht}/{checkliste.length}
              </div>
              <div class="label">Märkte erkundet</div>
              <div class="zusatz">über alle Saisons</div>
            </div>
          </div>

          <div class="raster raster-2">
            <section class="karte">
              <h2>
                Spitzengruppe <a href="#/rangliste">Ganze Rangliste</a>
              </h2>
              <ol class="topliste">
                {zeilen.slice(0, 5).map((z) => (
                  <li>
                    <a href={`#/becher/${z.eintrag.id}`}>
                      <span class="rang">{z.rang ?? '–'}</span>
                      <span class="name">{z.eintrag.stand}</span>
                      <span class="note">{zahl2(z.wertung.gesamt)}</span>
                      <Notenbalken wert={z.wertung.gesamt} />
                    </a>
                  </li>
                ))}
              </ol>
            </section>

            <section class="karte">
              <h2>Urteile</h2>
              <div class="verteilung" role="list">
                {URTEILE.map((name) => (
                  <div class="reihe" role="listitem" title={`${name}: ${verteilung[name]}`}>
                    <span>{name}</span>
                    <div class="spur">
                      <span style={{ width: `${(verteilung[name] / maxV) * 100}%`, background: UFARBE[name] }} />
                    </div>
                    <span class="anzahl">{verteilung[name]}</span>
                  </div>
                ))}
              </div>
            </section>

            <section class="karte">
              <h2>
                Prüfer-Selbstkontrolle <a href="#/statistik">Statistik</a>
              </h2>
              <ul class="befunde">
                {warnungen.length === 0 ? (
                  <li class="befund gut">
                    <span class="marke">OK</span>Keine Auffälligkeiten.
                  </li>
                ) : (
                  warnungen.map((b) => (
                    <li class={`befund ${b.schwere}`}>
                      <span class="marke">{b.schwere === 'warnung' ? 'Achtung' : 'Hinweis'}</span>
                      {b.text}
                    </li>
                  ))
                )}
              </ul>
            </section>

            <section class="karte">
              <h2>
                Wo wart ihr noch nie? <a href="#/vergleich">Checkliste</a>
              </h2>
              <div class="fortschritt" aria-label={`${besucht} von ${checkliste.length} Märkten`}>
                <span style={{ width: `${(besucht / checkliste.length) * 100}%` }} />
              </div>
              <div class="chips">
                {checkliste
                  .filter((m) => m.abdeckung === 'noch nie da')
                  .map((m) => (
                    <span class="chip-klein gold">{m.markt}</span>
                  ))}
              </div>
            </section>
          </div>
        </div>
      )}
      <Betreiber />
    </>
  );
}
