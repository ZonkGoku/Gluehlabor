// QR-Code mitten in der Erfassung: Einer holt die Becher, alle scannen, jeder hat das Bewertungsblatt offen.
// Ein Blatt statt einer eigenen Seite, damit der Entwurf unverändert dahinter bleibt.
import type { Besuch } from '../../lib/besuch';
import { TeilenBlock } from '../TeilenBlock';
import { t } from '../../i18n';

export function QrBlatt({ besuch, onZu }: { besuch: Besuch; onZu: () => void }) {
  return (
    <div class="nm fixed inset-0 z-[60] flex items-end justify-center bg-black/60 backdrop-blur-sm sm:items-center" onPointerDown={(ev) => ev.target === ev.currentTarget && onZu()}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label={t('QR-Code für die Gruppe')}
        class="glas-stark max-h-[94dvh] w-full max-w-md overflow-y-auto rounded-t-[28px] p-5 text-eis sm:rounded-[28px]"
        style={{ paddingBottom: 'max(1.25rem, env(safe-area-inset-bottom))' }}
      >
        <h2 class="text-center font-display text-[28px] uppercase leading-none tracking-wide">{t('Alle scannen, alle bewerten')}</h2>
        <p class="mb-4 mt-2 text-center text-sm text-gold-300">
          {besuch.stand}
          {besuch.stadt ? ` · ${besuch.stadt}` : ''}
        </p>
        <TeilenBlock besuch={besuch} />
        <button
          type="button"
          onClick={onZu}
          class="glas mt-4 min-h-[52px] w-full rounded-full px-4 text-base font-semibold text-eis"
        >
          {t('Weiter zur Bewertung')}
        </button>
      </div>
    </div>
  );
}
