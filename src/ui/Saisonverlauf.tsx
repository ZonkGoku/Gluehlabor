import { useState } from 'preact/hooks';
import { sterneText } from '../lib/format';
import type { Verlauf } from '../lib/startseite';
import { datumKurz } from './bausteine';
import { t, tn } from '../i18n';

const WOCHENTAG = ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'];

function beschriftung(datum: string): string {
  const d = new Date(`${datum}T12:00:00`);
  return `${t(WOCHENTAG[d.getDay()])} ${datumKurz(datum)?.slice(0, 5)}`;
}

/** Becher je Abend als Säulen. Antippen oder Fokussieren zeigt Datum, Zahl und Schnitt. */
export function Saisonverlauf({ verlauf, saison }: { verlauf: Verlauf; saison: number }) {
  const [gewaehlt, setGewaehlt] = useState<string | null>(null);
  const { tage, ohneDatum } = verlauf;

  if (tage.length === 0) {
    return (
      <p class="leer-hinweis">
        {ohneDatum > 0
          ? t('Die {n} Bewertungen aus {saison} haben kein Datum.', { n: ohneDatum, saison })
          : t('Noch keine Bewertung in dieser Saison.')}
      </p>
    );
  }
  const max = Math.max(...tage.map((t) => t.anzahl));
  const an = tage.find((t) => t.datum === gewaehlt) ?? tage.filter((t) => t.anzahl > 0).at(-1)!;
  const summe = tage.reduce((s, t) => s + t.anzahl, 0);
  const abende = tage.filter((t) => t.anzahl > 0).length;

  return (
    <div>
      <div class="verlauf" role="group" aria-label={`Becher je Abend, ${summe} Becher an ${abende} Abenden`}>
        {tage.map((t) => (
          <button
            type="button"
            class={`saeule${t.anzahl === 0 ? ' leer' : ''}${t.datum === an.datum ? ' an' : ''}`}
            style={{ height: `${t.anzahl === 0 ? 4 : 12 + (t.anzahl / max) * 88}%` }}
            aria-label={`${beschriftung(t.datum)}: ${tn(t.anzahl, '{n} Bewertung', '{n} Bewertungen')}`}
            aria-pressed={t.datum === an.datum}
            onClick={() => setGewaehlt(t.datum)}
            onFocus={() => setGewaehlt(t.datum)}
          />
        ))}
      </div>
      <div class="verlauf-achse">
        <span>{beschriftung(tage[0].datum)}</span>
        {tage.length > 1 && <span>{beschriftung(tage.at(-1)!.datum)}</span>}
      </div>
      <p class="verlauf-text" aria-live="polite">
        <b>{beschriftung(an.datum)}</b> · {tn(an.anzahl, '{n} Bewertung', '{n} Bewertungen')}
        {an.mittel !== null && <> · Ø {sterneText(an.mittel)}</>}
      </p>
    </div>
  );
}
