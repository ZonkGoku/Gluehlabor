// Bausteine des Schlittenfahrens: Schlitten, Rennbahn, Fortschrittsstreifen, Siegerpodest, Konfetti, Satz zur Lage.
import { useEffect, useState } from 'preact/hooks';
import { t, tn } from '../../i18n';
import { sichtbareBahnen, SCHLITTEN_FARBEN, type Bahn, type Lage } from '../../lib/rennen';
import { FahrzeugBild } from './FahrzeugBild';
import { useGesicht } from './gesicht';

export const farbeVon = (i: number): string => SCHLITTEN_FARBEN[i % SCHLITTEN_FARBEN.length];

/** Eine Zeichnung braucht einen Frame Zeit, damit die Schlitten von der Startlinie nach vorn fahren. */
export function useBereit(): boolean {
  const [bereit, setBereit] = useState(false);
  useEffect(() => {
    const f = requestAnimationFrame(() => setBereit(true));
    return () => cancelAnimationFrame(f);
  }, []);
  return bereit;
}

/** Alter Name: der Standard-Schlitten. */
export const SchlittenBild = ({ farbe }: { farbe: string }) => <FahrzeugBild farbe={farbe} fahrzeug={0} />;

// ───────── Rennbahn ─────────
const B = 360;
const X0 = 22; // Startlinie
const X1 = 306; // Ziellinie
const SCHLITTEN_B = 40;
const OBEN = 22;
const MAX_BAHNEN = 6;

export function Rennbahn({ bahnen, ich }: { bahnen: Bahn[]; ich: string | null }) {
  const bereit = useBereit();
  const gesicht = useGesicht();
  const { sichtbar, rest } = sichtbareBahnen(bahnen, ich, MAX_BAHNEN);
  const bahnH = sichtbar.length > 4 ? 46 : 58;
  const hoehe = OBEN + bahnH * sichtbar.length + 24;
  return (
    <section class="glas rahmen-licht overflow-hidden rounded-3xl p-3" aria-label={t('Rennbahn')}>
      <svg viewBox={`0 0 ${B} ${hoehe}`} class="block h-auto w-full" role="img" aria-label={t('Rennbahn mit den Schlitten')}>
        {sichtbar.map((b, i) => {
          const y = OBEN + i * bahnH;
          const x = X0 + b.anteil * (X1 - X0 - SCHLITTEN_B);
          const ichBin = b.geraet === ich;
          return (
            <g>
              <rect x={X0 - 10} y={y + 3} width={X1 - X0 + 34} height={bahnH - 6} rx="14" fill="currentColor" opacity={ichBin ? 0.14 : 0.07} />
              <path d={`M${X0} ${y + bahnH - 11}H${X1 + 10}`} stroke="currentColor" opacity="0.25" stroke-dasharray="3 6" stroke-linecap="round" fill="none" />
              <text x={X0 - 6} y={y + 15} font-size="11" fill="currentColor" opacity={ichBin ? 1 : 0.7} font-family="var(--mono)" font-weight={ichBin ? 700 : 400}>
                {b.platz}. {b.kamel}
              </text>
              <g class="kamel-lauf" style={{ transform: `translate(${bereit ? x : X0}px, ${y + (bahnH > 50 ? 15 : 10)}px)` }}>
                <g class={b.platz === 1 && b.schritte > 0 ? 'kamel-wippen' : ''}>
                  <g transform={bahnH > 50 ? 'scale(1.15)' : 'scale(0.95)'}>
                    <FahrzeugBild farbe={farbeVon(b.farbe)} fahrzeug={b.fahrzeug} gesicht={ichBin ? gesicht : null} />
                  </g>
                </g>
              </g>
            </g>
          );
        })}
        {/* Ziel: Zielflagge aus zwei Reihen Karos */}
        <g aria-hidden="true">
          {Array.from({ length: Math.floor((bahnH * sichtbar.length) / 8) }, (_, r) =>
            [0, 1].map((c) => <rect x={X1 + 14 + c * 8} y={OBEN + r * 8} width="8" height="8" fill={(r + c) % 2 ? '#ffc857' : '#1a1020'} />),
          )}
        </g>
        <text x={X0} y={hoehe - 7} font-size="11" fill="currentColor" opacity="0.75">
          {t('Start')}
        </text>
        <text x={B - 6} y={hoehe - 7} font-size="11" text-anchor="end" fill="#ffc857">
          {t('Ziel')}
        </text>
      </svg>
      {rest > 0 && <p class="m-0 mt-1 text-center text-sm text-dunst">{tn(rest, '… und {n} weiterer Schlitten', '… und {n} weitere Schlitten')}</p>}
    </section>
  );
}

/** Ein einzelner Streifen: dein Schlitten fährt von `von` nach `nach` (je 0 bis 1). Für das Ticket nach dem Bewerten. */
export function MiniBahn({ farbe, von, nach, fahrzeug = 0 }: { farbe: string; von: number; nach: number; fahrzeug?: number }) {
  const bereit = useBereit();
  const gesicht = useGesicht();
  const x = (a: number) => X0 + a * (X1 - X0 - SCHLITTEN_B);
  return (
    <svg viewBox={`0 0 ${B} 52`} class="block h-auto w-full" role="img" aria-label={t('Dein Schlitten auf der Bahn')}>
      <rect x={X0 - 10} y="4" width={X1 - X0 + 34} height="44" rx="14" fill="currentColor" opacity="0.08" />
      <path d={`M${X0} 40H${X1 + 10}`} stroke="currentColor" opacity="0.25" stroke-dasharray="3 6" stroke-linecap="round" fill="none" />
      <g class="kamel-lauf" style={{ transform: `translate(${x(bereit ? nach : von)}px, 8px)` }}>
        <FahrzeugBild farbe={farbe} fahrzeug={fahrzeug} gesicht={gesicht} />
      </g>
      <g aria-hidden="true">
        {[0, 1, 2, 3, 4].map((r) => [0, 1].map((c) => <rect x={X1 + 14 + c * 8} y={6 + r * 8} width="8" height="8" fill={(r + c) % 2 ? '#ffc857' : '#1a1020'} />))}
      </g>
    </svg>
  );
}

// ───────── Ende: Siegerpodest und Konfetti ─────────
export function Siegerpodest({ bahnen, ich, ziel }: { bahnen: Bahn[]; ich: string | null; ziel: number }) {
  const [erster, zweiter, dritter] = bahnen;
  // Reihenfolge auf dem Podest: 2 · 1 · 3
  const spalten = [
    { b: zweiter, h: 'h-20', platz: 2 },
    { b: erster, h: 'h-28', platz: 1 },
    { b: dritter, h: 'h-14', platz: 3 },
  ];
  return (
    <section class="mt-4" aria-label={t('Siegerpodest')}>
      <div class="grid grid-cols-3 items-end gap-2">
        {spalten.map(({ b, h, platz }) => (
          <div class="min-w-0 text-center">
            {b ? (
              <>
                <svg viewBox="0 0 46 34" class="mx-auto block w-14" aria-hidden="true">
                  <FahrzeugBild farbe={farbeVon(b.farbe)} fahrzeug={b.fahrzeug} />
                </svg>
                <b class="block truncate text-[15px] text-eis">
                  {b.kamel}
                  {b.geraet === ich ? ` (${t('du')})` : ''}
                </b>
                <span class="block font-mono text-xs text-dunst">
                  {b.schritte}/{ziel}
                </span>
              </>
            ) : (
              <span class="block h-[72px]" />
            )}
            <div class={`${h} mt-1 grid place-items-start rounded-t-2xl pt-2 font-display text-3xl text-[#1a1020]`} style={{ background: platz === 1 ? 'linear-gradient(#ffe29a,#ffc857)' : platz === 2 ? 'linear-gradient(#e9edf5,#b8c2d6)' : 'linear-gradient(#ffcfa3,#d9915a)' }}>
              <span class="w-full text-center">{platz}</span>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

const KONFETTI = Array.from({ length: 28 }, (_, i) => ({ links: (i * 37) % 100, dauer: 3.2 + ((i * 13) % 17) / 10, versatz: ((i * 7) % 20) / 10, farbe: SCHLITTEN_FARBEN[i % SCHLITTEN_FARBEN.length], gr: 6 + (i % 4) * 2 }));

/** Fällt einmal über den Bildschirm. Mit „Bewegung reduzieren" unsichtbar (CSS). */
export function Konfetti() {
  return (
    <div class="konfetti" aria-hidden="true">
      {KONFETTI.map((k) => (
        <i style={{ left: `${k.links}%`, width: `${k.gr}px`, height: `${k.gr * 1.6}px`, background: k.farbe, animationDuration: `${k.dauer}s`, animationDelay: `${k.versatz}s` }} />
      ))}
    </div>
  );
}

// ───────── Satz zur Lage ─────────
/** „Du führst: 2 Schritte vor Ben. Noch 3 bis ins Ziel." Leer, wenn man nicht mitfährt. */
export function lageText(l: Lage | null): string | null {
  if (!l) return null;
  const noch = t('Noch {n} bis ins Ziel.', { n: l.fehlt });
  switch (l.art) {
    case 'start':
      return t('Los geht’s: Mit jeder Bewertung fährst du einen Schritt.');
    case 'ende':
      return l.platz === 1 ? t('Du hast gewonnen!') : t('Du bist Platz {n}.', { n: l.platz });
    case 'gleich':
      return `${t('Gleichauf mit {name}!', { name: l.gegner ?? '' })} ${noch}`;
    case 'hinten':
      return `${l.abstand === 1 ? t('Du bist {n} Schritt hinter {name}.', { n: l.abstand, name: l.gegner ?? '' }) : t('Du bist {n} Schritte hinter {name}.', { n: l.abstand, name: l.gegner ?? '' })} ${noch}`;
    case 'vorn':
      if (!l.gegner || l.abstand === 0) return noch;
      return `${l.abstand === 1 ? t('Du führst: {n} Schritt vor {name}.', { n: l.abstand, name: l.gegner }) : t('Du führst: {n} Schritte vor {name}.', { n: l.abstand, name: l.gegner })} ${noch}`;
  }
}
