// Kleine, wiederverwendete Anzeigebausteine. Keine Rechenlogik.
import type { Urteil } from '../lib/scoring';
import { MARKE } from '../marke';
import type { SaisonWahl } from './daten';
import { aktuelleSprache, t } from '../i18n';

export function UrteilPill({ urteil }: { urteil: Urteil | null }) {
  if (!urteil) return <span class="urteil-pill">–</span>;
  const klasse = 'u-' + urteil.replace(/ /g, '-').replace('ß', 'ss');
  return <span class={`urteil-pill ${klasse}`}>{t(urteil)}</span>;
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
