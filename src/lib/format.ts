// Anzeigeformate. Reine Funktionen.
import { aktuelleSprache } from '../i18n';
import { runde2 } from './scoring';

/** Zwei Nachkommastellen, Punkt als Trenner (wie im Auftrag), „–" für keinen Wert. */
export function zahl2(x: number | null | undefined): string {
  return x === null || x === undefined ? '–' : runde2(x).toFixed(2);
}

/** Euro mit Komma, wie auf der Preistafel am Stand. */
export function euro(x: number | undefined): string {
  if (x === undefined) return '–';
  return aktuelleSprache() === 'en' ? `€${x.toFixed(2)}` : `${x.toFixed(2).replace('.', ',')} €`;
}

/** Laufende Probennummer, dreistellig. */
export function probeNr(n: number): string {
  return String(n).padStart(3, '0');
}
