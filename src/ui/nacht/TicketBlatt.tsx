// „Dein Ticket": erscheint direkt nach dem Speichern eines Bechers. Der Moment, in dem man teilen will.
import { useState } from 'preact/hooks';
import { filtere, ranglisteMitWertung } from '../../lib/auswertung';
import { ortText } from '../../lib/orte';
import { useEintraege, useGewichte } from '../daten';
import { MARKTLISTE } from '../stammdaten';
import { Symbol } from '../Symbol';
import { Hintergrund } from './Hintergrund';
import { kartenDaten, teileKartenBild } from './karteBild';
import { TopKarte } from './Ticket';
import { t } from '../../i18n';

export function TicketBlatt({ id, onNaechster }: { id: string; onNaechster: () => void }) {
  const alle = useEintraege();
  const gewichte = useGewichte();
  const [meldung, setMeldung] = useState('');
  const e = alle?.find((x) => x.id === id);
  if (!alle || !e) return null;

  const zeilen = ranglisteMitWertung(filtere(alle, { saison: e.saison, markt: 'alle' }), gewichte);
  const zeile = zeilen.find((z) => z.eintrag.id === id);
  if (!zeile) return null;
  const ort = ortText(MARKTLISTE, e);
  const link = `${location.origin}${location.pathname}#/becher/${encodeURIComponent(id)}`;

  const teilen = async () => {
    setMeldung(t('Erzeuge Bild …'));
    const r = await teileKartenBild(kartenDaten(zeile, ort, link), link);
    setMeldung(r === 'gespeichert' ? t('Bild gespeichert, jetzt in die Story legen.') : '');
  };

  return (
    <div class="nm fixed inset-0 z-50 overflow-y-auto bg-[var(--bg)] font-sans text-eis" role="dialog" aria-modal="true" aria-label={t('Dein Ticket')}>
      <Hintergrund />
      <div class="mx-auto flex min-h-full max-w-md flex-col px-4 pb-10 pt-8">
        <p class="etikett mt-6 !text-gold-300">{t('Probe gesichert')}</p>
        <h1 class="mt-2 font-display text-[44px] uppercase leading-none tracking-wide">{t('Dein Ticket')}</h1>
        <p class="mb-5 mt-2 min-h-5 text-xs text-dunst">{e.sync === 'offen' ? t('Wird gesendet, sobald Netz da ist.') : ''}</p>

        <TopKarte zeile={zeile} ort={ort} hinweis={zeile.rang ? t('Platz {r} von {n}', { r: zeile.rang, n: zeilen.length }) : undefined} ohneLink />

        <div class="mt-6 grid gap-3">
          <button
            type="button"
            onClick={teilen}
            class="animate-puls flex items-center justify-center gap-2.5 rounded-2xl py-4 font-display text-2xl uppercase tracking-wide text-[#1a1020]"
            style={{ background: 'linear-gradient(135deg,#ffe29a,#ff8a3d 55%,#f0344f)' }}
          >
            <Symbol name="teilen" groesse={24} />
            {t('Als Bild teilen')}
          </button>
          {meldung && <p class="text-center text-sm text-gold-300" aria-live="polite">{meldung}</p>}
          <button type="button" onClick={onNaechster} class="glas rounded-2xl py-3.5 text-base font-semibold text-eis">
            {t('Nächster Becher')}
          </button>
          <a href="#/rangliste" class="py-2 text-center text-sm font-medium text-dunst">
            {t('Zur Rangliste')}
          </a>
        </div>
      </div>
    </div>
  );
}
