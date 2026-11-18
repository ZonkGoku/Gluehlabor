// Zeile der Rangliste ab Platz 4 und in der Top 5 der Übersicht. Leicht gehalten: kein Glasfilter, damit lange Listen flüssig bleiben.
import type { Zeile } from '../../lib/auswertung';
import { zahl2 } from '../../lib/format';
import { stufe } from './Ticket';

export function RangZeile({ zeile, ort }: { zeile: Zeile; ort?: string }) {
  const { eintrag: e, wertung: w, rang } = zeile;
  const s = stufe(rang);
  return (
    <a
      href={`#/becher/${encodeURIComponent(e.id)}`}
      class="group relative flex items-center gap-3 rounded-2xl border border-white/[0.07] bg-white/[0.04] px-3.5 py-3 text-eis no-underline transition duration-200 hover:border-white/20 hover:bg-white/[0.08] hover:shadow-[0_0_40px_-14px_var(--glow)]"
      style={{ '--glow': s.glow }}
    >
      <span
        class="w-9 shrink-0 text-center font-display text-[28px] leading-none"
        style={rang !== null && rang <= 3 ? { backgroundImage: s.rahmen, WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent' } : { color: '#a3accb' }}
      >
        {rang ?? '–'}
      </span>
      <span class="min-w-0 flex-1">
        <span class="block truncate font-semibold">{e.stand}</span>
        <span class="block truncate text-xs text-dunst">{ort ?? `${e.markt} · ${e.saison}`}</span>
        <span class="mt-1.5 block h-1 overflow-hidden rounded-full bg-white/10">
          <span
            class="block h-full rounded-full"
            style={{ width: `${(w.gesamt ?? 0) * 10}%`, background: 'linear-gradient(90deg,#ffc857,#ff8a3d 60%,#f0344f)' }}
          />
        </span>
      </span>
      <span class="font-display text-[30px] leading-none text-gold-300">{zahl2(w.gesamt)}</span>
    </a>
  );
}
