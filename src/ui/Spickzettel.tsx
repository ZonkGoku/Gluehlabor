import { KRITERIEN } from '../lib/modell';
import { Betreiber } from './bausteine';
import { ANKER, REGELN } from './stammdaten';
import { t, kriteriumLabel } from '../i18n';

export function Spickzettel() {
  return (
    <>
      <div class="seitenkopf">
        <div>
          <p class="eyebrow">{t('Vor dem ersten Becher einmal lesen')}</p>
          <h1>{t('Hilfe & Regeln')}</h1>
        </div>
      </div>
      <div class="raster">
        <section class="karte">
          <h2>{t('Regeln')}</h2>
          <ol class="regeln">
            {REGELN.map((r) => (
              <li>{t(r)}</li>
            ))}
          </ol>
        </section>
        <div class="raster raster-2">
          {KRITERIEN.map((k) => (
            <section class="karte">
              <h2>
                {kriteriumLabel(ANKER[k].label)}
                {ANKER[k].zusatz && (
                  <span style={{ fontWeight: 400, fontSize: '12.5px', color: 'var(--text-2)' }}>{t(ANKER[k].zusatz!)}</span>
                )}
              </h2>
              <dl class="ankertafel">
                {Object.entries(ANKER[k].anker)
                  .sort(([a], [b]) => Number(b) - Number(a))
                  .map(([stufe, text]) => (
                    <div>
                      <dt>{stufe}</dt>
                      <dd>{t(text)}</dd>
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
