// Sterne wie bei Google und Amazon: fünf Sterne mit anteiliger Füllung, davor die Zahl, dahinter die Zahl der Bewertungen in Klammern.
// Der 10-Punkte-Wert bleibt intern; hier wird immer halbiert (siehe sterne1 in lib/scoring.ts).
import { useEffect, useMemo, useState } from 'preact/hooks';
import { sterneText } from '../../lib/format';
import { tn } from '../../i18n';

const STERN = 'M12 2.6l2.8 5.9 6.5.8-4.8 4.5 1.2 6.4L12 17l-5.7 3.2 1.2-6.4L2.7 9.3l6.5-.8z';
let zaehler = 0;

/** Welches Symbol bewertet wird: Stern (Standard), Schneeflocke oder Glühweinbecher. Nur zum Ausprobieren im Admin-Bereich. */
export type Symbolart = 'stern' | 'flocke' | 'becher';
const KEY_SYMBOL = 'gluehlabor.symbol';
let symbol: Symbolart = (() => {
  try {
    const v = localStorage.getItem(KEY_SYMBOL);
    return v === 'flocke' || v === 'becher' ? v : 'stern';
  } catch {
    return 'stern';
  }
})();
const hoerer = new Set<(s: Symbolart) => void>();
export function setzeSymbol(s: Symbolart): void {
  symbol = s;
  try {
    localStorage.setItem(KEY_SYMBOL, s);
  } catch {
    /* egal */
  }
  hoerer.forEach((h) => h(s));
}
export function useSymbol(): Symbolart {
  const [s, setS] = useState<Symbolart>(symbol);
  useEffect(() => {
    hoerer.add(setS);
    return () => void hoerer.delete(setS);
  }, []);
  return s;
}

/** Ein einzelnes Symbol, `fuellung` von 0 (leer) bis 1 (voll). Stern und Flocke füllen von links, der Becher von unten wie Glühwein. */
export function Stern({ fuellung, groesse = 16, art }: { fuellung: number; groesse?: number; art?: Symbolart }) {
  const id = useMemo(() => `stern${++zaehler}`, []);
  const gewaehlt = useSymbol();
  const form = art ?? gewaehlt;
  const f = Math.max(0, Math.min(1, fuellung));
  const senkrecht = form === 'becher';
  const fuell = `url(#${id})`;
  return (
    <svg width={groesse} height={groesse} viewBox="0 0 24 24" aria-hidden="true" class="inline-block shrink-0">
      <defs>
        <linearGradient id={id} gradientUnits="userSpaceOnUse" x1={senkrecht ? 0 : 2} x2={senkrecht ? 0 : 22} y1={senkrecht ? 19 : 0} y2={senkrecht ? 7 : 0}>
          <stop offset={f} style={{ stopColor: 'var(--nm-stern)' }} />
          <stop offset={f} style={{ stopColor: 'var(--nm-stern-leer)' }} />
        </linearGradient>
      </defs>
      {form === 'stern' && <path d={STERN} fill={fuell} />}
      {form === 'flocke' && (
        <g stroke={fuell} stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" fill="none">
          {[0, 60, 120].map((w) => (
            <g transform={`rotate(${w} 12 12)`}>
              <path d="M12 2.5v19M9.2 5.2L12 8l2.8-2.8M9.2 18.8L12 16l2.8 2.8" />
            </g>
          ))}
        </g>
      )}
      {form === 'becher' && (
        <>
          <path d="M5 7h11v8a4 4 0 0 1-4 4H9a4 4 0 0 1-4-4z" fill={fuell} />
          <path d="M16 9h1.4a2.4 2.4 0 0 1 0 4.8H16" fill="none" style={{ stroke: 'var(--nm-stern-leer)' }} stroke-width="1.8" stroke-linecap="round" />
          <path d="M8.5 2.6c0 1.2 1 1.2 1 2.4M12 2.6c0 1.2 1 1.2 1 2.4" fill="none" style={{ stroke: 'var(--nm-stern-leer)' }} stroke-width="1.5" stroke-linecap="round" />
        </>
      )}
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
