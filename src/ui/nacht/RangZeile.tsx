// Zeile der Rangliste ab Platz 4 und in der Top 5 der Übersicht. Leicht gehalten: kein Glasfilter, damit lange Listen flüssig bleiben.
import type { Zeile } from '../../lib/auswertung';
import { DealMarke } from './DealMarke';
import { PruefSiegel } from './PruefSiegel';
import { SterneZeile } from './SterneWert';
import { stufe } from './Ticket';

export function RangZeile({ zeile, ort, href, anzahl, siegel = false, deal = false }: { zeile: Zeile; ort?: string; href?: string; anzahl?: number; siegel?: boolean; deal?: boolean }) {
  const { eintrag: e, wertung: w, rang } = zeile;
  const s = stufe(rang);
  return (
    <a
      href={href ?? `#/becher/${encodeURIComponent(e.id)}`}
      class="group relative flex items-center gap-3 rounded-2xl border border-rand bg-flaeche px-3.5 py-3 text-eis no-underline transition duration-200 hover:border-[var(--nm-rand-stark)] hover:bg-flaeche-hover hover:shadow-[0_0_40px_-14px_var(--glow)]"
      style={{ '--glow': s.glow }}
    >
      <span
        class="w-9 shrink-0 text-center font-display text-[28px] leading-none"
        style={rang !== null && rang <= 3 ? { backgroundImage: s.rahmen, WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent' } : { color: 'var(--nm-text-2)' }}
      >
        {rang ?? '–'}
      </span>
      <span class="min-w-0 flex-1">
        <span class="flex items-center gap-1.5">
          <span class="truncate text-[17px] font-semibold leading-tight">{e.stand}</span>
          {siegel && <PruefSiegel groesse={18} />}
        </span>
        <span class="mt-1 block text-sm"><SterneZeile wert={w.gesamt} anzahl={anzahl} /></span>
        <span class="mt-1 flex min-w-0 items-center gap-2 text-sm text-dunst">
          {deal && <DealMarke />}
          <span class="truncate">{ort ?? e.markt}</span>
        </span>
      </span>
    </a>
  );
}
