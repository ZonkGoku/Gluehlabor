// Netzdiagramm (Radar) über die sieben Kriterien. Mehrere Reihen übereinander, z. B. diese Bewertung gegen den Durchschnitt.
import { t } from '../i18n';
import { alsPunktliste, achsenWinkel, netzPunkt, reihenPunkte } from '../lib/netz';

export interface Reihe {
  name: string;
  /** Wert 1..10 je Achse; null = nicht bewertet (kein Punkt, nie 0). */
  werte: (number | null)[];
  farbe: string;
  gestrichelt?: boolean;
  /** Fläche füllen. */
  flaeche?: boolean;
}

const B = 440;
const H = 300;
const MITTE = { x: B / 2, y: H / 2 };
const RADIUS = 96;
const RINGE = [2, 4, 6, 8, 10];

export function Netzdiagramm({ achsen, reihen, titel }: { achsen: string[]; reihen: Reihe[]; titel: string }) {
  const n = achsen.length;
  const beschreibung = reihen
    .map((r) => `${r.name}: ${achsen.map((a, i) => `${a} ${r.werte[i] ?? t('nicht bewertet')}`).join(', ')}`)
    .join('. ');
  return (
    <figure class="m-0">
      <svg viewBox={`0 0 ${B} ${H}`} class="mx-auto block h-auto w-full max-w-[420px]" role="img" aria-label={`${titel}. ${beschreibung}`}>
        {/* Ringe (Stufen 2, 4, 6, 8, 10) und Achsen */}
        {RINGE.map((ring) => (
          <polygon
            points={alsPunktliste(achsen.map((_, i) => netzPunkt(i, n, ring, RADIUS, MITTE)))}
            fill="none"
            style={{ stroke: ring === 10 ? 'var(--nm-rand-stark)' : 'var(--nm-rand)' }}
            stroke-width={ring === 10 ? 1.4 : 1}
          />
        ))}
        {achsen.map((_, i) => {
          const ende = netzPunkt(i, n, 10, RADIUS, MITTE);
          return <line x1={MITTE.x} y1={MITTE.y} x2={ende.x} y2={ende.y} style={{ stroke: 'var(--nm-rand)' }} stroke-width="1" />;
        })}
        {/* Beschriftung der Achsen */}
        <g class="text-dunst" fill="currentColor" font-size="11.5" font-family="IBM Plex Sans, system-ui, sans-serif">
          {achsen.map((a, i) => {
            const w = achsenWinkel(i, n);
            const p = netzPunkt(i, n, 10, RADIUS + 16, MITTE);
            const cos = Math.cos(w);
            const anker = Math.abs(cos) < 0.25 ? 'middle' : cos > 0 ? 'start' : 'end';
            return (
              <text x={p.x} y={p.y} text-anchor={anker} dominant-baseline="middle">
                {a}
              </text>
            );
          })}
        </g>
        {/* Ringwerte entlang der ersten Achse */}
        <g class="text-dunst" fill="currentColor" font-size="8.5" opacity="0.7" font-family="IBM Plex Mono, monospace">
          {RINGE.map((ring) => {
            const p = netzPunkt(0, n, ring, RADIUS, MITTE);
            return (
              <text x={p.x + 3} y={p.y - 2}>
                {ring}
              </text>
            );
          })}
        </g>
        {reihen.map((r) => {
          const punkte = reihenPunkte(r.werte, RADIUS, MITTE);
          return (
            <g>
              {punkte.length >= 3 && (
                <polygon
                  points={alsPunktliste(punkte)}
                  fill={r.flaeche ? r.farbe : 'none'}
                  fill-opacity={r.flaeche ? 0.22 : 0}
                  stroke={r.farbe}
                  stroke-width="2.4"
                  stroke-linejoin="round"
                  stroke-dasharray={r.gestrichelt ? '5 4' : undefined}
                />
              )}
              {punkte.length === 2 && <polyline points={alsPunktliste(punkte)} fill="none" stroke={r.farbe} stroke-width="2.4" stroke-dasharray={r.gestrichelt ? '5 4' : undefined} />}
              {punkte.map((p) => (
                <circle cx={p.x} cy={p.y} r={r.gestrichelt ? 2.6 : 3.6} fill={r.farbe} />
              ))}
            </g>
          );
        })}
      </svg>
      <figcaption class="mt-2 flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-xs text-dunst">
        {reihen.map((r) => (
          <span class="inline-flex items-center gap-1.5">
            <svg width="18" height="8" aria-hidden="true">
              <line x1="0" y1="4" x2="18" y2="4" stroke={r.farbe} stroke-width="3" stroke-dasharray={r.gestrichelt ? '5 3' : undefined} />
            </svg>
            {r.name}
          </span>
        ))}
      </figcaption>
    </figure>
  );
}

/**
 * Die Noten als sortierte Balken, mit Zahl: für Fremde schneller zu lesen als das Netz.
 * Je Kriterium ein Balken pro Reihe (z. B. Prüfstelle gegen Community). Sortiert nach der ersten Reihe, Beste oben.
 */
export function NotenBalken({ achsen, reihen }: { achsen: string[]; reihen: Reihe[] }) {
  const zeilen = achsen
    .map((name, i) => ({ name, werte: reihen.map((r) => r.werte[i] ?? null) }))
    .sort((a, b) => {
      const x = a.werte.find((w) => w !== null) ?? -1;
      const y = b.werte.find((w) => w !== null) ?? -1;
      return y - x;
    });
  return (
    <div>
      <ul class="m-0 grid list-none gap-3 p-0">
        {zeilen.map((z) => (
          <li>
            <div class="flex items-baseline justify-between gap-3 text-sm">
              <span class="text-eis">{z.name}</span>
              <span class="font-mono text-xs text-dunst">
                {z.werte.map((w, i) => (
                  <span key={i} class="ml-3" style={{ color: reihen.length > 1 ? reihen[i].farbe : undefined }}>
                    {w === null ? '–' : w.toFixed(w % 1 === 0 ? 0 : 1)}
                  </span>
                ))}
              </span>
            </div>
            {z.werte.map((w, i) => (
              <div
                key={i}
                class="mt-1 h-2 overflow-hidden rounded-full bg-spur"
                role="img"
                aria-label={`${z.name}, ${reihen[i].name}: ${w ?? t('nicht bewertet')}`}
              >
                <div class="h-full rounded-full" style={{ width: `${(w ?? 0) * 10}%`, background: reihen[i].farbe }} />
              </div>
            ))}
          </li>
        ))}
      </ul>
      {reihen.length > 1 && (
        <p class="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-dunst">
          {reihen.map((r) => (
            <span class="inline-flex items-center gap-1.5">
              <span class="inline-block size-2.5 rounded-full" style={{ background: r.farbe }} />
              {r.name}
            </span>
          ))}
        </p>
      )}
    </div>
  );
}
