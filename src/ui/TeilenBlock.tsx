// QR-Code und Link zum gemeinsamen Bewerten, mit „Schon dabei"-Liste. Gebraucht von der Teilen-Seite und vom Ticket nach dem Speichern.
import { useEffect, useState } from 'preact/hooks';
import { db } from '../daten/db';
import { synchronisiere } from '../daten/sync';
import { besuchsLink, type Besuch } from '../lib/besuch';
import { anzeigeName, istPruefstelle } from '../lib/community';
import { MARKE } from '../marke';
import { useLive } from './hooks';
import { Qr } from './Qr';
import { Symbol } from './Symbol';
import { t, tn } from '../i18n';

export function TeilenBlock({ besuch }: { besuch: Besuch }) {
  const [kopiert, setKopiert] = useState(false);
  const mitDabei = useLive(() => db.eintraege.where('besuchId').equals(besuch.id).toArray(), [besuch.id], []);

  // Solange der Code offen ist, kurz nachfragen: Die Mitbewertenden sollen schnell auftauchen.
  // (Die öffentliche Liste wird am Rand 5 s zwischengespeichert, deshalb nicht öfter.)
  useEffect(() => {
    const i = setInterval(() => void synchronisiere(), 10_000);
    return () => clearInterval(i);
  }, []);

  const link = besuchsLink(location.origin + location.pathname, besuch);
  const teile = async () => {
    try {
      if (navigator.share) {
        await navigator.share({ title: `${MARKE.name}: ${besuch.stand}`, text: t('Bewerte mit mir: {stand}', { stand: besuch.stand }), url: link });
        return;
      }
    } catch {
      /* abgebrochen oder nicht möglich: dann kopieren */
    }
    try {
      await navigator.clipboard.writeText(link);
      setKopiert(true);
      setTimeout(() => setKopiert(false), 2500);
    } catch {
      window.prompt?.(t('Link kopieren'), link);
    }
  };
  const namen = [...new Set(mitDabei.map((e) => (istPruefstelle(e) ? t('Prüfstelle') : anzeigeName(e))))];

  return (
    <div class="grid justify-items-center gap-3 text-center">
      <div class="qr-box">
        <Qr text={link} titel={t('QR-Code zum Mitbewerten bei {stand}', { stand: besuch.stand })} />
      </div>
      <p class="max-w-xs text-sm text-dunst">
        {t('Die anderen scannen den Code mit der Handykamera und bewerten selbst. Kein Konto, keine App nötig.')}
      </p>
      <button
        type="button"
        onClick={() => void teile()}
        class="flex min-h-[48px] items-center justify-center gap-2 rounded-full px-6 font-semibold text-[#1a1020]"
        style={{ background: 'linear-gradient(135deg,#ffe29a,#ff8a3d)' }}
      >
        <Symbol name="teilen" groesse={18} /> {kopiert ? t('Link kopiert') : t('Link per Nachricht schicken')}
      </button>
      {namen.length > 0 && (
        <p class="text-sm text-eis" aria-live="polite">
          <b>{tn(mitDabei.length, '{n} Bewertung', '{n} Bewertungen')} {t('zu diesem Besuch:')}</b> {namen.join(', ')}
        </p>
      )}
    </div>
  );
}
