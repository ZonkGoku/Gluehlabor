// „Top Deal": Preis-Leistung ab 8. Kleine Flamme mit Text, passt zu Zeilen und Karten.
import { t } from '../../i18n';
import { Symbol } from '../Symbol';

export function DealMarke({ gross = false }: { gross?: boolean }) {
  return (
    <span
      class={`inline-flex shrink-0 items-center gap-1 rounded-full border border-gold-400/60 bg-[rgb(255_138_61/0.14)] font-semibold uppercase tracking-wider text-gold-300 ${
        gross ? 'px-3 py-1 text-xs' : 'px-1.5 py-0.5 text-[9px]'
      }`}
    >
      <Symbol name="flamme" groesse={gross ? 14 : 10} />
      {t('Top Deal')}
    </span>
  );
}
