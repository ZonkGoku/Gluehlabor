// Schnellschalter für Theme und Menü-Anordnung (die volle Auswahl steht in den Einstellungen).
import { aktuellesTheme, setzeMenue, setzeTheme, useMenue, useTheme } from '../../daten/darstellung';
import { Symbol } from '../Symbol';

export const ICONKNOPF =
  'glas grid size-10 shrink-0 place-items-center rounded-full text-dunst transition duration-200 hover:text-gold-300 hover:shadow-glut cursor-pointer';

/** Wechselt zwischen Hell und Dunkel. Zeigt das Ziel, nicht den Ist-Zustand. */
export function ThemeKnopf({ klasse = ICONKNOPF }: { klasse?: string }) {
  useTheme(); // neu zeichnen, wenn sich das Theme ändert
  const jetzt = aktuellesTheme();
  const ziel = jetzt === 'dunkel' ? 'hell' : 'dunkel';
  return (
    <button type="button" class={klasse} onClick={() => setzeTheme(ziel)} aria-label={ziel === 'hell' ? 'Helles Design' : 'Dunkles Design'} title={ziel === 'hell' ? 'Hell' : 'Dunkel'}>
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
      aria-label={m === 'seitenleiste' ? 'Menü schweben lassen' : 'Menü als Seitenleiste'}
      title={m === 'seitenleiste' ? 'Menü schweben lassen' : 'Menü als Seitenleiste'}
    >
      <Symbol name="menue" groesse={20} />
    </button>
  );
}
