// Seitenleiste für den Rechner (umschaltbar gegen die schwebende Leiste, siehe Einstellungen).
import { MARKE } from '../../marke';
import { LogoMarke, Wortmarke } from './Logo';
import { Symbol } from '../Symbol';
import { SyncAnzeige } from '../SyncAnzeige';
import { MenueKnopf, SpracheKnopf, ThemeKnopf } from './DarstellungKnoepfe';
import { t } from '../../i18n';

const PUNKTE = [
  { route: '', label: 'Start', symbol: 'uebersicht' },
  { route: 'rangliste', label: 'Rangliste', symbol: 'pokal' },
  { route: 'profil', label: 'Ich', symbol: 'profil' },
] as const;
/** Seltener gebraucht: eigene, kleinere Gruppe. */
const MEHR = [
  { route: 'spickzettel', label: 'Hilfe & Regeln', symbol: 'spickzettel' },
  { route: 'vergleich', label: 'Vergleich', symbol: 'vergleich' },
  { route: 'statistik', label: 'Statistik', symbol: 'statistik' },
  { route: 'einstellungen', label: 'Einstellungen', symbol: 'einstellungen' },
] as const;

const KLEIN =
  'grid size-9 shrink-0 place-items-center rounded-full border border-rand bg-flaeche text-dunst transition duration-200 hover:text-gold-300 hover:bg-flaeche-hover cursor-pointer';

export function Seitenleiste({ route, zeigeSync }: { route: string; zeigeSync: boolean }) {
  const aktiv = (r: string) => route === r || (r === 'rangliste' && (route.startsWith('becher/') || route.startsWith('stand/')));
  const link = (p: { route: string; label: string; symbol: string }, klein = false) => (
    <a
      href={`#/${p.route}`}
      aria-current={aktiv(p.route) ? 'page' : undefined}
      class={`relative flex min-h-[44px] items-center gap-3 rounded-2xl px-3.5 ${klein ? 'py-2 text-sm' : 'py-2.5 text-[15px]'} font-medium transition duration-200 ${
        aktiv(p.route) ? 'bg-flaeche-hover text-gold-300' : 'text-dunst hover:bg-flaeche hover:text-eis'
      }`}
    >
      {aktiv(p.route) && (
        <span class="absolute inset-y-2 left-0 w-1 rounded-full" style={{ background: 'linear-gradient(180deg,var(--nm-licht-1),var(--color-wein-500))', boxShadow: '0 0 14px rgb(255 138 61 / 0.7)' }} />
      )}
      <Symbol name={p.symbol} groesse={klein ? 18 : 20} />
      {t(p.label)}
    </a>
  );
  return (
    <aside aria-label={t('Menü')} class="nm glas-stark fixed bottom-3.5 left-3.5 top-3.5 z-40 flex w-[248px] flex-col rounded-[28px] p-4">
      <a href="#/" class="flex flex-col items-center gap-2 pb-4 pt-1 text-eis" aria-label={t('{name}, zur Übersicht', { name: MARKE.name })}>
        <LogoMarke groesse={112} />
        <Wortmarke gross klasse="items-center text-center" />
      </a>

      <nav aria-label={t('Ansichten')} class="flex flex-1 flex-col gap-1 overflow-y-auto">
        {PUNKTE.map((p) => link(p))}
        <p class="etikett mt-3 px-3.5 pb-1">{t('Mehr')}</p>
        {MEHR.map((p) => link(p, true))}
      </nav>

      <a
        href="#/erfassen"
        class="animate-puls mt-3 flex items-center justify-center gap-2 rounded-2xl py-3.5 font-display text-xl uppercase tracking-wide text-[#1a1020]"
        style={{ background: 'linear-gradient(135deg,#ffe29a,#ff8a3d 55%,#f0344f)' }}
      >
        <Symbol name="becher" groesse={22} />
        {t('Becher erfassen')}
      </a>

      <div class="mt-3 flex items-center gap-2 border-t border-rand pt-3">
        <SpracheKnopf klasse={KLEIN} />
        <ThemeKnopf klasse={KLEIN} />
        <MenueKnopf klasse={KLEIN} />
        <span class="flex-1" />
        {zeigeSync && <SyncAnzeige />}
      </div>
      <p class="mt-3 text-[11px] leading-snug text-dunst">{t('Gemacht und betrieben von David (Bayern) & Philip (Hamburg). Bewertet wird in ganz Deutschland.')}</p>
    </aside>
  );
}
