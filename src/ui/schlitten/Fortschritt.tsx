// Rückmeldung direkt nach dem Bewerten: dein Schlitten ist einen Schritt weiter. Steht im Ticket (nacht/TicketBlatt.tsx).
import { useState } from 'preact/hooks';
import { HAT_SERVER } from '../../daten/config';
import { meineRennen, trittMitStandardBei } from '../../daten/rennen';
import { t } from '../../i18n';
import { berechneRennen, istWochenrennen, lage, wochenRennenId } from '../../lib/rennen';
import { useEintraege, useGeraetId } from '../daten';
import { useLive } from '../hooks';
import { farbeVon, lageText, MiniBahn } from './Bahn';
import { fehlerText, useRennenDaten } from './laden';

function RennenZeile({ id }: { id: string }) {
  const { d, neuLaden } = useRennenDaten(id, 60_000);
  const alle = useEintraege();
  const ich = useGeraetId();
  const [laeuft, setLaeuft] = useState(false);
  const [fehler, setFehler] = useState('');
  if (!d || !alle) return null;
  const woche = istWochenrennen(id);
  const stand = berechneRennen(d.rennen, d.teilnehmer, alle);
  const meine = stand.bahnen.find((b) => b.geraet === ich);
  const titel = woche ? t('Wochenrennen') : d.rennen.name;

  if (!meine) {
    // Wochenrennen für alle: ein Tipp zum Mitfahren
    if (!woche) return null;
    const los = async () => {
      setLaeuft(true);
      setFehler('');
      try {
        await trittMitStandardBei(id);
        neuLaden();
      } catch (e) {
        setFehler(fehlerText(e));
      }
      setLaeuft(false);
    };
    return (
      <section class="glas rahmen-licht mb-4 grid gap-3 rounded-3xl p-4" aria-label={titel}>
        <p class="m-0 text-[17px] font-semibold text-eis">{t('Fahr im Wochenrennen mit!')}</p>
        <p class="m-0 text-sm text-dunst">{t('Jede Bewertung ist ein Schritt für deinen Schlitten. Jede Woche geht es von vorn los.')}</p>
        <button type="button" class="min-h-[52px] rounded-full px-6 font-bold text-[#1a1020] disabled:opacity-50" style={{ background: 'linear-gradient(135deg,#ffe29a,#ff8a3d)' }} disabled={laeuft} onClick={() => void los()}>
          {t('Mitfahren')}
        </button>
        {fehler && (
          <p role="alert" class="m-0 text-sm text-[var(--warnung)]">
            {fehler}
          </p>
        )}
      </section>
    );
  }
  if (stand.vorbei) return null;
  const ziel = d.rennen.ziel;
  const satz = lageText(lage(stand, ziel, ich));
  return (
    <a href={`#/schlittenfahren/${id}`} class="glas rahmen-licht mb-4 block rounded-3xl p-4 text-eis no-underline" aria-live="polite">
      <span class="flex items-baseline justify-between gap-3">
        <b class="min-w-0 truncate text-[17px]">{titel}</b>
        <span class="shrink-0 font-mono text-sm text-gold-300">
          {t('{n} von {m}', { n: meine.schritte, m: ziel })}
        </span>
      </span>
      <MiniBahn farbe={farbeVon(meine.farbe)} von={Math.max(0, meine.schritte - 1) / ziel} nach={meine.schritte / ziel} />
      {satz && <span class="mt-1 block text-[15px] leading-snug text-dunst">{satz}</span>}
    </a>
  );
}

/** Alle Rennen, in denen dieses Gerät fährt, plus das Wochenrennen (mit Einladung, falls man noch nicht dabei ist). */
export function RennenFortschritt() {
  const ids = useLive(meineRennen, [], [] as string[]);
  if (!HAT_SERVER) return null;
  const alle = [...new Set([wochenRennenId(), ...ids])];
  return (
    <>
      {alle.map((id) => (
        <RennenZeile key={id} id={id} />
      ))}
    </>
  );
}
