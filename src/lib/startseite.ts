// Rechenlogik der Startseite: Abend, Saison, Verlauf, neueste Becher. Reine Funktionen.

import { naechsteBecherNr } from './abend';
import { standIdent } from './community';
import type { Eintrag, Gewichte } from './modell';
import { stadtVon, type MarktListe } from './orte';
import { bewerte, rangliste } from './scoring';
import { mittelwert } from './statistik';

/**
 * Welche Saison die Startseite zeigt: die des laufenden Jahres, sobald es dort
 * Becher gibt, sonst die letzte Saison mit Bechern, sonst das laufende Jahr.
 */
export function standardSaison(eintraege: readonly Eintrag[], jahr: number): number {
  if (eintraege.some((e) => e.saison === jahr)) return jahr;
  const saisons = eintraege.map((e) => e.saison).filter((s) => s < jahr);
  return saisons.length ? Math.max(...saisons) : jahr;
}

function tageZwischen(von: string, bis: string): number {
  const a = Date.UTC(+von.slice(0, 4), +von.slice(5, 7) - 1, +von.slice(8, 10));
  const b = Date.UTC(+bis.slice(0, 4), +bis.slice(5, 7) - 1, +bis.slice(8, 10));
  return Math.round((b - a) / 86_400_000);
}

function plusTage(datum: string, n: number): string {
  const d = new Date(Date.UTC(+datum.slice(0, 4), +datum.slice(5, 7) - 1, +datum.slice(8, 10) + n));
  return d.toISOString().slice(0, 10);
}

export interface SaisonStatus {
  saison: number;
  /** Tag der Saison, gezählt ab dem ersten Becher (Tag 1). null, wenn die Saison noch keinen datierten Becher hat. */
  tag: number | null;
  becher: number;
  /** Läuft die Saison gerade (= laufendes Jahr)? */
  laufend: boolean;
}

/** Die Saison beginnt mit dem ersten Becher des Jahres. */
export function saisonStatus(eintraege: readonly Eintrag[], saison: number, heute: string): SaisonStatus {
  const hier = eintraege.filter((e) => e.saison === saison);
  const daten = hier.map((e) => e.datum).filter((d): d is string => Boolean(d)).sort();
  const laufend = Number(heute.slice(0, 4)) === saison;
  const tag = daten.length && laufend ? tageZwischen(daten[0], heute) + 1 : null;
  return { saison, tag, becher: hier.length, laufend };
}

export interface Abend {
  datum: string;
  anzahl: number;
  mittel: number | null;
  bester: Eintrag | null;
  /** Häufigster Markt des Abends. */
  markt: string | null;
  naechsteNr: number;
}

/** Zusammenfassung eines Abends (Datum im Format yyyy-mm-dd). */
export function abend(eintraege: readonly Eintrag[], datum: string, gewichte: Gewichte): Abend {
  const hier = eintraege.filter((e) => e.datum === datum);
  const werte = hier.map((e) => ({ e, g: bewerte(e.noten, gewichte).gesamt }));
  const mitNote = werte.filter((x): x is { e: Eintrag; g: number } => x.g !== null);
  const platz = rangliste(mitNote, (x) => x.g);
  const zaehlung = new Map<string, number>();
  for (const e of hier) zaehlung.set(e.markt, (zaehlung.get(e.markt) ?? 0) + 1);
  const markt = [...zaehlung.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;
  return {
    datum,
    anzahl: hier.length,
    mittel: mittelwert(mitNote.map((x) => x.g)),
    bester: platz[0]?.eintrag.e ?? null,
    markt,
    naechsteNr: naechsteBecherNr(hier, datum),
  };
}

export interface VerlaufTag {
  datum: string;
  anzahl: number;
  mittel: number | null;
}

export interface Verlauf {
  tage: VerlaufTag[];
  /** Becher dieser Saison ohne Datum (z. B. aus dem alten Sheet). */
  ohneDatum: number;
}

/**
 * Becher je Abend vom ersten Becher der Saison bis zum letzten (läuft die Saison
 * noch: bis heute). Tage ohne Becher sind mit anzahl 0 enthalten.
 */
export function saisonVerlauf(
  eintraege: readonly Eintrag[],
  saison: number,
  gewichte: Gewichte,
  heute: string,
): Verlauf {
  const hier = eintraege.filter((e) => e.saison === saison);
  const datiert = hier.filter((e) => e.datum);
  const ohneDatum = hier.length - datiert.length;
  if (datiert.length === 0) return { tage: [], ohneDatum };
  const sortiert = datiert.map((e) => e.datum!).sort();
  const erster = sortiert[0];
  const letzter = Number(heute.slice(0, 4)) === saison && heute > sortiert.at(-1)! ? heute : sortiert.at(-1)!;
  const tage: VerlaufTag[] = [];
  for (let i = 0; i <= tageZwischen(erster, letzter); i++) {
    const d = plusTage(erster, i);
    const an = datiert.filter((e) => e.datum === d);
    const g = an.map((e) => bewerte(e.noten, gewichte).gesamt).filter((x): x is number => x !== null);
    tage.push({ datum: d, anzahl: an.length, mittel: mittelwert(g) });
  }
  return { tage, ohneDatum };
}

/** Die zuletzt erfassten Becher, neueste zuerst. */
export function neuesteBecher<T extends Eintrag>(eintraege: readonly T[], n: number): T[] {
  return [...eintraege].sort((a, b) => b.erstelltAm - a.erstelltAm).slice(0, n);
}

export interface Kennzahlen {
  becher: number;
  maerkte: number;
  /** Städte, die sich bestimmen lassen (gepflegte Liste oder ausdrücklich angegeben). */
  staedte: number;
  mittel: number | null;
}

export function kennzahlen(eintraege: readonly Eintrag[], liste: MarktListe, gewichte: Gewichte): Kennzahlen {
  const gesamt = eintraege.map((e) => bewerte(e.noten, gewichte).gesamt).filter((x): x is number => x !== null);
  return {
    becher: eintraege.length,
    maerkte: new Set(eintraege.map((e) => e.markt)).size,
    staedte: new Set(eintraege.map((e) => stadtVon(liste, e)).filter(Boolean)).size,
    mittel: mittelwert(gesamt),
  };
}

export interface GesamtZahlen {
  staende: number;
  /** Echte Märkte je Stadt; „kein bestimmter Markt" (Sonstiger) zählt nicht. */
  maerkte: number;
  staedte: number;
  bewertungen: number;
}

/** Die einfache Gesamtübersicht: wie viele Stände, Märkte, Städte und Bewertungen es insgesamt gibt. */
export function gesamtZahlen(eintraege: readonly Eintrag[], liste: MarktListe): GesamtZahlen {
  const staende = new Set<string>();
  const maerkte = new Set<string>();
  const staedte = new Set<string>();
  for (const e of eintraege) {
    const stadt = stadtVon(liste, e) ?? null;
    staende.add(standIdent({ stand: e.stand, stadt }));
    if (stadt) staedte.add(stadt);
    if (e.markt && e.markt !== 'Sonstiger') maerkte.add(`${stadt ?? ''}|${e.markt}`);
  }
  return { staende: staende.size, maerkte: maerkte.size, staedte: staedte.size, bewertungen: eintraege.length };
}
