import { schreibeEinstellung } from '../daten/db';
import { DEFAULT_GEWICHTE, KRITERIEN, type Gewichte, type Kriterium } from '../lib/modell';
import { LABELS } from './stammdaten';
import { t, kriteriumLabel } from '../i18n';

/** Gewichte 0..5 je Kriterium. Jede Änderung wirkt sofort in allen Ansichten. */
export function GewichteEditor({ gewichte }: { gewichte: Gewichte }) {
  const setze = (k: Kriterium, w: number) =>
    schreibeEinstellung('gewichte', { ...gewichte, [k]: Math.max(0, Math.min(5, w)) });
  const istDefault = KRITERIEN.every((k) => gewichte[k] === DEFAULT_GEWICHTE[k]);
  return (
    <div>
      <div class="gewichte">
        {KRITERIEN.map((k) => (
          <div class="gewicht">
            <span>{kriteriumLabel(LABELS[k])}</span>
            <span class="stepper">
              <button type="button" aria-label={t('{label} leichter', { label: kriteriumLabel(LABELS[k]) })} disabled={gewichte[k] <= 0} onClick={() => setze(k, gewichte[k] - 1)}>
                −
              </button>
              <span class="w">{gewichte[k]}</span>
              <button type="button" aria-label={t('{label} schwerer', { label: kriteriumLabel(LABELS[k]) })} disabled={gewichte[k] >= 5} onClick={() => setze(k, gewichte[k] + 1)}>
                +
              </button>
            </span>
          </div>
        ))}
      </div>
      {!istDefault && (
        <p style={{ margin: '10px 0 0', fontSize: '13px' }}>
          <button type="button" class="pillknopf" onClick={() => schreibeEinstellung('gewichte', { ...DEFAULT_GEWICHTE })}>
            {t('Auf 3 · 2 · 2 · 1 · 1 · 2 · 1 zurücksetzen')}
          </button>
        </p>
      )}
    </div>
  );
}
