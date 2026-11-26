// Kamelrennen nach Bethlehem (Beta). Drei Kamele auf drei Bahnen, jede Bewertung ist ein Schritt für das Kamel des eigenen Geräts.
// Die Rechnung steht in lib/karawane.ts, hier nur die Darstellung.
import { useEffect, useState } from 'preact/hooks';
import { t, tn } from '../i18n';
import { berechneKarawane, KAMELE, STATIONEN, ZIEL, type Kamel } from '../lib/karawane';
import { Betreiber } from './bausteine';
import { useEintraege, useGeraetId } from './daten';

// Eine Farbe je Kamel in der Reihenfolge von KAMELE (lib/karawane.ts); mehr Kamele = hier weitere Farben ergänzen
const FARBEN = ['#ffc857', '#ff8a3d', '#f0344f', '#7fd1ff', '#9be08a', '#d49bff', '#ff9bd0', '#e8e8e8'];
const FARBE = (k: Kamel) => FARBEN[KAMELE.indexOf(k) % FARBEN.length];

// Zeichenfläche (Einheiten, skaliert mit der Breite)
const B = 360;
const BAHN_H = 58;
const OBEN = 22;
const X0 = 22; // Startlinie
const X1 = 312; // Ziel (Stall)
const KAMEL_B = 40;

/** Kamel von der Seite, nach rechts laufend. 42 × 32 Einheiten. */
function KamelBild({ farbe }: { farbe: string }) {
  return (
    <g fill={farbe} stroke={farbe} stroke-linecap="round" stroke-linejoin="round">
      <path d="M8 16c0-4 4-5 8-5 2-3 6-3 8 0 4 0 7 2 7 5v5H8z" stroke-width="1" />
      <path d="M30 14l5-8" stroke-width="3.4" fill="none" />
      <ellipse cx="37.5" cy="5.6" rx="3.6" ry="2.3" stroke="none" />
      <path d="M9 21v9M14 21v9M25 21v9M30 21v9" stroke-width="2.4" fill="none" />
      <path d="M8 15c-3 1-4 4-3 7" stroke-width="1.6" fill="none" />
    </g>
  );
}

function Stall({ x, y }: { x: number; y: number }) {
  return (
    <g transform={`translate(${x} ${y})`} aria-hidden="true">
      <circle cx="10" cy="-26" r="14" fill="#ffc857" opacity="0.18" />
      <path d="M10-34l2.2 5.4 5.8.4-4.4 3.8 1.4 5.7L10-19.5 5-18.9l1.4-5.7L2-28.4l5.8-.4z" fill="#ffc857" />
      <path d="M0 0v-12l10-8 10 8V0z" fill="none" stroke="#ffc857" stroke-width="2" stroke-linejoin="round" />
    </g>
  );
}

export function Karawane() {
  const alle = useEintraege();
  const geraetId = useGeraetId();
  const [bereit, setBereit] = useState(false);
  useEffect(() => {
    const f = requestAnimationFrame(() => setBereit(true));
    return () => cancelAnimationFrame(f);
  }, []);
  if (!alle) return null;

  const s = berechneKarawane(alle, geraetId);
  const hoehe = OBEN + BAHN_H * KAMELE.length + 26;
  const sieger = s.bahnen.filter((b) => b.angekommen).sort((a, b) => b.schritte - a.schritte)[0];
  const rangfolge = [...s.bahnen].sort((a, b) => a.platz - b.platz || KAMELE.indexOf(a.kamel) - KAMELE.indexOf(b.kamel));

  return (
    <div class="nm karawane">
      <div class="mb-5 mt-2">
        <p class="etikett inline-flex items-center gap-2 !text-gold-300">
          <span class="rounded-full border border-gold-300 px-2 py-0.5">{t('Beta')}</span>
          <span>{t('Neues Spiel')}</span>
        </p>
        <h1 class="mt-2 font-display text-[40px] uppercase leading-[1] tracking-wide text-eis sm:text-5xl">{t('Kamelrennen')}</h1>
        <p class="mt-3 max-w-prose text-[17px] leading-snug text-dunst">
          {t('Drei Kamele, ein Ziel: Bethlehem. Jede Bewertung treibt das Kamel an, zu dem dein Gerät gehört.')}
        </p>
      </div>

      <section class="glas rahmen-licht overflow-hidden rounded-3xl p-3" aria-label={t('Rennbahn')}>
        <svg viewBox={`0 0 ${B} ${hoehe}`} class="block h-auto w-full" role="img" aria-label={t('Rennbahn mit drei Kamelen auf dem Weg nach Bethlehem')}>
          {/* Bahnen */}
          {s.bahnen.map((b, i) => {
            const y = OBEN + i * BAHN_H;
            const x = X0 + b.anteil * (X1 - X0 - KAMEL_B);
            return (
              <g>
                <rect x={X0 - 10} y={y + 4} width={X1 - X0 + 34} height={BAHN_H - 8} rx="14" fill="currentColor" opacity="0.07" />
                <path d={`M${X0} ${y + BAHN_H - 12}H${X1 + 10}`} stroke="currentColor" opacity="0.25" stroke-dasharray="3 6" stroke-linecap="round" fill="none" />
                <text x={X0 - 6} y={y + 17} font-size="11" fill="currentColor" opacity="0.75" font-family="var(--mono)">
                  {b.platz}. {b.kamel}
                </text>
                <g
                  class="kamel-lauf"
                  style={{ transform: `translate(${bereit ? x : X0}px, ${y + 16}px)` }}
                >
                  <g class={b.platz === 1 && b.schritte > 0 ? 'kamel-wippen' : ''}>
                    <g transform="scale(1.15)">
                      <KamelBild farbe={FARBE(b.kamel)} />
                    </g>
                  </g>
                </g>
              </g>
            );
          })}
          {/* Stationen */}
          {STATIONEN.slice(1, -1).map((st) => {
            const x = X0 + (st.ab / ZIEL) * (X1 - X0 - KAMEL_B) + KAMEL_B / 2;
            return (
              <g aria-hidden="true">
                <path d={`M${x} ${OBEN}V${OBEN + BAHN_H * KAMELE.length}`} stroke="currentColor" opacity="0.2" stroke-dasharray="2 5" />
                <text x={x} y={hoehe - 8} font-size="11" text-anchor="middle" fill="currentColor" opacity="0.75">
                  {t(st.name)}
                </text>
              </g>
            );
          })}
          <text x={X0} y={hoehe - 8} font-size="11" fill="currentColor" opacity="0.75">
            {t('Start')}
          </text>
          {/* Ziel */}
          <path d={`M${X1 + 12} ${OBEN}V${OBEN + BAHN_H * KAMELE.length}`} stroke="#ffc857" stroke-width="2.5" stroke-dasharray="5 4" />
          <Stall x={X1 + 18} y={OBEN + 20} />
          <text x={B - 6} y={hoehe - 8} font-size="11" text-anchor="end" fill="#ffc857">
            {t('Bethlehem')}
          </text>
        </svg>
      </section>

      {sieger && (
        <p class="mt-4 rounded-2xl border-2 border-[var(--nm-stern)] bg-flaeche p-4 text-center font-display text-2xl uppercase tracking-wide text-eis">
          {t('{kamel} ist in Bethlehem angekommen!', { kamel: sieger.kamel })}
        </p>
      )}

      <ol class="m-0 mt-4 grid list-none gap-2 p-0" aria-label={t('Stand des Rennens')}>
        {rangfolge.map((b) => (
          <li class="glas flex min-h-[56px] items-center gap-3 rounded-2xl px-4 py-2">
            <span class="grid size-8 shrink-0 place-items-center rounded-full font-display text-lg text-[#1a1020]" style={{ background: FARBE(b.kamel) }}>
              {b.platz}
            </span>
            <b class="min-w-0 flex-1 truncate text-[17px] text-eis">
              {b.kamel}
              {s.meinKamel === b.kamel && <span class="ml-2 rounded-full border border-gold-300 px-2 py-0.5 text-xs font-normal text-gold-300">{t('dein Kamel')}</span>}
            </b>
            <span class="font-mono text-sm text-dunst">{tn(b.schritte, '{n} Schritt', '{n} Schritte')}</span>
          </li>
        ))}
      </ol>

      <section class="mt-4 grid grid-cols-2 gap-2" aria-label={t('Dein Beitrag')}>
        <div class="glas rounded-2xl p-4">
          <p class="etikett">{t('Deine Schritte')}</p>
          <p class="mt-1 font-display text-4xl leading-none text-eis">{s.meine}</p>
          <p class="mt-1 text-sm text-dunst">{s.meinKamel ? t('für {kamel}', { kamel: s.meinKamel }) : t('Bewerte, dann läufst du mit.')}</p>
        </div>
        <div class="glas rounded-2xl p-4">
          <p class="etikett">{t('Bis Heiligabend')}</p>
          <p class="mt-1 font-display text-4xl leading-none text-eis">{s.tage}</p>
          <p class="mt-1 text-sm text-dunst">{tn(s.tage, 'Tag', 'Tage')}</p>
        </div>
      </section>

      <a
        href="#/erfassen"
        class="mt-5 flex min-h-[56px] items-center justify-center rounded-full px-6 text-[17px] font-bold text-[#1a1020] no-underline"
        style={{ background: 'linear-gradient(135deg,#ffe29a,#ff8a3d)' }}
      >
        {t('Bewerten und mitlaufen')}
      </a>
      <p class="mt-3 text-sm text-dunst">
        {t('Beta: Wir probieren das gerade aus. Ab 18. Pro Stand und Abend zählt nur eine Bewertung, es geht nicht ums Trinken.')}
      </p>
      <Betreiber />
    </div>
  );
}
