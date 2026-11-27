// Die laufenden Rennen, in denen dieses Gerät fährt (für die Leiste oben und die Karte auf der Startseite).
import { useEffect, useState } from 'preact/hooks';
import { HAT_SERVER } from '../../daten/config';
import { ApiFehler } from '../../daten/api';
import { ladeRennen, meineRennen, type RennenDaten } from '../../daten/rennen';
import { berechneRennen, type Bahn } from '../../lib/rennen';
import { useEintraege, useGeraetId } from '../daten';
import { useLive } from '../hooks';

export interface MeinRennen {
  id: string;
  name: string;
  ziel: number;
  fahrer: number;
  meine: Bahn;
}

export function useMeineRennen(takt = 30_000): MeinRennen[] {
  const ids = useLive(meineRennen, [], [] as string[]);
  const alle = useEintraege();
  const ich = useGeraetId();
  const [daten, setDaten] = useState<Record<string, RennenDaten | null>>({});
  const schluessel = ids.join(',');
  useEffect(() => {
    if (!HAT_SERVER || ids.length === 0) return;
    let aktiv = true;
    const hole = () =>
      ids.slice(0, 5).forEach((id) =>
        ladeRennen(id)
          .then((d) => aktiv && setDaten((x) => ({ ...x, [id]: d })))
          .catch((e) => aktiv && e instanceof ApiFehler && e.status === 404 && setDaten((x) => ({ ...x, [id]: null }))),
      );
    hole();
    const timer = setInterval(hole, takt);
    return () => {
      aktiv = false;
      clearInterval(timer);
    };
  }, [schluessel, takt]);
  if (!alle || !ich) return [];
  const liste: MeinRennen[] = [];
  for (const id of ids.slice(0, 5)) {
    const d = daten[id];
    if (!d) continue;
    const stand = berechneRennen(d.rennen, d.teilnehmer, alle);
    const meine = stand.bahnen.find((b) => b.geraet === ich);
    if (!meine || stand.vorbei) continue;
    liste.push({ id, name: d.rennen.name, ziel: d.rennen.ziel, fahrer: stand.bahnen.length, meine });
  }
  return liste;
}
