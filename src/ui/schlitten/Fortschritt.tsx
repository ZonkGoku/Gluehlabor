// Rückmeldung direkt nach dem Bewerten: dein Schlitten ist einen Schritt weiter. Steht im Ticket (nacht/TicketBlatt.tsx).
import { HAT_SERVER } from '../../daten/config';
import { meineRennen } from '../../daten/rennen';
import { t } from '../../i18n';
import { berechneRennen, lage } from '../../lib/rennen';
import { useEintraege, useGeraetId } from '../daten';
import { useLive } from '../hooks';
import { farbeVon, lageText, MiniBahn } from './Bahn';
import { useRennenDaten } from './laden';

function RennenZeile({ id }: { id: string }) {
  const { d } = useRennenDaten(id, 60_000);
  const alle = useEintraege();
  const ich = useGeraetId();
  if (!d || !alle) return null;
  const stand = berechneRennen(d.rennen, d.teilnehmer, alle);
  const meine = stand.bahnen.find((b) => b.geraet === ich);
  if (!meine || stand.vorbei) return null;
  const ziel = d.rennen.ziel;
  const satz = lageText(lage(stand, ziel, ich));
  return (
    <a href={`#/schlittenfahren/${id}`} class="glas rahmen-licht mb-4 block rounded-3xl p-4 text-eis no-underline" aria-live="polite">
      <span class="flex items-baseline justify-between gap-3">
        <b class="min-w-0 truncate text-[17px]">{d.rennen.name}</b>
        <span class="shrink-0 font-mono text-sm text-gold-300">{t('{n} von {m}', { n: meine.schritte, m: ziel })}</span>
      </span>
      <MiniBahn farbe={farbeVon(meine.farbe)} fahrzeug={meine.fahrzeug} von={Math.max(0, meine.schritte - 1) / ziel} nach={meine.schritte / ziel} />
      {satz && <span class="mt-1 block text-[15px] leading-snug text-dunst">{satz}</span>}
    </a>
  );
}

/** Alle laufenden Rennen, in denen dieses Gerät fährt. */
export function RennenFortschritt() {
  const ids = useLive(meineRennen, [], [] as string[]);
  if (!HAT_SERVER) return null;
  return (
    <>
      {ids.slice(0, 5).map((id) => (
        <RennenZeile key={id} id={id} />
      ))}
    </>
  );
}
