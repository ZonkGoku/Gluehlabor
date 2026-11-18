// Seitenleiste für den Rechner (umschaltbar gegen die schwebende Leiste, siehe Einstellungen).
import { MARKE } from '../../marke';
import { Symbol } from '../Symbol';
import { SyncAnzeige } from '../SyncAnzeige';
import { MenueKnopf, ThemeKnopf } from './DarstellungKnoepfe';

const PUNKTE = [
  { route: '', label: 'Übersicht', symbol: 'uebersicht' },
  { route: 'rangliste', label: 'Rangliste', symbol: 'pokal' },
  { route: 'vergleich', label: 'Vergleich', symbol: 'vergleich' },
  { route: 'statistik', label: 'Statistik', symbol: 'statistik' },
  { route: 'spickzettel', label: 'Spickzettel', symbol: 'spickzettel' },
  { route: 'profil', label: 'Profil', symbol: 'profil' },
  { route: 'einstellungen', label: 'Einstellungen', symbol: 'einstellungen' },
] as const;

const KLEIN =
  'grid size-9 shrink-0 place-items-center rounded-full border border-rand bg-flaeche text-dunst transition duration-200 hover:text-gold-300 hover:bg-flaeche-hover cursor-pointer';

export function Seitenleiste({ route, zeigeSync }: { route: string; zeigeSync: boolean }) {
  const aktiv = (r: string) => route === r || (r === 'rangliste' && route.startsWith('becher/'));
  return (
    <aside aria-label="Menü" class="nm glas-stark fixed bottom-3.5 left-3.5 top-3.5 z-40 flex w-[248px] flex-col rounded-[28px] p-4">
      <a href="#/" class="flex flex-col items-center gap-2 pb-4 pt-1 text-eis" aria-label={`${MARKE.name}, zur Übersicht`}>
        <img src="./logo.png" alt="" class="size-[104px] rounded-full" />
        <span class="text-center leading-none">
          <span class="block font-display text-[26px] uppercase tracking-wider">{MARKE.name}</span>
          <span class="etikett mt-1.5 block !text-[9.5px]">{MARKE.claim}</span>
        </span>
      </a>

      <nav aria-label="Ansichten" class="flex flex-1 flex-col gap-1 overflow-y-auto">
        {PUNKTE.map((p) => (
          <a
            href={`#/${p.route}`}
            aria-current={aktiv(p.route) ? 'page' : undefined}
            class={`relative flex items-center gap-3 rounded-2xl px-3.5 py-2.5 text-[15px] font-medium transition duration-200 ${
              aktiv(p.route) ? 'bg-flaeche-hover text-gold-300' : 'text-dunst hover:bg-flaeche hover:text-eis'
            }`}
          >
            {aktiv(p.route) && (
              <span class="absolute inset-y-2 left-0 w-1 rounded-full" style={{ background: 'linear-gradient(180deg,var(--nm-licht-1),var(--color-wein-500))', boxShadow: '0 0 14px rgb(255 138 61 / 0.7)' }} />
            )}
            <Symbol name={p.symbol} groesse={20} />
            {p.label}
          </a>
        ))}
      </nav>

      <a
        href="#/erfassen"
        class="animate-puls mt-3 flex items-center justify-center gap-2 rounded-2xl py-3.5 font-display text-xl uppercase tracking-wide text-[#1a1020]"
        style={{ background: 'linear-gradient(135deg,#ffe29a,#ff8a3d 55%,#f0344f)' }}
      >
        <Symbol name="flamme" groesse={22} />
        Becher erfassen
      </a>

      <div class="mt-3 flex items-center gap-2 border-t border-rand pt-3">
        <ThemeKnopf klasse={KLEIN} />
        <MenueKnopf klasse={KLEIN} />
        <span class="flex-1" />
        {zeigeSync && <SyncAnzeige />}
      </div>
      <p class="mt-3 text-[11px] leading-snug text-dunst">Gemacht und betrieben von David (Bayern) &amp; Philip (Hamburg). Bewertet wird in ganz Deutschland.</p>
    </aside>
  );
}
