// Bewertungslogik. Reine Funktionen, keine UI-, Speicher- oder Netzabhängigkeiten.
//
// Die wichtigste Regel: Eine fehlende Note (null) fällt aus Zähler UND Nenner.
// Sie wird niemals als 0 gezählt. Genau dieser Fehler (ein leeres Argument in
// AVERAGE(...;)) hat das alte Google Sheet eine Saison lang verfälscht.

import {
  DRUMHERUM_KRITERIEN,
  GLUEHWEIN_KRITERIEN,
  KRITERIEN,
  type Gewichte,
  type Kriterium,
  type Note,
  type Noten,
} from './modell';

export type Urteil = 'Nachschenken' | 'Richtig gut' | 'Geht klar' | 'Einmal reicht' | 'Weggießen';

export interface Wertung {
  /** Ungerundet. null, wenn keine einzige Note mit Gewicht > 0 vorliegt. */
  gesamt: number | null;
  gluehwein: number | null;
  drumherum: number | null;
  urteil: Urteil | null;
}

/** Prüft eine einzelne Note. Erlaubt: null oder Ganzzahl 1..10. */
export function istGueltigeNote(n: unknown): n is Note {
  return n === null || (typeof n === 'number' && Number.isInteger(n) && n >= 1 && n <= 10);
}

/**
 * Σ(note × gewicht) / Σ(gewicht) über alle Kriterien, deren Note nicht null ist.
 * Liefert null, wenn kein Kriterium mit Note und Gewicht > 0 übrig bleibt.
 */
export function gewichteterSchnitt(
  noten: Noten,
  gewichte: Gewichte,
  kriterien: readonly Kriterium[] = KRITERIEN,
): number | null {
  let zaehler = 0;
  let nenner = 0;
  for (const k of kriterien) {
    const note = noten[k];
    if (!istGueltigeNote(note)) {
      throw new RangeError(`Ungültige Note für ${k}: ${String(note)} (erlaubt: 1..10 oder null)`);
    }
    const gewicht = gewichte[k];
    if (!(typeof gewicht === 'number' && Number.isFinite(gewicht) && gewicht >= 0)) {
      throw new RangeError(`Ungültiges Gewicht für ${k}: ${String(gewicht)}`);
    }
    if (note === null) continue; // fällt aus Zähler UND Nenner
    zaehler += note * gewicht;
    nenner += gewicht;
  }
  return nenner === 0 ? null : zaehler / nenner;
}

/** Rundet auf zwei Nachkommastellen, so wie überall angezeigt wird. */
export function runde2(x: number): number {
  // Kleiner Aufschlag gegen Fließkomma-Artefakte wie 6.2449999…
  return Math.round(x * 100 + 1e-9) / 100;
}

/**
 * Urteil aus der Gesamtnote. Verglichen wird der auf zwei Stellen gerundete
 * Wert, damit Anzeige und Urteil nie auseinanderfallen (7.996 zeigt 8.00 und
 * ist dann auch „Nachschenken").
 */
export function urteil(gesamt: number | null): Urteil | null {
  if (gesamt === null) return null;
  const g = runde2(gesamt);
  if (g >= 8) return 'Nachschenken';
  if (g >= 6) return 'Richtig gut';
  if (g >= 5) return 'Geht klar';
  if (g >= 4) return 'Einmal reicht';
  return 'Weggießen';
}

export function bewerte(noten: Noten, gewichte: Gewichte): Wertung {
  const gesamt = gewichteterSchnitt(noten, gewichte, KRITERIEN);
  return {
    gesamt,
    gluehwein: gewichteterSchnitt(noten, gewichte, GLUEHWEIN_KRITERIEN),
    drumherum: gewichteterSchnitt(noten, gewichte, DRUMHERUM_KRITERIEN),
    urteil: urteil(gesamt),
  };
}

export interface Platziert<T> {
  rang: number | null;
  eintrag: T;
}

/**
 * Rangfolge absteigend nach Wert, Wettkampf-Platzierung: 1, 1, 3.
 * Gleichstand heißt: gleicher Wert auf zwei Stellen gerundet (was man sieht,
 * ist gleich). Einträge ohne Wert stehen am Ende und haben keinen Rang.
 * Bei Gleichstand bleibt die Eingabereihenfolge erhalten.
 */
export function rangliste<T>(eintraege: readonly T[], wert: (e: T) => number | null): Platziert<T>[] {
  const mitWert = eintraege
    .map((eintrag, i) => ({ eintrag, i, w: wert(eintrag) }))
    .filter((x): x is { eintrag: T; i: number; w: number } => x.w !== null)
    .map((x) => ({ ...x, cent: Math.round(x.w * 100 + 1e-9) }))
    .sort((a, b) => b.cent - a.cent || a.i - b.i);

  const ergebnis: Platziert<T>[] = [];
  mitWert.forEach((x, pos) => {
    const vorher = mitWert[pos - 1];
    const rang = vorher && vorher.cent === x.cent ? ergebnis[pos - 1].rang : pos + 1;
    ergebnis.push({ rang, eintrag: x.eintrag });
  });
  for (const eintrag of eintraege) {
    if (wert(eintrag) === null) ergebnis.push({ rang: null, eintrag });
  }
  return ergebnis;
}
