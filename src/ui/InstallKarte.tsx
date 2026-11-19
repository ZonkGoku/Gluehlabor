// „Auf den Home-Bildschirm legen": Android/Chrome mit echtem Installationsknopf, iPhone mit Anleitung.
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

  return (
    <div class="glas flex items-start gap-3 rounded-3xl p-4">
      <span class="grid size-11 shrink-0 place-items-center rounded-2xl bg-[#1a1020]/85 text-[#ffd98a]">
        <Symbol name="plus" groesse={22} />
      </span>
      <div class="min-w-0 flex-1">
        <p class="text-base font-semibold text-eis">{t('Glühlabor aufs Handy legen')}</p>
        <p class="mt-1 text-sm text-dunst">
          {direkt
            ? t('Ein Symbol auf dem Startbildschirm, wie bei einer App. Funktioniert auch ohne Netz.')
            : ios
              ? t('Tippe unten auf das Teilen-Symbol und dann auf „Zum Home-Bildschirm". So bekommst du ein App-Symbol, und Safari vergisst nach einer Woche ohne Nutzung deine Daten nicht.')
              : t('Öffne das Browser-Menü (drei Punkte) und wähle „App installieren" oder „Zum Startbildschirm hinzufügen".')}
        </p>
        <div class="mt-3 flex flex-wrap gap-2">
          {direkt && (
            <button
              type="button"
              onClick={() => void installiere()}
              class="min-h-[44px] rounded-full px-5 font-semibold text-[#1a1020]"
              style={{ background: 'linear-gradient(135deg,#ffe29a,#ff8a3d)' }}
            >
              {t('Installieren')}
            </button>
          )}
          <button
            type="button"
            onClick={() => void schreibeEinstellung('installHinweisZu', true)}
            class="glas min-h-[44px] rounded-full px-5 text-sm text-eis"
          >
            {t('Nicht jetzt')}
          </button>
        </div>
      </div>
    </div>
  );
}
