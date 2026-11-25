// Geführte Anleitung „Zum Home-Bildschirm": Apple erlaubt keinen Installieren-Knopf, also zeigen wir die drei Schritte mit Pfeil.
import { t } from '../../i18n';
import { Symbol } from '../Symbol';

/** Das Teilen-Symbol von Safari: Quadrat mit Pfeil nach oben. */
function TeilenIcon() {
  return (
    <span class="grid size-12 shrink-0 place-items-center rounded-xl bg-white text-[#1a6bff]" aria-hidden="true">
      <Symbol name="teilen" groesse={26} />
    </span>
  );
}

export function InstallAnleitung({ ios, inApp, onZu }: { ios: boolean; inApp: boolean; onZu: () => void }) {
  const schritte = ios
    ? [
        { icon: <TeilenIcon />, titel: t('Teilen antippen'), unter: t('Unten in der Safari-Leiste, oder über ⋯ oben rechts.') },
        { icon: <span class="grid size-12 shrink-0 place-items-center rounded-xl bg-white text-black" aria-hidden="true"><Symbol name="plus" groesse={26} /></span>, titel: t('„Zum Home-Bildschirm“'), unter: t('In der Liste, notfalls nach oben wischen.') },
        { icon: <span class="grid size-12 shrink-0 place-items-center rounded-xl bg-[#1a6bff] text-lg font-bold text-white" aria-hidden="true">OK</span>, titel: t('„Hinzufügen“ antippen'), unter: t('Fertig. Das Symbol liegt auf deinem Home-Bildschirm.') },
      ]
    : [
        { icon: <span class="grid size-12 shrink-0 place-items-center rounded-xl bg-white text-xl font-bold text-black" aria-hidden="true">⋮</span>, titel: t('Browser-Menü öffnen'), unter: t('Die drei Punkte oben rechts.') },
        { icon: <span class="grid size-12 shrink-0 place-items-center rounded-xl bg-white text-black" aria-hidden="true"><Symbol name="plus" groesse={26} /></span>, titel: t('„App installieren“'), unter: t('Oder „Zum Startbildschirm hinzufügen“.') },
        { icon: <span class="grid size-12 shrink-0 place-items-center rounded-xl bg-[#1a6bff] text-lg font-bold text-white" aria-hidden="true">OK</span>, titel: t('Bestätigen'), unter: t('Fertig.') },
      ];
  return (
    <div class="nm fixed inset-0 z-[70] flex flex-col justify-end bg-black/70 backdrop-blur-sm" onPointerDown={(ev) => ev.target === ev.currentTarget && onZu()}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label={t('Als App installieren')}
        class="glas-stark mx-auto w-full max-w-md rounded-t-[28px] p-5 text-eis"
        style={{ paddingBottom: ios ? 'calc(3.25rem + env(safe-area-inset-bottom))' : 'max(1.25rem, env(safe-area-inset-bottom))' }}
      >
        <h2 class="font-display text-[28px] uppercase leading-none tracking-wide">{t('In 3 Schritten aufs Handy')}</h2>
        {inApp && (
          <p class="mt-3 rounded-2xl border border-gold-400/60 p-3 text-sm font-semibold text-gold-300">
            {t('Du bist in der App eines anderen Dienstes. Öffne diese Seite zuerst im Browser (Safari oder Chrome).')}
          </p>
        )}
        <ol class="mt-4 grid gap-3">
          {schritte.map((s, i) => (
            <li class="flex items-center gap-3">
              <span class="grid size-7 shrink-0 place-items-center rounded-full border border-gold-400/60 font-mono text-xs text-gold-300">{i + 1}</span>
              {s.icon}
              <span class="min-w-0 flex-1">
                <b class="block text-base">{s.titel}</b>
                <span class="block text-sm text-dunst">{s.unter}</span>
              </span>
            </li>
          ))}
        </ol>
        <button type="button" onClick={onZu} class="mt-5 min-h-[52px] w-full rounded-full px-5 text-base font-semibold text-[#1a1020]" style={{ background: 'linear-gradient(135deg,#ffe29a,#ff8a3d)' }}>
          {t('Verstanden')}
        </button>
      </div>
      {/* Pfeil nach unten auf die Safari-Leiste */}
      {ios && (
        <div aria-hidden="true" class="pointer-events-none absolute inset-x-0 bottom-1 flex justify-center text-4xl text-white motion-safe:animate-bounce">
          ↓
        </div>
      )}
    </div>
  );
}
