// Ticket-Karte: so sieht eine Bewertung aus, wenn man sie als Screenshot in die Story legt.
// Verlaufsrahmen nach Platz (Gold, Silber, Kupfer), Kerben an der Abrisslinie, QR-Code-Stummel, Schimmer auf Platz 1.
import type { ComponentChildren } from 'preact';
import { useMemo, useState } from 'preact/hooks';
import type { Zeile } from '../../lib/auswertung';
import { anzeigeName, istPruefstelle } from '../../lib/community';
import { sterneText } from '../../lib/format';
import { sterne1 } from '../../lib/scoring';
import { Sterne } from './SterneWert';
import { UrteilPill } from '../bausteine';
import { DealMarke } from './DealMarke';
import { PruefSiegel } from './PruefSiegel';
import { Symbol } from '../Symbol';
import { useNeigung, useZaehler } from './bewegung';
import { kartenDaten, teileKartenBild } from './karteBild';
import { qrModule } from './qr';
import { kurzId } from './kennung';
import { t } from '../../i18n';

/** Farben je Platz: Rahmenverlauf und Leuchtfarbe. */
const STUFEN = {
  1: { rahmen: 'linear-gradient(135deg,#ffe29a,#ff8a3d 50%,#f0344f)', glow: 'rgb(255 138 61 / 0.55)', name: 'Gold' },
  2: { rahmen: 'linear-gradient(135deg,#f4f7ff,#9fb0e8 50%,#5d6fb8)', glow: 'rgb(150 170 255 / 0.45)', name: 'Silber' },
  3: { rahmen: 'linear-gradient(135deg,#ffd2ae,#e08a45 50%,#9a4630)', glow: 'rgb(224 138 69 / 0.45)', name: 'Kupfer' },
} as const;
const NORMAL = { rahmen: 'linear-gradient(135deg,rgb(255 255 255/.22),rgb(255 255 255/.06))', glow: 'rgb(163 172 203 / 0.25)', name: '' };

export const stufe = (rang: number | null) => (rang === 1 || rang === 2 || rang === 3 ? STUFEN[rang] : NORMAL);

export { kurzId } from './kennung';

/**
 * Echter QR-Code zur Karte: öffnet den Stand bzw. die Bewertung. Immer schwarz auf weiß mit schmaler Ruhezone,
 * damit er sich auch vom Bildschirm scannen lässt (auf der Story-Karte groß, hier klein als Abriss-Stummel).
 */
function QrStummel({ link, titel }: { link: string; titel: string }) {
  const module = useMemo(() => qrModule(link), [link]);
  const n = module.length;
  const rand = 1;
  let pfad = '';
  module.forEach((zeile, r) => zeile.forEach((dunkel, c) => dunkel && (pfad += `M${c} ${r}h1v1h-1z`)));
  return (
    <svg viewBox={`${-rand} ${-rand} ${n + 2 * rand} ${n + 2 * rand}`} class="size-[58px] shrink-0 rounded-md bg-white" shape-rendering="crispEdges" role="img" aria-label={titel}>
      <path d={pfad} fill="#000" />
    </svg>
  );
}

interface RahmenProps {
  rang: number | null;
  klein?: boolean;
  kinder: ComponentChildren;
  stummel: ComponentChildren | null;
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
      <div class={`${stummel ? 'ticket-kerbe ' : ''}rahmen-licht glas relative flex h-full flex-col overflow-hidden rounded-[28px]`} style={{ '--rahmen': s.rahmen }}>
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
        {stummel && (
          <>
            <div class="relative z-10 border-t-2 border-dashed border-[var(--nm-rand-stark)]" />
            <div class="relative z-10 flex min-h-[74px] items-center gap-3 px-5 py-3">{stummel}</div>
          </>
        )}
      </div>
    </div>
  );
}

function Messer({ etikett, wert }: { etikett: string; wert: number | null }) {
  return (
    <div>
      <div class="flex items-baseline justify-between gap-2">
        <span class="etikett !text-[11px] !tracking-[0.1em]">{etikett}</span>
        <span class="inline-flex items-center gap-1.5 whitespace-nowrap font-mono text-xs text-eis">
          {sterneText(wert)}
          <Sterne wert={wert} groesse={13} />
        </span>
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
  /** Prüfsiegel zeigen (Stand mit Bewertung der Prüfstelle). */
  siegel?: boolean;
  /** „Top Deal"-Marke neben dem Urteil. */
  deal?: boolean;
  /** Schlicht: ohne Stempel, Messer und QR-Abriss (Rangliste). Teilen und QR gibt es auf der Stand-Seite. */
  schlicht?: boolean;
}

/** Kopfteil der Karte: Link zur Detailseite oder einfacher Block. */
function Inhalt({ href, klein, children }: { href?: string; klein?: boolean; children: ComponentChildren }) {
  const klasse = `block h-full text-eis no-underline ${klein ? 'p-4 pb-3' : 'p-5 pb-4'}`;
  return href ? (
    <a href={href} class={klasse}>
      {children}
    </a>
  ) : (
    <div class={klasse}>{children}</div>
  );
}

/** Die Karte für einen Spitzenplatz. */
export function TopKarte({ zeile, ort, titel, hinweis, klein = false, klasse, ohneLink = false, href, stempel, von, teilenLink, siegel = false, deal = false, schlicht = false }: TopKarteProps) {
  const { eintrag: e, wertung: w, rang } = zeile;
  const pruef = istPruefstelle(e);
  const zeigeSiegel = siegel || (stempel === undefined && pruef);
  const zahl = useZaehler(w.gesamt === null ? null : sterne1(w.gesamt), 1);
  const [meldung, setMeldung] = useState('');
  const link = `${location.origin}${location.pathname}${teilenLink ?? `#/becher/${encodeURIComponent(e.id)}`}`;
  const teilen = async (ev: Event) => {
    ev.preventDefault();
    ev.stopPropagation();
    setMeldung(t('Erzeuge …'));
    const r = await teileKartenBild(kartenDaten(zeile, ort, link, titel, stempel === undefined ? undefined : { stempel, von, geprueft: zeigeSiegel }), link);
    setMeldung(r === 'gespeichert' ? t('Bild gespeichert') : '');
    if (r === 'gespeichert') setTimeout(() => setMeldung(''), 2600);
  };
  return (
    <TicketRahmen
      rang={rang}
      klein={klein}
      klasse={klasse}
      kinder={
        <Inhalt klein={klein} href={ohneLink ? undefined : (href ?? `#/becher/${encodeURIComponent(e.id)}`)}>
          <div class="flex items-start justify-between gap-3">
            <div class="flex items-baseline gap-2">
              <span class={`font-display leading-none licht-text ${klein ? 'text-[40px]' : 'text-[52px]'}`}>{String(rang ?? '–')}</span>
              <span class={`etikett ${klein && zeigeSiegel ? 'hidden' : ''}`}>{t('Platz')}</span>
            </div>
            <div class="flex items-center gap-2">
            {zeigeSiegel && <PruefSiegel groesse={klein ? 34 : 42} />}
            {schlicht ? null : stempel !== undefined ? (
              <span class="whitespace-nowrap rounded-md border border-[var(--nm-rand-stark)] px-2 py-1 font-mono text-[11px] uppercase tracking-[0.14em] text-dunst">{stempel}</span>
            ) : pruef ? (
              <span class="-rotate-3 rounded-md border border-gold-400/70 px-2 py-1 font-mono text-[11px] uppercase tracking-[0.18em] text-gold-300">
                {t('Prüfstelle')}
              </span>
            ) : (
              <span class="rounded-md border border-[var(--nm-rand-stark)] px-2 py-1 font-mono text-[11px] uppercase tracking-[0.18em] text-dunst">{t('Community')}</span>
            )}
            </div>
          </div>
          <h2 class={`${klein ? 'mt-2' : 'mt-3'} line-clamp-2 font-display uppercase leading-[0.98] tracking-wide text-eis ${klein ? 'min-h-[1.96em] text-[27px]' : 'text-[36px]'}`}>
            {titel ?? e.stand}
          </h2>
          <p class={`mt-1 text-sm text-dunst ${klein ? 'truncate' : ''}`} title={hinweis ? `${hinweis} · ${ort}` : ort}>{hinweis ? `${hinweis} · ${ort}` : ort}</p>
          <div class={`flex flex-wrap items-end gap-x-4 gap-y-2 ${klein ? 'mt-2' : 'mt-3'}`}>
            <div
              class={`font-display leading-[0.9] licht-text drop-shadow-[0_0_26px_rgb(255_138_61/0.55)] ${klein ? 'text-[60px]' : 'text-[112px]'}`}
              aria-label={t('Gesamtwertung {n} von 5 Sternen', { n: sterneText(w.gesamt) })}
            >
              {zahl}
              <div class="mt-2"><Sterne wert={w.gesamt} groesse={klein ? 18 : 24} /></div>
            </div>
            {!schlicht && (
              <div class="min-w-[8.5rem] flex-1 basis-[8.5rem] space-y-2 pb-1.5">
                <Messer etikett={t('Glühwein')} wert={w.gluehwein} />
                <Messer etikett={t('Drumherum')} wert={w.drumherum} />
              </div>
            )}
          </div>
          <div class={`flex flex-wrap items-center gap-2 ${klein ? 'mt-2' : 'mt-3'}`}>
            <UrteilPill urteil={w.urteil} />
            {deal && <DealMarke gross />}
          </div>
        </Inhalt>
      }
      stummel={
        schlicht ? null : (
        <>
          <QrStummel link={link} titel={t('QR-Code: öffnet {stand}', { stand: titel ?? e.stand })} />
          <div class="min-w-0 flex-1 leading-tight">
            <div class="etikett truncate whitespace-nowrap !text-[11px] !tracking-[0.12em]">
              {e.saison} · #{kurzId(e.id)}
            </div>
            <div class="truncate text-xs text-dunst">{von ?? (pruef ? t('von David & Philip') : t('bewertet von {name}', { name: anzeigeName(e) }))}</div>
          </div>
          <button
            type="button"
            onClick={teilen}
            class="glas flex min-h-[44px] shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full px-4 text-xs font-semibold text-gold-300 transition hover:text-gold-400"
          >
            <Symbol name="teilen" groesse={15} />
            {meldung || t('Teilen')}
          </button>
        </>
        )
      }
    />
  );
}
