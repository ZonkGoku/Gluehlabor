import { KRITERIEN } from '../lib/modell';
import { Betreiber } from './bausteine';
import { ANKER, REGELN } from './stammdaten';

export function Spickzettel() {
  return (
    <>
      <div class="seitenkopf">
        <div>
          <p class="eyebrow">Vor dem ersten Becher einmal lesen</p>
          <h1>Spickzettel</h1>
        </div>
      </div>
      <div class="raster">
        <section class="karte">
          <h2>Regeln</h2>
          <ol class="regeln">
            {REGELN.map((r) => (
              <li>{r}</li>
            ))}
          </ol>
        </section>
        <div class="raster raster-2">
          {KRITERIEN.map((k) => (
            <section class="karte">
              <h2>
                {ANKER[k].label}
                {ANKER[k].zusatz && (
                  <span style={{ fontWeight: 400, fontSize: '12.5px', color: 'var(--text-2)' }}>{ANKER[k].zusatz}</span>
                )}
              </h2>
              <dl class="ankertafel">
                {Object.entries(ANKER[k].anker)
                  .sort(([a], [b]) => Number(b) - Number(a))
                  .map(([stufe, text]) => (
                    <div>
                      <dt>{stufe}</dt>
                      <dd>{text}</dd>
                    </div>
                  ))}
              </dl>
            </section>
          ))}
        </div>
      </div>
      <Betreiber />
    </>
  );
}
