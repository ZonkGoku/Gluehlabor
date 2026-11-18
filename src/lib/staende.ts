// Stände: Eine Bude (Name, Markt, Stadt) mit den Bewertungen vieler Leute. Reine Funktionen.
//
// Ein Eintrag (Becher) ist eine Bewertung einer Person. Die Rangliste zeigt Stände: der Durchschnitt aller
// Bewertungen, mit Anzahl. Wenige Bewertungen schlagen nicht durch: Für die Reihenfolge wird der Durchschnitt
// zum Mittel aller Bewertungen hingezogen (je weniger Bewertungen, desto stärker). Angezeigt wird immer der echte Durchschnitt.

import { abendVon, istPruefstelle, standIdent } from './community';
import type { Eintrag, Gewichte } from './modell';
import { stadtVon, type MarktListe } from './orte';
import { medianVon, TOP_DEAL, vergleichspreise } from './preisleistung';
import { bewerte, rangliste, runde2, urteil, type Urteil, type Wertung } from './scoring';
import type { Zeile } from './auswertung';

/** Ab so vielen Bewertungen gilt ein Stand nicht mehr als „vorläufig". */
export const MIN_BEWERTUNGEN = 3;
/** Gewicht des Gesamtmittels bei der Reihenfolge, gemessen in „Bewertungen". */
export const VORWERT_GEWICHT = 3;

export type Quelle = 'alle' | 'pruefstelle' | 'community';

/** Wertung einer Gruppe von Bewertungen. */
export interface Gruppenwert {
  anzahl: number;
  /** Durchschnitt der Gesamtnoten, ungerundet. null ohne Bewertung. */
  gesamt: number | null;
  gluehwein: number | null;
  drumherum: number | null;
}

export interface Stand<T extends Eintrag = Eintrag> {
  /** Stabile Kennung des Stands, auch als Adresse (#/stand/<id>). */
  id: string;
  stand: string;
  markt: string;
  stadt?: string;
  /** Alle Bewertungen dieses Stands in der gewählten Quelle, neueste zuerst. */
  bewertungen: T[];
  /** Gesamtwert der gewählten Quelle. */
  wert: Gruppenwert;
  /** Immer beide Seiten, unabhängig von der gewählten Quelle. */
  pruefstelle: Gruppenwert;
  community: Gruppenwert;
  /** Preis je 0,2 l (Median der vergleichbaren Meldungen); null ohne Preis. */
  preis: { median: number | null; n: number };
  /** Preis-Leistung: Mittel der Preis-Leistungs-Noten, eigene Rangfolge („Top Deals"). */
  deal: { punkte: number | null; anzahl: number; rangWert: number | null; rang: number | null; top: boolean };
  /** Wert für die Reihenfolge (zum Mittel hingezogen). */
  rangWert: number | null;
  vorlaeufig: boolean;
  urteil: Urteil | null;
  rang: number | null;
}

const mittel = (zahlen: number[]): number | null => (zahlen.length ? zahlen.reduce((a, b) => a + b, 0) / zahlen.length : null);

export function gruppenwert(bewertungen: readonly Eintrag[], gewichte: Gewichte): Gruppenwert {
  const w = bewertungen.map((e) => bewerte(e.noten, gewichte));
  const nur = (f: (x: Wertung) => number | null) => mittel(w.map(f).filter((x): x is number => x !== null));
  return { anzahl: bewertungen.length, gesamt: nur((x) => x.gesamt), gluehwein: nur((x) => x.gluehwein), drumherum: nur((x) => x.drumherum) };
}

/** Kennung des Stands, zu dem ein Eintrag gehört. Die Stadt folgt wenn nötig aus der gepflegten Marktliste. */
export function standId(e: Eintrag, liste: MarktListe): string {
  return standIdent({ stand: e.stand, stadt: stadtVon(liste, e) });
}

/** Häufigster echter Markt der Bewertungen; ohne Angabe „Sonstiger". */
function haeufigsterMarkt(bewertungen: readonly Eintrag[], liste: MarktListe): string {
  const z = new Map<string, number>();
  for (const e of bewertungen) if (e.markt !== liste.sonstiger) z.set(e.markt, (z.get(e.markt) ?? 0) + 1);
  return [...z.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? liste.sonstiger;
}

/** Häufigste Schreibweise, bei Gleichstand die zuletzt benutzte. */
function schoensteSchreibweise(bewertungen: readonly Eintrag[]): string {
  const z = new Map<string, number>();
  for (const e of bewertungen) z.set(e.stand.trim(), (z.get(e.stand.trim()) ?? 0) + 1);
  return [...z.entries()].sort((a, b) => b[1] - a[1])[0][0];
}

/**
 * Gruppiert Bewertungen zu Ständen, wertet sie aus und vergibt Plätze (1, 1, 3).
 * `quelle` begrenzt, welche Bewertungen zählen; Stände ohne Bewertung der Quelle fallen weg.
 */
export function baueStaende<T extends Eintrag>(
  eintraege: readonly T[],
  liste: MarktListe,
  gewichte: Gewichte,
  quelle: Quelle = 'alle',
): Stand<T>[] {
  const gruppen = new Map<string, T[]>();
  for (const e of eintraege) {
    const id = standId(e, liste);
    if (id.startsWith('|')) continue; // Stand ohne verwertbaren Namen
    gruppen.set(id, [...(gruppen.get(id) ?? []), e]);
  }
  const aufbau = [...gruppen.entries()].map(([id, alle]) => {
    const neueste = [...alle].sort((a, b) => b.erstelltAm - a.erstelltAm);
    const pruef = neueste.filter((e) => istPruefstelle(e));
    const comm = neueste.filter((e) => !istPruefstelle(e));
    const gewaehlt = quelle === 'alle' ? neueste : quelle === 'pruefstelle' ? pruef : comm;
    const ref = neueste[0];
    return {
      id,
      stand: schoensteSchreibweise(neueste),
      markt: haeufigsterMarkt(neueste, liste),
      stadt: stadtVon(liste, ref) ?? undefined,
      bewertungen: gewaehlt,
      wert: gruppenwert(gewaehlt, gewichte),
      plNoten: gewaehlt.map((e) => e.noten.preisLeistung).filter((x): x is number => x !== null),
      preise: vergleichspreise(gewaehlt),
      pruefstelle: gruppenwert(pruef, gewichte),
      community: gruppenwert(comm, gewichte),
    };
  });
  const mitWert = aufbau.filter((s) => s.wert.gesamt !== null);
  // Mittel aller einzelnen Bewertungen der Quelle: der Wert, zu dem wenige Bewertungen hingezogen werden.
  const alleNoten = mitWert.flatMap((s) => s.bewertungen.map((e) => bewerte(e.noten, gewichte).gesamt).filter((x): x is number => x !== null));
  const vorwert = mittel(alleNoten) ?? 0;
  // Preis-Leistung hat eine eigene Rangfolge, ebenfalls zum Mittel hingezogen.
  const alleDeal = mitWert.flatMap((s) => s.plNoten);
  const dealVorwert = mittel(alleDeal) ?? 0;
  const dealWert = (plNoten: number[]) => {
    const p = mittel(plNoten);
    return p === null ? null : (plNoten.length * p + VORWERT_GEWICHT * dealVorwert) / (plNoten.length + VORWERT_GEWICHT);
  };
  const dealRang = new Map(rangliste(mitWert.filter((s) => s.plNoten.length > 0), (s) => dealWert(s.plNoten)).map((p) => [p.eintrag.id, p.rang]));
  const staende: Stand<T>[] = aufbau.map((s) => {
    const n = s.wert.anzahl;
    const rangWert = s.wert.gesamt === null ? null : (n * s.wert.gesamt + VORWERT_GEWICHT * vorwert) / (n + VORWERT_GEWICHT);
    const { plNoten, preise, ...rest } = s;
    const punkte = mittel(plNoten);
    return {
      ...rest,
      preis: { median: medianVon(preise), n: preise.length },
      deal: { punkte, anzahl: plNoten.length, rangWert: dealWert(plNoten), rang: dealRang.get(s.id) ?? null, top: punkte !== null && runde2(punkte) >= TOP_DEAL },
      rangWert,
      vorlaeufig: n < MIN_BEWERTUNGEN,
      urteil: urteil(s.wert.gesamt),
      rang: null,
    };
  });
  const platziert = rangliste(
    staende.filter((s) => s.wert.anzahl > 0),
    (s) => s.rangWert,
  );
  return platziert.map((p) => ({ ...p.eintrag, rang: p.rang }));
}

/** Ein Stand als Zeile der Rangliste, damit Karten und Zeilen der Ansichten ihn wie einen Eintrag darstellen können. */
export function standAlsZeile(s: Stand): Zeile {
  const ref = s.bewertungen[0];
  return {
    rang: s.rang,
    eintrag: { ...ref, stand: s.stand, markt: s.markt, stadt: s.stadt ?? ref.stadt },
    wertung: { gesamt: s.wert.gesamt, gluehwein: s.wert.gluehwein, drumherum: s.wert.drumherum, urteil: s.urteil },
  };
}

export function anzahlText(n: number): string {
  return n === 1 ? '1 Bewertung' : `${n} Bewertungen`;
}

/** Hat dieses Gerät den Stand an diesem Abend schon bewertet? Dieselbe Regel wie auf dem Server. */
export function schonBewertet(
  eintraege: readonly Eintrag[],
  geraetId: string | null,
  kandidat: { stand: string; markt: string; stadt?: string; datum?: string; erstelltAm: number },
): boolean {
  if (!geraetId) return false;
  const ident = standIdent(kandidat);
  const abend = abendVon(kandidat);
  return eintraege.some((e) => e.geraet === geraetId && standIdent(e) === ident && abendVon(e) === abend);
}

/** Auf zwei Stellen gerundet, für Vergleiche in Tests. */
export const gerundet = (x: number | null): number | null => (x === null ? null : runde2(x));

/** Ein Stand als Zeile der Top-Deals-Liste: statt der Gesamtnote steht die Preis-Leistung, statt des Platzes der Deal-Platz. */
export function dealAlsZeile(s: Stand): Zeile {
  const z = standAlsZeile(s);
  return { ...z, rang: s.deal.rang, wertung: { ...z.wertung, gesamt: s.deal.punkte } };
}
