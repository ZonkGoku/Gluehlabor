// Schnellschalter für Theme und Menü-Anordnung (die volle Auswahl steht in den Einstellungen).
import { aktuellesTheme, setzeMenue, setzeTheme, useMenue, useTheme } from '../../daten/darstellung';
import { aktuelleSprache, setzeSprache } from '../../i18n';
import { useSprache } from '../../i18n/hooks';
import { Symbol } from '../Symbol';
import { t } from '../../i18n';

export const ICONKNOPF =
  'glas grid size-11 shrink-0 place-items-center rounded-full text-dunst transition duration-200 hover:text-gold-300 hover:shadow-glut cursor-pointer';

/** Wechselt zwischen Hell und Dunkel. Zeigt das Ziel, nicht den Ist-Zustand. */
export function ThemeKnopf({ klasse = ICONKNOPF }: { klasse?: string }) {
  useTheme(); // neu zeichnen, wenn sich das Theme ändert
  const jetzt = aktuellesTheme();
  const ziel = jetzt === 'dunkel' ? 'hell' : 'dunkel';
  return (
    <button type="button" class={klasse} onClick={() => setzeTheme(ziel)} aria-label={ziel === 'hell' ? t('Helles Design') : t('Dunkles Design')} title={ziel === 'hell' ? t('Hell') : t('Dunkel')}>
      <Symbol name={ziel === 'hell' ? 'sonne' : 'mond'} groesse={20} />
    </button>
  );
}

/** Nur am Rechner sinnvoll: schaltet zwischen Seitenleiste und schwebender Leiste um. */
export function MenueKnopf({ klasse = ICONKNOPF }: { klasse?: string }) {
  const m = useMenue();
  return (
    <button
      type="button"
      class={klasse}
      onClick={() => setzeMenue(m === 'seitenleiste' ? 'schwebend' : 'seitenleiste')}
      aria-label={m === 'seitenleiste' ? t('Menü schweben lassen') : t('Menü als Seitenleiste')}
      title={m === 'seitenleiste' ? t('Menü schweben lassen') : t('Menü als Seitenleiste')}
    >
      <Symbol name="menue" groesse={20} />
    </button>
  );
}

/** Wechselt die Sprache. Zeigt die Sprache, zu der gewechselt wird. */
export function SpracheKnopf({ klasse = ICONKNOPF }: { klasse?: string }) {
  useSprache();
  const ziel = aktuelleSprache() === 'de' ? 'en' : 'de';
  return (
    <button type="button" class={`${klasse} font-mono text-[11px] font-semibold tracking-wider`} onClick={() => setzeSprache(ziel)} aria-label={ziel === 'en' ? 'Switch to English' : 'Auf Deutsch wechseln'} title={ziel === 'en' ? 'English' : 'Deutsch'}>
      {ziel.toUpperCase()}
    </button>
  );
}
