// Schwebende Navigation: eine Milchglas-Pille am unteren Rand, in der Mitte der Knopf zum Erfassen.
// Die aktive Stelle ist eine leuchtende Blase, die per Feder zum neuen Platz wandert.
import { animate } from 'motion';
import { useEffect, useRef } from 'preact/hooks';
import { Symbol } from '../Symbol';
import { weniger } from './bewegung';
import { t } from '../../i18n';

const PUNKTE = [
  { route: '', label: 'Start', symbol: 'uebersicht' },
  { route: 'rangliste', label: 'Rangliste', symbol: 'pokal' },
  null, // Platz des Erfassen-Knopfs
  { route: 'mehr', label: 'Mehr', symbol: 'menue' },
  { route: 'profil', label: 'Ich', symbol: 'profil' },
] as const;

/** Ansichten, die unter „Mehr" hängen, und die Seiten, die zur Rangliste gehören. */
const UNTER_MEHR = ['entdecken', 'schlittenfahren', 'schlittenrennen', 'kamelrennen', 'vergleich', 'statistik', 'spickzettel', 'einstellungen', 'impressum', 'datenschutz', 'moderation'];

export function platz(route: string): number {
  if (route.startsWith('becher/') || route.startsWith('stand/')) return 1;
  if (route.startsWith('schlittenfahren/') || route.startsWith('schlittenrennen/') || route.startsWith('kamelrennen/')) return 3;
  if (UNTER_MEHR.includes(route)) return 3;
  if (route === 'meine' || route.startsWith('aendern/')) return PUNKTE.findIndex((p) => p !== null && p.route === 'profil');
  return PUNKTE.findIndex((p) => p !== null && p.route === route);
}

export function Navigation({ route }: { route: string }) {
  const blase = useRef<HTMLSpanElement>(null);
  const erstes = useRef(true);
  const idx = platz(route);

  useEffect(() => {
    const el = blase.current;
    if (!el) return;
    const ziel = `translateX(${Math.max(idx, 0) * 100}%)`;
    if (erstes.current || weniger()) {
      el.style.transform = ziel;
      erstes.current = false;
    } else {
      animate(el, { transform: ziel }, { type: 'spring', stiffness: 380, damping: 30 });
    }
    el.style.opacity = idx < 0 ? '0' : '1';
  }, [idx]);

  return (
    <nav
      aria-label={t('Ansichten')}
      data-schwebende-leiste
      class="nm glas-stark fixed left-1/2 z-40 w-[min(92vw,440px)] -translate-x-1/2 rounded-full p-1.5"
      style={{ bottom: 'calc(env(safe-area-inset-bottom) + 14px)' }}
    >
      <div class="relative grid grid-cols-5 items-center">
        {/* Leuchtende Blase hinter dem aktiven Symbol */}
        <span
          ref={blase}
          aria-hidden="true"
          class="absolute inset-y-0 left-0 w-1/5 p-0.5 transition-opacity duration-200"
          style={{ transform: 'translateX(0%)' }}
        >
          <span
            class="block h-full w-full rounded-full"
            style={{
              background: 'linear-gradient(160deg, rgb(255 200 87 / 0.22), rgb(240 52 79 / 0.2))',
              boxShadow: '0 0 28px -4px rgb(255 138 61 / 0.55), inset 0 1px 0 rgb(255 255 255 / 0.18)',
            }}
          />
        </span>

        {PUNKTE.map((p, i) =>
          p === null ? (
            <a
              key="plus"
              href="#/erfassen"
              aria-label={t('Bewerten')}
              class="animate-puls relative z-10 mx-auto -mt-7 flex h-[64px] w-[76px] flex-col items-center justify-center gap-0.5 rounded-[22px] text-[#1a1020] no-underline"
              style={{ background: 'linear-gradient(145deg, #ffe29a, #ff8a3d 55%, #f0344f)' }}
            >
              <Symbol name="plus" groesse={26} />
              <span class="text-[12px] font-bold leading-none">{t('Bewerten')}</span>
            </a>
          ) : (
            <a
              key={p.route}
              href={`#/${p.route}`}
              aria-current={idx === i ? 'page' : undefined}
              class={`relative z-10 flex flex-col items-center gap-0.5 rounded-full py-2 text-xs font-medium tracking-wide no-underline transition-colors duration-200 ${
                idx === i ? 'text-gold-300' : 'text-dunst'
              }`}
            >
              <Symbol name={p.symbol} groesse={22} />
              {t(p.label)}
            </a>
          ),
        )}
      </div>
    </nav>
  );
}
