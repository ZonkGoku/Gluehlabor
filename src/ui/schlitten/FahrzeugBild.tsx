// Ein Fahrzeug als SVG-Gruppe (Feld 46 × 34, fährt nach rechts), Beschreibung in lib/fahrzeuge.ts.
// Auf dem Fahrzeug sitzt ein rundes Gesicht: mit `gesicht` das eigene Foto (nur auf diesem Gerät), sonst die gewählte Figur `avatar` (lib/avatare.ts), die alle sehen.
import { AVATARE, AVATAR_ANZAHL } from '../../lib/avatare';
import { FAHRZEUGE, FAHRZEUG_ANZAHL, type Teil } from '../../lib/fahrzeuge';

let zaehler = 0;

function Teile({ teile, farbe }: { teile: readonly Teil[]; farbe: string }) {
  return (
    <>
      {teile.map((t) => {
        const c = t.farbe ?? farbe;
        const strich = t.strich !== undefined;
        const gemeinsam = { fill: t.nurStrich ? 'none' : (t.fuellung ?? c), stroke: strich ? c : 'none', 'stroke-width': t.strich };
        if (t.kreis) return <circle cx={t.kreis[0]} cy={t.kreis[1]} r={t.kreis[2]} {...gemeinsam} />;
        if (t.ellipse) return <ellipse cx={t.ellipse[0]} cy={t.ellipse[1]} rx={t.ellipse[2]} ry={t.ellipse[3]} {...gemeinsam} />;
        return <path d={t.d} {...gemeinsam} />;
      })}
    </>
  );
}

/** Eine Figur (Feld 20 × 20) als Gruppe, in den Kreis um (cx, cy) mit Radius r eingepasst. */
export function AvatarBild({ avatar, cx, cy, r }: { avatar: number; cx: number; cy: number; r: number }) {
  const a = AVATARE[avatar];
  if (!a || avatar < 0 || avatar >= AVATAR_ANZAHL) return null;
  return (
    <g transform={`translate(${cx - r} ${cy - r}) scale(${(2 * r) / 20})`} stroke-linecap="round" stroke-linejoin="round">
      <Teile teile={a.teile} farbe="#888" />
    </g>
  );
}

export function FahrzeugBild({ farbe, fahrzeug = 0, gesicht, avatar = -1 }: { farbe: string; fahrzeug?: number; gesicht?: string | null; avatar?: number }) {
  const f = FAHRZEUGE[((fahrzeug % FAHRZEUG_ANZAHL) + FAHRZEUG_ANZAHL) % FAHRZEUG_ANZAHL];
  const [fx, fy, fr] = f.fahrer;
  const kennung = `gesicht-${++zaehler}`;
  return (
    <g stroke-linecap="round" stroke-linejoin="round">
      <Teile teile={f.teile} farbe={farbe} />
      {gesicht ? (
        <g>
          <clipPath id={kennung}>
            <circle cx={fx} cy={fy} r={fr} />
          </clipPath>
          <image href={gesicht} x={fx - fr} y={fy - fr} width={fr * 2} height={fr * 2} preserveAspectRatio="xMidYMid slice" clip-path={`url(#${kennung})`} />
          <circle cx={fx} cy={fy} r={fr} fill="none" stroke="#fff" stroke-width="1.4" />
        </g>
      ) : (
        avatar >= 0 && (
          <g>
            <AvatarBild avatar={avatar} cx={fx} cy={fy} r={fr} />
            <circle cx={fx} cy={fy} r={fr} fill="none" stroke="#fff" stroke-width="1.2" />
          </g>
        )
      )}
    </g>
  );
}
