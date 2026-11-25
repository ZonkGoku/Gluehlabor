// Sterne wie bei Google und Amazon: fünf Sterne mit anteiliger Füllung, davor die Zahl, dahinter die Zahl der Bewertungen in Klammern.
// Der 10-Punkte-Wert bleibt intern; hier wird immer halbiert (siehe sterne1 in lib/scoring.ts).
import { useMemo } from 'preact/hooks';
import { sterneText } from '../../lib/format';
import { tn } from '../../i18n';

const STERN = 'M12 2.6l2.8 5.9 6.5.8-4.8 4.5 1.2 6.4L12 17l-5.7 3.2 1.2-6.4L2.7 9.3l6.5-.8z';
let zaehler = 0;

/** Ein einzelner Stern, `fuellung` von 0 (leer) bis 1 (voll). */
export function Stern({ fuellung, groesse = 16 }: { fuellung: number; groesse?: number }) {
  const id = useMemo(() => `stern${++zaehler}`, []);
  const f = Math.max(0, Math.min(1, fuellung));
  return (
    <svg width={groesse} height={groesse} viewBox="0 0 24 24" aria-hidden="true" class="inline-block shrink-0">
      <defs>
        <linearGradient id={id} x1="0" x2="1" y1="0" y2="0">
          <stop offset={f} style={{ stopColor: 'var(--nm-stern)' }} />
          <stop offset={f} style={{ stopColor: 'var(--nm-stern-leer)' }} />
        </linearGradient>
      </defs>
      <path d={STERN} fill={`url(#${id})`} />
    </svg>
  );
}

/** Fünf Sterne für einen 10-Punkte-Wert (8 → vier volle Sterne). */
export function Sterne({ wert, groesse = 16 }: { wert: number | null | undefined; groesse?: number }) {
  const s = wert === null || wert === undefined ? 0 : Math.max(0, Math.min(5, wert / 2));
  return (
    <span class="inline-flex shrink-0 items-center" role="img" aria-label={wert === null || wert === undefined ? undefined : `${sterneText(wert)} / 5`}>
      {[0, 1, 2, 3, 4].map((i) => (
        <Stern fuellung={s - i} groesse={groesse} />
      ))}
    </span>
  );
}

/** „4.2 ★★★★☆ (12)": Zahl, Sterne, Anzahl der Bewertungen. */
export function SterneZeile({ wert, anzahl, groesse = 15 }: { wert: number | null | undefined; anzahl?: number; groesse?: number }) {
  return (
    <span class="inline-flex items-center gap-1.5 whitespace-nowrap" aria-label={anzahl === undefined ? undefined : tn(anzahl, '{n} Bewertung', '{n} Bewertungen')}>
      <b class="font-semibold text-eis">{sterneText(wert)}</b>
      <Sterne wert={wert} groesse={groesse} />
      {anzahl !== undefined && <span class="text-dunst">({anzahl})</span>}
    </span>
  );
}

/** Große Zahl mit Sternen darunter, wie die Kopfzeile einer Amazon-Bewertung. */
export function SterneGross({ wert, anzahl, zahl = 'text-[44px]' }: { wert: number | null | undefined; anzahl?: number; zahl?: string }) {
  return (
    <span class="inline-grid gap-1">
      <span class={`font-display leading-none text-gold-300 ${zahl}`}>{sterneText(wert)}</span>
      <Sterne wert={wert} groesse={18} />
      {anzahl !== undefined && <span class="text-xs text-dunst">{tn(anzahl, '{n} Bewertung', '{n} Bewertungen')}</span>}
    </span>
  );
}

/** Kurz: nur Zahl mit kleinem Stern (Admin-Listen). */
export function SterneWert({ wert }: { wert: number | null | undefined }) {
  return (
    <span class="inline-flex items-center gap-1 whitespace-nowrap">
      {sterneText(wert)}
      {wert !== null && wert !== undefined && <Stern fuellung={1} groesse={14} />}
    </span>
  );
}
