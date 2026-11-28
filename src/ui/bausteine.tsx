// Kleine, wiederverwendete Anzeigebausteine. Keine Rechenlogik.
import type { Urteil } from '../lib/scoring';
import { MARKE } from '../marke';
import type { SaisonWahl } from './daten';
import { aktuelleSprache, t } from '../i18n';

/** Füllstand der Tasse je Urteil: voll = Nachschenken, leer und umgekippt = Weggießen. */
const FUELLUNG: Record<Urteil, number> = { Nachschenken: 1, 'Richtig gut': 0.75, 'Geht klar': 0.5, 'Einmal reicht': 0.25, Weggießen: 0 };

export function UrteilIcon({ urteil, groesse = 22 }: { urteil: Urteil; groesse?: number }) {
  const f = FUELLUNG[urteil];
  const h = 12 * f; // Höhe des Weins im 12 hohen Becher
  return (
    <svg viewBox="0 0 24 24" width={groesse} height={groesse} aria-hidden="true" stroke-linecap="round" stroke-linejoin="round">
      <g transform={urteil === 'Weggießen' ? 'rotate(-32 12 14)' : undefined}>
        {h > 0 && <path d={`M6.8 ${21 - h}h10.4v${h - 3}a3 3 0 0 1-3 3h-4.4a3 3 0 0 1-3-3z`} fill="currentColor" fill-opacity="0.5" />}
        <path d="M6 8.5h12v9.5a3.5 3.5 0 0 1-3.5 3.5h-5A3.5 3.5 0 0 1 6 18z" fill="none" stroke="currentColor" stroke-width="1.7" />
        <path d="M18 11h1.2a2.6 2.6 0 0 1 0 5.2H18" fill="none" stroke="currentColor" stroke-width="1.7" />
      </g>
      {urteil === 'Weggießen' && <path d="M4.5 18.5q-1.2 1.6 0 2.6 1.2-1 0-2.6z" fill="currentColor" />}
      {urteil === 'Nachschenken' && <path d="M12 2.5v4M10 4.5h4" fill="none" stroke="currentColor" stroke-width="1.7" />}
    </svg>
  );
}

/** Das Urteil: nur als Bild (`nurBild`, in Listen) oder Bild und Wort (große Karten). Der Name steht immer als Beschriftung und Tooltip dabei. */
export function UrteilPill({ urteil, nurBild = false }: { urteil: Urteil | null; nurBild?: boolean }) {
  if (!urteil) return <span class="urteil-pill">–</span>;
  const klasse = 'u-' + urteil.replace(/ /g, '-').replace('ß', 'ss');
  return (
    <span class={`urteil-pill ${klasse}`} title={t(urteil)} aria-label={t(urteil)} style={{ display: 'inline-flex', alignItems: 'center', gap: nurBild ? 0 : '6px' }}>
      <UrteilIcon urteil={urteil} groesse={nurBild ? 24 : 18} />
      {!nurBild && t(urteil)}
    </span>
  );
}

export function Notenbalken({ wert }: { wert: number | null }) {
  return (
    <div class="notenbalken" aria-hidden="true">
      <span style={{ width: `${wert === null ? 0 : wert * 10}%` }} />
    </div>
  );
}

export function SaisonSchalter({
  saisons,
  wert,
  onWahl,
}: {
  saisons: number[];
  wert: SaisonWahl;
  onWahl: (s: SaisonWahl) => void;
}) {
  const optionen: SaisonWahl[] = ['alle', ...saisons];
  return (
    <div class="segmente" role="group" aria-label={t('Saison')}>
      {optionen.map((o) => (
        <button type="button" aria-pressed={wert === o} onClick={() => onWahl(o)}>
          {o === 'alle' ? t('Alle') : o}
        </button>
      ))}
    </div>
  );
}

export function Betreiber() {
  return (
    <footer class="betreiber">
      <img src="./logo.png" alt="" />
      <span>
        {t('{name} ist die {claim} auf Weihnachtsmärkten in ganz Deutschland. Gemacht und betrieben von David aus Bayern und Philip aus Hamburg, seit 2025.', { name: MARKE.name, claim: t(MARKE.claim) })}
        <span class="rechtliches">
          <a href="#/impressum">{t('Impressum')}</a> · <a href="#/datenschutz">{t('Datenschutz')}</a>
        </span>
      </span>
    </footer>
  );
}

export function datumKurz(iso?: string): string | null {
  if (!iso) return null;
  const [j, m, tag] = iso.split('-');
  return aktuelleSprache() === 'en' ? `${tag}/${m}/${j}` : `${tag}.${m}.${j}`;
}
