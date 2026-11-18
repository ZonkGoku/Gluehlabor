import { marktCheckliste, saisons, wiederholungen, type Entwicklung } from '../lib/auswertung';
import { zahl2 } from '../lib/format';
import { Betreiber } from './bausteine';
import { useEintraege, useGewichte } from './daten';
import { staedte } from '../lib/orte';
import { MARKTLISTE } from './stammdaten';

const ENTWICKLUNG: Record<Entwicklung, string> = {
  besser: 'besser geworden',
  schlechter: 'abgefallen',
  unveraendert: 'unverändert',
  neu: 'neu',
  einmalig: 'einmal bewertet',
};

function differenz(d: number | null): string {
  if (d === null) return '–';
  const t = zahl2(Math.abs(d));
  return d > 0 ? `▲ +${t}` : d < 0 ? `▼ −${t}` : '= 0.00';
}

export function Vergleich() {
  const alle = useEintraege();
  const gewichte = useGewichte();
  if (!alle) return null;

  const jahre = [...new Set([...saisons(alle), new Date().getFullYear()])].sort();
  const w = wiederholungen(alle, gewichte);
  const mehrfach = w.filter((x) => Object.keys(x.jeSaison).length > 1);
  const listen = MARKTLISTE.staedte.map((s) => {
    const c = marktCheckliste(alle, s.maerkte);
    return { stadt: s.stadt, checkliste: c, besucht: c.filter((m) => m.becher > 0).length };
  });
  const gepflegt = new Set(MARKTLISTE.staedte.map((s) => s.stadt));
  const weitere = staedte(MARKTLISTE, alle).filter((o) => !gepflegt.has(o.stadt ?? ''));

  return (
    <>
      <div class="seitenkopf">
        <div>
          <p class="eyebrow">Über die Jahre</p>
          <h1>Vergleich</h1>
          <p class="unterzeile">Stände, die in mehreren Saisons bewertet wurden, und Märkte, die noch fehlen.</p>
        </div>
      </div>

      <div class="raster">
        <section class="karte">
          <h2>Wiederholungstäter</h2>
          {mehrfach.length === 0 && (
            <p style={{ margin: '0 0 12px', color: 'var(--text-2)', fontSize: '14px' }}>
              Noch kein Stand in zwei Saisons. Sobald ihr einen Stand aus {jahre[0]} wieder besucht, steht hier, ob er
              besser geworden ist.
            </p>
          )}
          <div style={{ overflowX: 'auto' }}>
            <table class="tabelle" style={{ cursor: 'default' }}>
              <thead>
                <tr>
                  <th>Stand</th>
                  {jahre.map((j) => (
                    <th class="num">{j}</th>
                  ))}
                  <th class="num">±</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {w.map((x) => (
                  <tr style={{ cursor: 'default' }}>
                    <td class="standzelle">
                      <b>{x.stand}</b>
                      <small>{x.markt}</small>
                    </td>
                    {jahre.map((j) => (
                      <td class="num">{x.jeSaison[j] === undefined ? '–' : zahl2(x.jeSaison[j])}</td>
                    ))}
                    <td class="num">{differenz(x.differenz)}</td>
                    <td>
                      <span class={`entwicklung ${x.entwicklung}`}>{ENTWICKLUNG[x.entwicklung]}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {listen.map((l) => (
          <section class="karte">
            <h2>
              Wo wart ihr noch nie? · {l.stadt}
              <span class="mono" style={{ fontWeight: 500, color: 'var(--text-2)', fontSize: '13px' }}>
                {l.besucht}/{l.checkliste.length} erkundet
              </span>
            </h2>
            <div class="fortschritt">
              <span style={{ width: `${(l.besucht / l.checkliste.length) * 100}%` }} />
            </div>
            <div class="marktgitter">
              {l.checkliste.map((m) => (
                <div class={`markt ${m.abdeckung === 'noch nie da' ? 'nie' : m.abdeckung === 'abgedeckt' ? 'abgedeckt' : ''}`}>
                  <div class="n">{m.markt}</div>
                  <div class="z">{m.becher === 0 ? 'noch nie da' : `${m.becher} Becher · ${m.abdeckung}`}</div>
                </div>
              ))}
            </div>
          </section>
        ))}

        <section class="karte">
          <h2>Weitere Orte in Deutschland</h2>
          <p style={{ margin: '0 0 12px', color: 'var(--text-2)', fontSize: '14px' }}>
            Bewertet wird überall. Märkte außerhalb der gepflegten Listen tragt ihr bei der Erfassung als „Markt, Stadt" ein.
          </p>
          <div class="chips">
            {weitere.length === 0 && <span class="chip-klein">Noch keine</span>}
            {weitere.map((o) => (
              <span class={o.stadt ? 'chip-klein gold' : 'chip-klein'}>
                {o.stadt ?? 'Stadt nicht angegeben'} · {o.becher} Becher
              </span>
            ))}
          </div>
        </section>
      </div>
      <Betreiber />
    </>
  );
}
