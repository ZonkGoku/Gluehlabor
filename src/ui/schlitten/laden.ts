// Lädt ein Rennen vom Server und fragt regelmäßig nach.
import { useEffect, useState } from 'preact/hooks';
import { ApiFehler } from '../../daten/api';
import { ladeRennen, type RennenDaten } from '../../daten/rennen';
import { t } from '../../i18n';
import { RENNEN_ID } from '../../lib/rennen';

export const fehlerText = (e: unknown): string => (e instanceof ApiFehler ? t(e.message) : t('Keine Verbindung. Bitte später erneut versuchen.'));

export function useRennenDaten(id: string | null, takt = 10_000) {
  const [d, setD] = useState<RennenDaten | null>(null);
  const [nichtDa, setNichtDa] = useState(false);
  const [fehler, setFehler] = useState('');
  const [neu, setNeu] = useState(0);
  useEffect(() => {
    if (!id) return;
    if (!RENNEN_ID.test(id)) return setNichtDa(true);
    let aktiv = true;
    const hole = () =>
      ladeRennen(id)
        .then((x) => aktiv && (setD(x), setFehler('')))
        .catch((e) => {
          if (!aktiv) return;
          if (e instanceof ApiFehler && e.status === 404) setNichtDa(true);
          else setFehler(fehlerText(e));
        });
    void hole();
    const timer = setInterval(hole, takt);
    return () => {
      aktiv = false;
      clearInterval(timer);
    };
  }, [id, neu, takt]);
  return { d, nichtDa, fehler, neuLaden: () => setNeu((n) => n + 1) };
}
