// Kleine, wiederverwendete Anzeigebausteine. Keine Rechenlogik.
import type { Urteil } from '../lib/scoring';
import { MARKE } from '../marke';
import type { SaisonWahl } from './daten';

export function UrteilPill({ urteil }: { urteil: Urteil | null }) {
  if (!urteil) return <span class="urteil-pill">–</span>;
  const klasse = 'u-' + urteil.replace(/ /g, '-').replace('ß', 'ss');
  return <span class={`urteil-pill ${klasse}`}>{urteil}</span>;
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
    <div class="segmente" role="group" aria-label="Saison">
      {optionen.map((o) => (
        <button type="button" aria-pressed={wert === o} onClick={() => onWahl(o)}>
          {o === 'alle' ? 'Alle' : o}
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
        {MARKE.name} ist die {MARKE.claim} auf Weihnachtsmärkten in ganz Deutschland. Gemacht und
        betrieben von David aus Bayern und Philip aus Hamburg, seit 2025.
        <span class="rechtliches">
          <a href="#/impressum">Impressum</a> · <a href="#/datenschutz">Datenschutz</a>
        </span>
      </span>
    </footer>
  );
}

export function datumKurz(iso?: string): string | null {
  if (!iso) return null;
  const [j, m, t] = iso.split('-');
  return `${t}.${m}.${j}`;
}
