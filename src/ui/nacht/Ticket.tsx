// Ticket-Karte: so sieht eine Bewertung aus, wenn man sie als Screenshot in die Story legt.
// Verlaufsrahmen nach Platz (Gold, Silber, Kupfer), Kerben an der Abrisslinie, Strichcode-Stummel, Schimmer auf Platz 1.
import type { ComponentChildren } from 'preact';
import { useState } from 'preact/hooks';
import type { Zeile } from '../../lib/auswertung';
import { anzeigeName, istPruefstelle } from '../../lib/community';
import { zahl2 } from '../../lib/format';
import { UrteilPill } from '../bausteine';
import { Symbol } from '../Symbol';
import { useNeigung, useZaehler } from './bewegung';
import { kartenDaten, teileKartenBild } from './karteBild';
import { kurzId } from './kennung';

/** Farben je Platz: Rahmenverlauf und Leuchtfarbe. */
const STUFEN = {
  1: { rahmen: 'linear-gradient(135deg,#ffe29a,#ff8a3d 50%,#f0344f)', glow: 'rgb(255 138 61 / 0.55)', name: 'Gold' },
  2: { rahmen: 'linear-gradient(135deg,#f4f7ff,#9fb0e8 50%,#5d6fb8)', glow: 'rgb(150 170 255 / 0.45)', name: 'Silber' },
  3: { rahmen: 'linear-gradient(135deg,#ffd2ae,#e08a45 50%,#9a4630)', glow: 'rgb(224 138 69 / 0.45)', name: 'Kupfer' },
} as const;
const NORMAL = { rahmen: 'linear-gradient(135deg,rgb(255 255 255/.22),rgb(255 255 255/.06))', glow: 'rgb(163 172 203 / 0.25)', name: '' };

export const stufe = (rang: number | null) => (rang === 1 || rang === 2 || rang === 3 ? STUFEN[rang] : NORMAL);

export { kurzId } from './kennung';

/** Strichcode, der nur aus der ID entsteht. Dekor, kein echter Code. */
function Strichcode({ id }: { id: string }) {
  let h = 2166136261;
  const balken: number[] = [];
  for (let i = 0; i < 34; i++) {
    h = Math.imul(h ^ (id.charCodeAt(i % id.length) + i), 16777619);
    balken.push(1 + ((h >>> 0) % 3));
  }
  let x = 0;
  return (
    <svg viewBox="0 0 120 26" class="hidden h-6 w-[70px] shrink-0 text-eis/80 @[300px]:block" aria-hidden="true" preserveAspectRatio="none">
      {balken.map((b, i) => {
        const r = <rect x={x} y="0" width={b * 0.9} height="26" fill="currentColor" opacity={i % 5 === 0 ? 1 : 0.75} />;
        x += b * 0.9 + 1.2;
        return r;
      })}
    </svg>
  );
}

interface RahmenProps {
  rang: number | null;
  klein?: boolean;
  kinder: ComponentChildren;
  stummel: ComponentChildren;
  /** zusätzliche Klassen der äußeren Hülle */
  klasse?: string;
}

/** Hülle mit Rahmen, Kerben, Leuchten beim Darüberfahren und Neigung zur Maus. */
export function TicketRahmen({ rang, klein, kinder, stummel, klasse = '' }: RahmenProps) {
  const ref = useNeigung<HTMLDivElement>(klein ? 5 : 7);
  const s = stufe(rang);
  const erster = rang === 1;
  return (
    <div
      ref={ref}
      class={`nm group @container h-full rounded-[28px] shadow-[0_0_46px_-24px_var(--glow)] transition-shadow duration-300 hover:shadow-[0_0_84px_-14px_var(--glow)] will-change-transform ${klasse}`}
      style={{ '--glow': s.glow }}
    >
      <div class="ticket-kerbe rahmen-licht glas relative flex h-full flex-col overflow-hidden rounded-[28px]" style={{ '--rahmen': s.rahmen }}>
        {/* Lichtfleck folgt der Maus */}
        <div
          aria-hidden="true"
          class="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100"
          style={{ background: 'radial-gradient(420px circle at var(--mx,50%) var(--my,30%), rgb(255 226 154 / 0.14), transparent 62%)' }}
        />
        {erster && (
          <div aria-hidden="true" class="pointer-events-none absolute inset-0 overflow-hidden">
            <span class="animate-schimmer absolute inset-y-0 left-0 w-1/3 bg-gradient-to-r from-transparent via-white/[0.18] to-transparent" />
          </div>
        )}
        {/* Schnee auf der Karte: eine weiche Haube am oberen Rand */}
        <svg aria-hidden="true" viewBox="0 0 400 22" preserveAspectRatio="none" class="pointer-events-none absolute inset-x-0 top-0 z-20 h-[14px] w-full">
          <path
            d="M0 0H400V7C384 14 372 6 356 11C340 17 326 8 308 12C292 16 280 7 262 11C246 15 232 6 214 11C198 16 186 8 168 12C152 16 138 7 120 11C104 15 92 8 76 12C60 16 46 8 30 12C16 15 8 10 0 13Z"
            style={{ fill: 'light-dark(#e9eefc, #f4f7ff)', filter: 'drop-shadow(0 1px 1px rgb(120 140 200 / 0.35))' }}
          />
        </svg>
        <div class="relative z-10 flex-1">{kinder}</div>
        {/* Abrisslinie */}
        <div class="relative z-10 border-t-2 border-dashed border-[var(--nm-rand-stark)]" />
        <div class="relative z-10 flex min-h-[74px] items-center gap-3 px-5 py-3">{stummel}</div>
      </div>
    </div>
  );
}

function Messer({ etikett, wert }: { etikett: string; wert: number | null }) {
  return (
    <div>
      <div class="flex items-baseline justify-between gap-2">
        <span class="etikett !text-[10px] !tracking-[0.1em]">{etikett}</span>
        <span class="whitespace-nowrap font-mono text-xs text-eis">{zahl2(wert)}</span>
      </div>
      <div class="mt-1 h-1.5 overflow-hidden rounded-full bg-spur">
        <div
          class="h-full rounded-full"
          style={{
            width: `${(wert ?? 0) * 10}%`,
            background: 'linear-gradient(90deg,var(--nm-licht-1),var(--color-glut-500) 60%,var(--color-wein-500))',
            boxShadow: '0 0 12px rgb(255 138 61 / 0.7)',
          }}
        />
      </div>
    </div>
  );
}

interface TopKarteProps {
  zeile: Zeile;
  ort: string;
  /** Überschreibt den Standnamen, etwa bei geteiltem ersten Platz. */
  titel?: string;
  hinweis?: string;
  klein?: boolean;
  klasse?: string;
  /** Auf der Detailseite selbst führt die Karte nirgendwohin. */
  ohneLink?: boolean;
  /** Ziel der Karte, wenn nicht der einzelne Becher (z. B. die Stand-Seite). */
  href?: string;
  /** Statt Prüfstelle/Community: Beschriftung des Stempels oben rechts (z. B. 12 Bewertungen). */
  stempel?: string;
  /** Zeile im Abriss unten statt bewertet von. */
  von?: string;
  /** Adresse, die beim Teilen mitgeht. */
  teilenLink?: string;
}

/** Kopfteil der Karte: Link zur Detailseite oder einfacher Block. */
function Inhalt({ href, children }: { href?: string; children: ComponentChildren }) {
  const klasse = 'block h-full p-5 pb-4 text-eis no-underline';
  return href ? (
    <a href={href} class={klasse}>
      {children}
    </a>
  ) : (
    <div class={klasse}>{children}</div>
  );
}

/** Die Karte für einen Spitzenplatz. */
export function TopKarte({ zeile, ort, titel, hinweis, klein = false, klasse, ohneLink = false, href, stempel, von, teilenLink }: TopKarteProps) {
  const { eintrag: e, wertung: w, rang } = zeile;
  const pruef = istPruefstelle(e);
  const zahl = useZaehler(w.gesamt);
  const [meldung, setMeldung] = useState('');
  const teilen = async (ev: Event) => {
    ev.preventDefault();
    ev.stopPropagation();
    setMeldung('Erzeuge …');
    const link = `${location.origin}${location.pathname}${teilenLink ?? `#/becher/${encodeURIComponent(e.id)}`}`;
    const r = await teileKartenBild(kartenDaten(zeile, ort, titel, stempel === undefined ? undefined : { stempel, von }), link);
    setMeldung(r === 'gespeichert' ? 'Bild gespeichert' : '');
    if (r === 'gespeichert') setTimeout(() => setMeldung(''), 2600);
  };
  return (
    <TicketRahmen
      rang={rang}
      klein={klein}
      klasse={klasse}
      kinder={
        <Inhalt href={ohneLink ? undefined : (href ?? `#/becher/${encodeURIComponent(e.id)}`)}>
          <div class="flex items-start justify-between gap-3">
            <div class="flex items-baseline gap-2">
              <span class={`font-display leading-none licht-text ${klein ? 'text-[40px]' : 'text-[52px]'}`}>{String(rang ?? '–').padStart(2, '0')}</span>
              <span class="etikett">Platz</span>
            </div>
            {stempel !== undefined ? (
              <span class="whitespace-nowrap rounded-md border border-[var(--nm-rand-stark)] px-2 py-1 font-mono text-[10px] uppercase tracking-[0.14em] text-dunst">{stempel}</span>
            ) : pruef ? (
              <span class="-rotate-3 rounded-md border border-gold-400/70 px-2 py-1 font-mono text-[10px] uppercase tracking-[0.18em] text-gold-300">
                Prüfstelle
              </span>
            ) : (
              <span class="rounded-md border border-[var(--nm-rand-stark)] px-2 py-1 font-mono text-[10px] uppercase tracking-[0.18em] text-dunst">Community</span>
            )}
          </div>
          <h2 class={`mt-3 line-clamp-2 font-display uppercase leading-[0.98] tracking-wide text-eis ${klein ? 'min-h-[1.96em] text-[27px]' : 'text-[36px]'}`}>
            {titel ?? e.stand}
          </h2>
          <p class={`mt-1 text-sm text-dunst ${klein ? 'truncate' : ''}`} title={hinweis ? `${hinweis} · ${ort}` : ort}>{hinweis ? `${hinweis} · ${ort}` : ort}</p>
          <div class="mt-3 flex flex-wrap items-end gap-x-4 gap-y-2">
            <div
              class={`font-display leading-[0.9] licht-text drop-shadow-[0_0_26px_rgb(255_138_61/0.55)] ${klein ? 'text-[72px]' : 'text-[112px]'}`}
              aria-label={`Gesamtnote ${zahl2(w.gesamt)}`}
            >
              {zahl}
            </div>
            <div class="min-w-[8.5rem] flex-1 basis-[8.5rem] space-y-2 pb-1.5">
              <Messer etikett="Glühwein" wert={w.gluehwein} />
              <Messer etikett="Drumherum" wert={w.drumherum} />
            </div>
          </div>
          <div class="mt-3">
            <UrteilPill urteil={w.urteil} />
          </div>
        </Inhalt>
      }
      stummel={
        <>
          <Strichcode id={e.id} />
          <div class="min-w-0 flex-1 leading-tight">
            <div class="etikett truncate whitespace-nowrap !text-[9.5px] !tracking-[0.12em]">
              {e.saison} · #{kurzId(e.id)}
            </div>
            <div class="truncate text-xs text-dunst">{von ?? (pruef ? 'von David & Philip' : `bewertet von ${anzeigeName(e)}`)}</div>
          </div>
          <button
            type="button"
            onClick={teilen}
            class="glas flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full px-3.5 py-2 text-xs font-semibold text-gold-300 transition hover:text-gold-400"
          >
            <Symbol name="teilen" groesse={15} />
            {meldung || 'Teilen'}
          </button>
        </>
      }
    />
  );
}
