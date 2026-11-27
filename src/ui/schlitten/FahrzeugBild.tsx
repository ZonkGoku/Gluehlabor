// Ein Fahrzeug als SVG-Gruppe (Feld 46 × 34, fährt nach rechts), Beschreibung in lib/fahrzeuge.ts.
import { FAHRZEUGE, FAHRZEUG_ANZAHL } from '../../lib/fahrzeuge';

export function FahrzeugBild({ farbe, fahrzeug = 0 }: { farbe: string; fahrzeug?: number }) {
  const f = FAHRZEUGE[((fahrzeug % FAHRZEUG_ANZAHL) + FAHRZEUG_ANZAHL) % FAHRZEUG_ANZAHL];
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
    </g>
  );
}
