// Auswertung über mehrere Einträge: Filter, Rangliste, Vergleich, Checkliste. Reine Funktionen.

import type { Eintrag, Gewichte } from './modell';
import { stadtVon, type MarktListe } from './orte';
import { bewerte, rangliste, type Urteil, type Wertung } from './scoring';

export interface Filter {
  saison: number | 'alle';
  markt: string | 'alle';
  /** Nur mit Marktliste wirksam, weil die Stadt oft aus ihr abgeleitet wird. */
  stadt?: string | 'alle';
}

export function filtere<T extends Eintrag>(eintraege: readonly T[], f: Filter, liste?: MarktListe): T[] {
  return eintraege.filter(
    (e) =>
      (f.saison === 'alle' || e.saison === f.saison) &&
      (f.markt === 'alle' || e.markt === f.markt) &&
      (!f.stadt || f.stadt === 'alle' || !liste || stadtVon(liste, e) === f.stadt),
  );
}

export interface Zeile<T extends Eintrag = Eintrag> {
  rang: number | null;
  eintrag: T;
  wertung: Wertung;
}

/** Rangliste mit Wertung je Zeile, absteigend nach gesamt, Plätze 1, 1, 3. */
export function ranglisteMitWertung<T extends Eintrag>(eintraege: readonly T[], gewichte: Gewichte): Zeile<T>[] {
  const mitWertung = eintraege.map((eintrag) => ({ eintrag, wertung: bewerte(eintrag.noten, gewichte) }));
  return rangliste(mitWertung, (x) => x.wertung.gesamt).map((p) => ({ rang: p.rang, ...p.eintrag }));
}

export function saisons(eintraege: readonly Eintrag[]): number[] {
  return [...new Set(eintraege.map((e) => e.saison))].sort((a, b) => a - b);
}

export const URTEILE: readonly Urteil[] = ['Nachschenken', 'Richtig gut', 'Geht klar', 'Einmal reicht', 'Weggießen'];

export function urteilVerteilung(zeilen: readonly Zeile[]): Record<Urteil, number> {
  const v = Object.fromEntries(URTEILE.map((u) => [u, 0])) as Record<Urteil, number>;
  for (const z of zeilen) if (z.wertung.urteil) v[z.wertung.urteil]++;
  return v;
}

/** Schlüssel für „derselbe Stand": ohne Groß/Klein, Leerraum und Emoji. */
export function standSchluessel(stand: string): string {
  return stand
    .normalize('NFKC')
    .replace(/[\p{Extended_Pictographic}️‍]/gu, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

export type Entwicklung = 'besser' | 'schlechter' | 'unveraendert' | 'neu' | 'einmalig';

export interface Wiederholung {
  stand: string;
  markt: string;
  /** Durchschnittliche Gesamtnote je Saison. */
  jeSaison: Record<number, number>;
  /** Differenz letzte minus vorletzte bewertete Saison. */
  differenz: number | null;
  entwicklung: Entwicklung;
}

/**
 * Stände über die Saisons. Mehrere Becher am selben Stand in einer Saison
 * werden gemittelt. Sortiert: mehrfach bewertete zuerst, dann nach Name.
 */
export function wiederholungen(eintraege: readonly Eintrag[], gewichte: Gewichte): Wiederholung[] {
  const gruppen = new Map<string, Eintrag[]>();
  for (const e of eintraege) {
    const k = standSchluessel(e.stand);
    gruppen.set(k, [...(gruppen.get(k) ?? []), e]);
  }
  const alleSaisons = saisons(eintraege);
  const letzte = alleSaisons.at(-1);

  const out: Wiederholung[] = [];
  for (const liste of gruppen.values()) {
    const summen = new Map<number, number[]>();
    for (const e of liste) {
      const g = bewerte(e.noten, gewichte).gesamt;
      if (g !== null) summen.set(e.saison, [...(summen.get(e.saison) ?? []), g]);
    }
    const jeSaison: Record<number, number> = {};
    for (const [s, werte] of summen) jeSaison[s] = werte.reduce((a, b) => a + b, 0) / werte.length;
    const bewertet = Object.keys(jeSaison)
      .map(Number)
      .sort((a, b) => a - b);

    let differenz: number | null = null;
    let entwicklung: Entwicklung;
    if (bewertet.length >= 2) {
      differenz = jeSaison[bewertet.at(-1)!] - jeSaison[bewertet.at(-2)!];
      const cent = Math.round(differenz * 100);
      entwicklung = cent > 0 ? 'besser' : cent < 0 ? 'schlechter' : 'unveraendert';
    } else {
      entwicklung = bewertet.length === 1 && bewertet[0] === letzte && alleSaisons.length > 1 ? 'neu' : 'einmalig';
    }
    const neuester = [...liste].sort((a, b) => b.erstelltAm - a.erstelltAm)[0];
    out.push({ stand: neuester.stand, markt: neuester.markt, jeSaison, differenz, entwicklung });
  }
  const mehrfach = (w: Wiederholung) => (Object.keys(w.jeSaison).length > 1 ? 0 : 1);
  return out.sort((a, b) => mehrfach(a) - mehrfach(b) || a.stand.localeCompare(b.stand, 'de'));
}

export type Abdeckung = 'noch nie da' | 'kaum erkundet' | 'abgedeckt';

export interface MarktStand {
  markt: string;
  becher: number;
  staende: number;
  abdeckung: Abdeckung;
}

/** Wie gut ist jeder Markt der gepflegten Liste erkundet? Schwellen wie im Sheet: 0 / unter 3 / ab 3. */
export function marktCheckliste(eintraege: readonly Eintrag[], maerkte: readonly string[]): MarktStand[] {
  return maerkte.map((markt) => {
    const hier = eintraege.filter((e) => e.markt === markt);
    const staende = new Set(hier.map((e) => standSchluessel(e.stand))).size;
    const abdeckung: Abdeckung = hier.length === 0 ? 'noch nie da' : hier.length < 3 ? 'kaum erkundet' : 'abgedeckt';
    return { markt, becher: hier.length, staende, abdeckung };
  });
}
