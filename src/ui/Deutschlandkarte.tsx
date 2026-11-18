import { KARTE_BREITE, KARTE_HOEHE, kartenPunkte, umrisse, type Koordinaten } from '../lib/karte';
import staedteJson from '../../data/staedte.json';

const ORTE = staedteJson as unknown as Koordinaten;
const UMRISSE = umrisse();

export interface StadtZahl {
  stadt: string | null;
  becher: number;
}

/** Ein Punkt je Stadt, Fläche nach Zahl der Becher. Namen stehen darunter als Liste. */
export function Deutschlandkarte({ staedte }: { staedte: StadtZahl[] }) {
  const { punkte, ohneOrt } = kartenPunkte(staedte, ORTE);
  const summe = (a: StadtZahl[]) => a.reduce((s, x) => s + x.becher, 0);
  const beschreibung = punkte.map((p) => `${p.stadt} ${p.becher}`).join(', ');
  return (
    <div class="karte-de">
      <svg
        viewBox={`-6 -6 ${KARTE_BREITE + 12} ${KARTE_HOEHE + 12}`}
        role="img"
        aria-label={`Karte von Deutschland und Österreich mit Bechern je Stadt: ${beschreibung || 'noch keine Stadt bekannt'}`}
      >
        {UMRISSE.map((u) => (
          <path d={u.pfad} class="umriss" data-land={u.land} />
        ))}
        {punkte.map((p) => (
          <g>
            <title>{`${p.stadt}: ${p.becher} ${p.becher === 1 ? 'Becher' : 'Becher'}`}</title>
            <circle cx={p.x} cy={p.y} r={p.r} class="punkt" />
          </g>
        ))}
      </svg>
      <ul class="staedteliste">
        {punkte.map((p) => (
          <li>
            <span class="name">{p.stadt}</span>
            <span class="zahl">{p.becher}</span>
          </li>
        ))}
        {ohneOrt.length > 0 && (
          <li class="ohne">
            <span class="name">Ohne bekannte Stadt</span>
            <span class="zahl">{summe(ohneOrt)}</span>
          </li>
        )}
      </ul>
    </div>
  );
}
