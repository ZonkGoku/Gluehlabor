// Ein Fahrzeug als SVG-Gruppe (Feld 46 × 34, fährt nach rechts), Beschreibung in lib/fahrzeuge.ts.
// Mit `gesicht` (nur das eigene Foto von diesem Gerät) sitzt ein rundes Gesicht auf dem Fahrzeug.
import { FAHRZEUGE, FAHRZEUG_ANZAHL } from '../../lib/fahrzeuge';

let zaehler = 0;

export function FahrzeugBild({ farbe, fahrzeug = 0, gesicht }: { farbe: string; fahrzeug?: number; gesicht?: string | null }) {
  const f = FAHRZEUGE[((fahrzeug % FAHRZEUG_ANZAHL) + FAHRZEUG_ANZAHL) % FAHRZEUG_ANZAHL];
  const [fx, fy, fr] = f.fahrer;
  const kennung = `gesicht-${++zaehler}`;
  return (
    <g stroke-linecap="round" stroke-linejoin="round">
      {f.teile.map((t) => {
        const c = t.farbe ?? farbe;
        const strich = t.strich !== undefined;
        const gemeinsam = { fill: t.nurStrich ? 'none' : (t.fuellung ?? c), stroke: strich ? c : 'none', 'stroke-width': t.strich };
        if (t.kreis) return <circle cx={t.kreis[0]} cy={t.kreis[1]} r={t.kreis[2]} {...gemeinsam} />;
        if (t.ellipse) return <ellipse cx={t.ellipse[0]} cy={t.ellipse[1]} rx={t.ellipse[2]} ry={t.ellipse[3]} {...gemeinsam} />;
        return <path d={t.d} {...gemeinsam} />;
      })}
      {gesicht && (
        <g>
          <clipPath id={kennung}>
            <circle cx={fx} cy={fy} r={fr} />
          </clipPath>
          <image href={gesicht} x={fx - fr} y={fy - fr} width={fr * 2} height={fr * 2} preserveAspectRatio="xMidYMid slice" clip-path={`url(#${kennung})`} />
          <circle cx={fx} cy={fy} r={fr} fill="none" stroke="#fff" stroke-width="1.4" />
        </g>
      )}
    </g>
  );
}
