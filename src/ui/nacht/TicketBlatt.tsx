// „Dein Ticket": erscheint direkt nach dem Speichern eines Bechers. Der Moment, in dem man teilen will.
import { useEffect, useMemo, useState } from 'preact/hooks';
import { neueAbzeichen } from '../../lib/abzeichen';
import { filtere, ranglisteMitWertung } from '../../lib/auswertung';
import { baueStaende } from '../../lib/staende';
import { ortText, stadtVon } from '../../lib/orte';
import { useEintraege, useGewichte } from '../daten';
import { MARKTLISTE } from '../stammdaten';
import { Symbol } from '../Symbol';
import { wiederholeBecher } from '../../daten/wiederholen';
import { RennenFortschritt } from '../schlitten/Fortschritt';
import { TeilenBlock } from '../TeilenBlock';
import { Hintergrund } from './Hintergrund';
import { kartenDaten, teileKartenBild } from './karteBild';
import { TopKarte } from './Ticket';
import { t } from '../../i18n';

export function TicketBlatt({ id, onNaechster, onNochmal }: { id: string; onNaechster: () => void; onNochmal?: (neueId: string) => void }) {
  const alle = useEintraege();
  const gewichte = useGewichte();
  const [meldung, setMeldung] = useState('');
  const [wiederholt, setWiederholt] = useState(false);
  const e = alle?.find((x) => x.id === id);
  const fotoUrl = useMemo(() => (e?.fotoBlob ? URL.createObjectURL(e.fotoBlob) : null), [e?.fotoBlob]);
  useEffect(() => () => void (fotoUrl && URL.revokeObjectURL(fotoUrl)), [fotoUrl]);
  if (!alle || !e) return null;

  const zeilen = ranglisteMitWertung(filtere(alle, { saison: e.saison, markt: 'alle' }), gewichte);
  const zeile0 = zeilen.find((z) => z.eintrag.id === id);
  if (!zeile0) return null;
  // Der Platz gehört dem Stand (die Rangliste zählt Stände), nicht dieser einen Bewertung
  const staendeSaison = baueStaende(filtere(alle, { saison: e.saison, markt: 'alle' }), MARKTLISTE, gewichte);
  const standRang = staendeSaison.find((x) => x.bewertungen.some((b) => b.id === id))?.rang ?? null;
  const zeile = { ...zeile0, rang: standRang };
  const ort = ortText(MARKTLISTE, e);
  const neu = neueAbzeichen(alle.filter((x) => x.geraet === e.geraet && x.sync !== 'bestand'), alle, MARKTLISTE, id, gewichte);
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
        <p class="etikett mt-4 !text-gold-300">{t('Gespeichert')}</p>
        <h1 class="mt-2 font-display text-[40px] uppercase leading-none tracking-wide">{t('Danke für deine Bewertung')}</h1>
        <p class="mb-4 mt-2 min-h-5 text-xs text-dunst">{e.sync === 'offen' ? t('Wird gesendet, sobald Netz da ist.') : ''}</p>

        {neu.length > 0 && (
          <a href="#/profil" class="glas rahmen-licht mb-4 flex items-center gap-3 rounded-3xl p-4 text-eis no-underline" aria-live="polite">
            <span class="grid size-12 shrink-0 place-items-center rounded-full text-[#1a1020]" style={{ background: 'linear-gradient(135deg,#ffe29a,#ff8a3d)' }}>
              <Symbol name={neu[0].symbol} groesse={24} />
            </span>
            <span class="min-w-0 flex-1">
              <span class="etikett !text-gold-300">{t('Neues Abzeichen')}</span>
              <b class="block text-lg leading-tight">{neu.map((x) => t(x.name)).join(', ')}</b>
            </span>
            <span aria-hidden="true" class="text-xl text-gold-300">→</span>
          </a>
        )}

        <RennenFortschritt />

        {onNochmal && (
          <button
            type="button"
            disabled={wiederholt}
            onClick={async () => {
              setWiederholt(true);
              try {
                onNochmal(await wiederholeBecher(e));
              } finally {
                setTimeout(() => setWiederholt(false), 900);
              }
            }}
            class="glas rahmen-licht mb-4 flex min-h-[64px] w-full items-center gap-3 rounded-3xl p-4 text-left text-eis disabled:opacity-60"
          >
            <span class="grid size-11 shrink-0 place-items-center rounded-full text-[#1a1020]" style={{ background: 'linear-gradient(135deg,#ffe29a,#ff8a3d)' }}>
              <Symbol name="plus" groesse={22} />
            </span>
            <span class="min-w-0 flex-1">
              <b class="block text-[17px] leading-tight">{t('Nochmal wie eben')}</b>
              <span class="block truncate text-sm text-dunst">{t('Noch eine Bewertung bei {stand}', { stand: e.stand })}</span>
            </span>
          </button>
        )}

        {e.besuchId && (
          <section class="glas mb-6 rounded-3xl p-5" aria-label={t('Andere mitbewerten lassen')}>
            <h2 class="text-center font-display text-2xl uppercase tracking-wide text-eis">{t('Alle scannen, alle bewerten')}</h2>
            <p class="mb-4 mt-1 text-center text-sm text-gold-300">{e.stand}</p>
            <TeilenBlock besuch={{ id: e.besuchId, stand: e.stand, markt: e.markt, stadt: stadtVon(MARKTLISTE, e) ?? undefined, sorte: e.sorte }} />
          </section>
        )}

        {fotoUrl && <img src={fotoUrl} alt={t('Dein Foto')} class="mb-4 max-h-64 w-full rounded-3xl border border-rand object-cover" />}
        <TopKarte zeile={zeile} ort={ort} hinweis={zeile.rang ? t('Stand: Platz {r} von {n}', { r: zeile.rang, n: staendeSaison.length }) : undefined} ohneLink />

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
            {t('Nächsten Glühwein bewerten')}
          </button>
          <a href="#/rangliste" class="py-2 text-center text-sm font-medium text-dunst">
            {t('Zur Rangliste')}
          </a>
        </div>
      </div>
    </div>
  );
}
