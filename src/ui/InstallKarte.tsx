// „Als App installieren": ein Antippen. Android/Chrome öffnet direkt den Installationsdialog, iPhone zeigt den einen Schritt.
import { useEffect, useState } from 'preact/hooks';
import { leseEinstellung, schreibeEinstellung } from '../daten/db';
import { beobachteInstallation, installiere, istInstalliert, kannInstallieren } from '../daten/installieren';
import { istIosImBrowser } from '../lib/installhinweis';
import { t } from '../i18n';
import { useLive } from './hooks';
import { Symbol } from './Symbol';

export function InstallKarte() {
  const zu = useLive(() => leseEinstellung<boolean>('installHinweisZu', false), [], false);
  const [, neu] = useState(0);
  useEffect(() => beobachteInstallation(() => neu((n) => n + 1)), []);
  if (zu || istInstalliert()) return null;

  const ios = istIosImBrowser(navigator.userAgent, navigator.maxTouchPoints, (navigator as { standalone?: boolean }).standalone);
  const android = /Android/.test(navigator.userAgent);
  const direkt = kannInstallieren();
  if (!ios && !android && !direkt) return null;

  const symbol = (
    <span class="grid size-12 shrink-0 place-items-center rounded-2xl text-[#1a1020]" style={{ background: 'linear-gradient(135deg,#ffe29a,#ff8a3d)' }}>
      <Symbol name={direkt ? 'plus' : 'teilen'} groesse={24} />
    </span>
  );
  const text = (
    <span class="min-w-0 flex-1 text-left">
      <b class="block text-base text-eis">{t('Als App installieren')}</b>
      <span class="block text-sm text-dunst">{direkt ? t('Symbol auf dem Startbildschirm') : ios ? t('Teilen-Symbol antippen, dann „Zum Home-Bildschirm“') : t('Browser-Menü, dann „App installieren“')}</span>
    </span>
  );

  return (
    <div class="glas flex items-center gap-1 rounded-2xl p-2 pr-1">
      {direkt ? (
        <button type="button" onClick={() => void installiere()} class="flex min-h-[56px] flex-1 items-center gap-3 rounded-xl bg-transparent text-left" aria-label={t('Als App installieren')}>
          {symbol}
          {text}
        </button>
      ) : (
        <div class="flex min-h-[56px] flex-1 items-center gap-3">
          {symbol}
          {text}
        </div>
      )}
      <button
        type="button"
        onClick={() => void schreibeEinstellung('installHinweisZu', true)}
        class="grid size-11 shrink-0 place-items-center rounded-full text-dunst hover:text-eis"
        aria-label={t('Schließen')}
      >
        <Symbol name="schliessen" groesse={18} />
      </button>
    </div>
  );
}
