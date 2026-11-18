// Prüfsiegel: Ein Stand mit mindestens einer Bewertung der Prüfstelle (David & Philip) trägt es. Gold, rund, mit Haken.
import { t } from '../../i18n';

export function PruefSiegel({ groesse = 40, klasse = '' }: { groesse?: number; klasse?: string }) {
  const text = t('Von der Prüfstelle geprüft');
  return (
    <svg width={groesse} height={groesse} viewBox="0 0 48 48" role="img" aria-label={text} class={`shrink-0 ${klasse}`}>
      <title>{text}</title>
      <defs>
        <linearGradient id="gl-siegel" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stop-color="#ffe29a" />
          <stop offset="0.55" stop-color="#ffa05c" />
          <stop offset="1" stop-color="#f0344f" />
        </linearGradient>
      </defs>
      <circle cx="24" cy="24" r="22" fill="rgb(255 200 87 / 0.12)" stroke="url(#gl-siegel)" stroke-width="2.4" />
      <circle cx="24" cy="24" r="17.5" fill="none" stroke="url(#gl-siegel)" stroke-width="1" stroke-dasharray="2 2.6" />
      <path d="M15.5 24.5l6 6 11-13" fill="none" stroke="url(#gl-siegel)" stroke-width="3.4" stroke-linecap="round" stroke-linejoin="round" />
    </svg>
  );
}

/** Schmales Etikett mit Siegel und Text, z. B. auf der Stand-Seite. */
export function SiegelEtikett({ text }: { text?: string }) {
  return (
    <span class="inline-flex items-center gap-2 rounded-full border border-gold-400/50 bg-[rgb(255_200_87/0.1)] py-1 pl-1 pr-3 text-xs font-semibold text-gold-300">
      <PruefSiegel groesse={22} />
      {text ?? t('Von der Prüfstelle geprüft')}
    </span>
  );
}
