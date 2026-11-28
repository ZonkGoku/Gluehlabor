import { KRITERIEN } from '../lib/modell';
import { Betreiber } from './bausteine';
import { Symbol } from './Symbol';
import { ANKER, REGELN } from './stammdaten';
import { t, kriteriumLabel } from '../i18n';

/** Der Ablauf in Bildern: fünf Karten statt einer Textwand. Die ausführlichen Regeln und Anker stehen darunter, eingeklappt. */
const SCHRITTE = [
  { symbol: 'pin', text: 'Stand aussuchen' },
  { symbol: 'becher', text: 'Preis und Sterne' },
  { symbol: 'kamera', text: 'Foto, Teilen' },
  { symbol: 'pokal', text: 'Rangliste' },
  { symbol: 'ziel', text: 'Rennen fahren' },
] as const;

export function Spickzettel() {
  return (
    <>
      <div class="seitenkopf">
        <div>
          <p class="eyebrow">{t('So geht es')}</p>
          <h1>{t('Hilfe & Regeln')}</h1>
        </div>
      </div>
      <ol class="nm m-0 mb-5 grid list-none grid-cols-5 gap-2 p-0" aria-label={t('Ablauf')}>
        {SCHRITTE.map((s, i) => (
          <li class="glas grid place-items-center gap-1.5 rounded-2xl px-1 py-3 text-center">
            <span class="grid size-11 place-items-center rounded-full border border-[var(--nm-stern)] text-gold-300">
              <Symbol name={s.symbol} groesse={22} />
            </span>
            <span class="font-mono text-[11px] text-dunst">{i + 1}</span>
            <span class="text-[12px] font-semibold leading-tight text-eis">{t(s.text)}</span>
          </li>
        ))}
      </ol>
      <div class="raster">
        <details class="karte">
          <summary style={{ cursor: 'pointer', minHeight: '44px', display: 'flex', alignItems: 'center', fontWeight: 600 }}>{t('Alle Regeln')}</summary>
          <ol class="regeln">
            {REGELN.map((r) => (
              <li>{t(r)}</li>
            ))}
          </ol>
        </details>
        <details class="karte">
          <summary style={{ cursor: 'pointer', minHeight: '44px', display: 'flex', alignItems: 'center', fontWeight: 600 }}>{t('Was bedeuten die Sterne?')}</summary>
          <div class="raster raster-2">
            {KRITERIEN.map((k) => (
              <section>
                <h2>
                  {kriteriumLabel(ANKER[k].label)}
                  {ANKER[k].zusatz && <span style={{ fontWeight: 400, fontSize: '12.5px', color: 'var(--text-2)' }}>{t(ANKER[k].zusatz!)}</span>}
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
        </details>
      </div>
      <Betreiber />
    </>
  );
}
