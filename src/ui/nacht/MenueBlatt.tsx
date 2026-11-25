// Menü für die Erfassung: Die Seite hat keine Tab-Leiste (unten sitzt „Speichern"), also gibt es die vier Hauptziele hier.
import { t } from '../../i18n';

const ZIELE = [
  { href: '#/', label: 'Start' },
  { href: '#/rangliste', label: 'Rangliste' },
  { href: '#/mehr', label: 'Mehr' },
  { href: '#/profil', label: 'Ich' },
] as const;

export function MenueBlatt({ onZu }: { onZu: () => void }) {
  return (
    <div class="nm fixed inset-0 z-[60] flex items-end justify-center bg-black/55 backdrop-blur-sm sm:items-center" onPointerDown={(ev) => ev.target === ev.currentTarget && onZu()}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label={t('Menü')}
        class="glas-stark w-full max-w-md rounded-t-[28px] p-5 text-eis sm:rounded-[28px]"
        style={{ paddingBottom: 'max(1.25rem, env(safe-area-inset-bottom))' }}
      >
        <h2 class="font-display text-[28px] uppercase leading-none tracking-wide">{t('Menü')}</h2>
        <p class="mt-2 text-sm text-dunst">{t('Deine angefangene Bewertung bleibt gespeichert.')}</p>
        <nav class="mt-4 grid gap-2">
          {ZIELE.map((z) => (
            <a href={z.href} class="glas flex min-h-[52px] items-center rounded-2xl px-4 text-lg font-semibold text-eis no-underline">
              {t(z.label)}
            </a>
          ))}
        </nav>
        <button type="button" onClick={onZu} class="glas mt-3 min-h-[48px] w-full rounded-full px-4 text-sm text-dunst hover:text-eis">
          {t('Weiter bewerten')}
        </button>
      </div>
    </div>
  );
}
