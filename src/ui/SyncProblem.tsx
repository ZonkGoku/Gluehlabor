// Sichtbarer Hinweis, wenn Bewertungen nicht beim Server ankommen (Name abgelehnt, Bewertung abgelehnt). Vorher stand das nur versteckt im Profil.
import { useState } from 'preact/hooks';
import { db, leseEinstellung, schreibeEinstellung, setzeName } from '../daten/db';
import { synchronisiere } from '../daten/sync';
import { pruefeName } from '../lib/community';
import { t, tn } from '../i18n';
import { useLive } from './hooks';

export function SyncProblem() {
  const nameFehler = useLive(() => leseEinstellung<string>('nameFehler', ''), [], '');
  const abgelehnt = useLive(() => db.eintraege.where('sync').equals('abgelehnt').toArray(), [], []);
  const [name, setNameFeld] = useState('');
  const [meldung, setMeldung] = useState('');

  const speichere = async () => {
    const p = pruefeName(name);
    if (!p.ok) return setMeldung(t(p.grund));
    if (!p.name) return setMeldung(t('Bitte einen Namen eingeben.'));
    await setzeName(p.name);
    await schreibeEinstellung('nameFehler', '');
    setMeldung('');
    setNameFeld('');
    void synchronisiere();
  };

  if (nameFehler) {
    return (
      <section class="nm mx-auto mb-3 mt-3 grid max-w-[1120px] gap-2 rounded-2xl border-2 border-[var(--warnung)] bg-flaeche p-4 text-eis" role="alert" style={{ marginInline: '16px' }}>
        <p class="m-0 text-[16px] font-semibold">{t('Dein Name wurde abgelehnt, deshalb sind deine Bewertungen noch nicht in der Rangliste.')}</p>
        <p class="m-0 text-sm text-dunst">{t(nameFehler)}</p>
        <div class="flex gap-2">
          <input class="feld min-h-[48px] min-w-0 flex-1" type="text" maxLength={24} placeholder={t('Anderer Name')} aria-label={t('Anderer Name')} value={name} onInput={(e) => setNameFeld((e.target as HTMLInputElement).value)} onKeyDown={(e) => e.key === 'Enter' && void speichere()} />
          <button type="button" class="min-h-[48px] rounded-full px-5 font-bold text-[#1a1020]" style={{ background: 'linear-gradient(135deg,#ffe29a,#ff8a3d)' }} onClick={() => void speichere()}>
            {t('Speichern')}
          </button>
        </div>
        {meldung && <p class="m-0 text-sm text-[var(--warnung)]">{meldung}</p>}
      </section>
    );
  }
  if (abgelehnt.length > 0) {
    return (
      <a href="#/meine" class="nm mb-3 mt-3 block rounded-2xl border-2 border-[var(--warnung)] bg-flaeche p-4 text-eis no-underline" role="alert" style={{ marginInline: '16px' }}>
        <b class="block text-[16px]">{tn(abgelehnt.length, '{n} Bewertung hat der Server nicht angenommen', '{n} Bewertungen hat der Server nicht angenommen')}</b>
        <span class="block text-sm text-dunst">{t(abgelehnt[0].syncFehler ?? 'Grund unbekannt')} · {t('Tippen für Details')}</span>
      </a>
    );
  }
  return null;
}
