// Kleines „?": erklärt in ein, zwei Sätzen, was ein Begriff bedeutet (Siegel, Top Deal, Preis-Leistung). Tippen klappt den Text auf.
import { useState } from 'preact/hooks';
import { t } from '../../i18n';

export function HilfePunkt({ text }: { text: string }) {
  const [offen, setOffen] = useState(false);
  return (
    <>
      <button
        type="button"
        aria-expanded={offen}
        aria-label={t('Was ist das?')}
        onClick={() => setOffen(!offen)}
        class="-m-2 inline-grid size-11 shrink-0 place-items-center align-middle"
      >
        <span class={`grid size-6 place-items-center rounded-full border font-mono text-xs ${offen ? 'border-gold-400 text-gold-300' : 'border-[var(--nm-rand-stark)] text-dunst'}`}>?</span>
      </button>
      {offen && (
        <span role="note" class="mt-2 block basis-full text-sm leading-snug text-dunst">
          {text}
        </span>
      )}
    </>
  );
}
