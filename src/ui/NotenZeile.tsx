// Eine Note als fünf große Sterne-Knöpfe (1 bis 5, gespeichert als 2, 4, 6, 8, 10) statt eines Schiebereglers: kein Wischen, kein Fehltipp am Rand, mit
// dicken Daumen und Handschuhen bedienbar. Zweites Tippen nimmt die Note zurück. Wer genauer will, rückt mit − und + um einen halben Stern.
// Die Stufen passen zu den Beschreibungen der Noten (data/anker.json: 2, 4, 6, 8, 10).
import { t } from '../i18n';
import { halbSterne } from '../lib/format';
import { Stern, Sterne } from './nacht/SterneWert';
import type { Note } from '../lib/modell';

const STUFEN = [2, 4, 6, 8, 10] as const;

interface Props {
  name: string;
  wert: Note;
  /** Ohne onWert wird die Zeile nur angezeigt (berechnete Note, z. B. Preis-Leistung). */
  onWert?: (n: Note) => void;
  auto?: boolean;
  offen: boolean;
  onHilfe: () => void;
  /** Beschreibungen je Stufe, von 10 abwärts. */
  anker?: { stufe: number; text: string }[];
  /** Freier Erklärtext statt der Stufen (bei berechneten Noten). */
  hilfeText?: string;
}

const zupfen = () => navigator.vibrate?.(8);

export function NotenZeile({ name, wert, onWert, auto = false, offen, onHilfe, anker, hilfeText }: Props) {
  const setze = (n: Note) => {
    zupfen();
    onWert?.(n);
  };
  return (
    <section class="nz" data-gesetzt={wert !== null} data-auto={auto}>
      <div class="nz-kopf">
        <span class="nz-name">
          {name}
          {auto && <span class="nz-auto">{t('auto')}</span>}
        </span>
        {onWert && wert !== null && (
          <span class="nz-stepper" role="group" aria-label={t('{name} genauer einstellen', { name })}>
            <button type="button" aria-label={t('einen halben Stern weniger')} disabled={wert <= 1} onClick={() => setze(Math.max(1, wert - 1))}>
              −
            </button>
            <output aria-live="polite">{halbSterne(wert)}</output>
            <button type="button" aria-label={t('einen halben Stern mehr')} disabled={wert >= 10} onClick={() => setze(Math.min(10, wert + 1))}>
              +
            </button>
          </span>
        )}
        {!onWert && <output class="nz-wert">{halbSterne(wert)}</output>}
        <button type="button" class="nz-hilfe" aria-expanded={offen} aria-label={t('Was bedeutet {name}?', { name })} onClick={onHilfe}>
          ?
        </button>
      </div>
      {onWert ? (
        <div class="nz-stufen" role="radiogroup" aria-label={name}>
          {STUFEN.map((n) => (
            <button type="button" role="radio" aria-label={t('{n} Sterne', { n: n / 2 })} aria-checked={wert === n} data-an={wert === n} onClick={() => setze(wert === n ? null : n)}>
              <Stern fuellung={wert === null ? 0 : (wert - (n - 2)) / 2} groesse={38} />
            </button>
          ))}
        </div>
      ) : (
        <div class="nz-segmente" aria-hidden="true">
          <Sterne wert={wert} groesse={26} />
        </div>
      )}
      {offen && (
        <div class="nz-hilfe-text" role="note">
          {hilfeText ??
            anker?.map((a) => (
              <p>
                <b>{halbSterne(a.stufe)}</b> {a.text}
              </p>
            ))}
        </div>
      )}
    </section>
  );
}
