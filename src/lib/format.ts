// Anzeigeformate. Reine Funktionen.
import { aktuelleSprache } from '../i18n';
import { runde2, sterne1 } from './scoring';

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

/** Sterne auf eine Stelle (Punkt als Trenner) aus einem 10-Punkte-Wert, „–" für keinen Wert. 8 → „4.0". */
export function sterneText(punkte: number | null | undefined): string {
  return punkte === null || punkte === undefined ? '–' : sterne1(punkte).toFixed(1);
}

/** Eine einzelne Note 1 bis 10 als Sterne mit halben Schritten: 8 → „4", 7 → „3.5". */
export function halbSterne(note: number | null | undefined): string {
  if (note === null || note === undefined) return '–';
  return Number.isInteger(note / 2) ? String(note / 2) : (note / 2).toFixed(1);
}
