// Stände: Eine Bude (Name, Markt, Stadt) mit den Bewertungen vieler Leute. Reine Funktionen.
//
// Ein Eintrag (Becher) ist eine Bewertung einer Person. Die Rangliste zeigt Stände: der Durchschnitt aller
// Bewertungen, mit Anzahl. Wer denselben Stand mehrfach bewertet (mehrere Becher), zählt im Durchschnitt nur einmal:
// zuerst wird je Person gemittelt, dann über die Personen (siehe `personVon`). Die Reihenfolge ist genau die angezeigte Zahl (auf zwei Stellen), bei Gleichstand
// steht der Stand mit mehr Bewertungen vorn. Stände mit wenigen Bewertungen sind nur gekennzeichnet („wenige Bewertungen").

import { istPruefstelle, standIdent } from './community';
import { KRITERIEN, type Eintrag, type Gewichte } from './modell';
import { stadtVon, type MarktListe } from './orte';
import { medianVon, TOP_DEAL, vergleichspreise } from './preisleistung';
import { bewerte, runde2, sterne1, urteil, type Urteil, type Wertung } from './scoring';
import type { Zeile } from './auswertung';

/** Ab so vielen Bewertungen gilt ein Stand nicht mehr als „vorläufig". */
export const MIN_BEWERTUNGEN = 3;

export type Quelle = 'alle' | 'pruefstelle' | 'community';

/** Wertung einer Gruppe von Bewertungen. */
export interface Gruppenwert {
  /** Zahl der Bewertungen (Becher). */
  anzahl: number;
  /** Zahl der Personen (Geräte), die bewertet haben. Sie entscheidet über „wenige Bewertungen" und den Gleichstand. */
  personen: number;
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

/**
 * Die Person hinter einer Bewertung: das Gerät. Bestandsdaten (`import-…`) und Einträge ohne Kennung zählen einzeln,
 * damit die Bewertungen von 2025 unverändert bleiben.
 */
export const personVon = (e: Pick<Eintrag, 'id' | 'geraet'>): string => (e.geraet && !e.id.startsWith('import-') ? `g:${e.geraet}` : `e:${e.id}`);

/** Erst je Person mitteln, dann über die Personen: viele Becher derselben Person zählen im Durchschnitt wie einer. */
function mittelJePerson<T extends Pick<Eintrag, 'id' | 'geraet'>>(liste: readonly T[], wert: (e: T) => number | null): number | null {
  const je = new Map<string, number[]>();
  for (const e of liste) {
    const w = wert(e);
    if (w === null) continue;
    const k = personVon(e);
    je.set(k, [...(je.get(k) ?? []), w]);
  }
  return mittel([...je.values()].map((z) => mittel(z) as number));
}

export function gruppenwert(bewertungen: readonly Eintrag[], gewichte: Gewichte): Gruppenwert {
  const mitWertung = bewertungen.map((e) => ({ id: e.id, geraet: e.geraet, w: bewerte(e.noten, gewichte) }));
  const nur = (f: (x: Wertung) => number | null) => mittelJePerson(mitWertung, (e) => f(e.w));
  return {
    anzahl: bewertungen.length,
    personen: new Set(bewertungen.map(personVon)).size,
    gesamt: nur((x) => x.gesamt),
    gluehwein: nur((x) => x.gluehwein),
    drumherum: nur((x) => x.drumherum),
  };
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
      plWerte: gewaehlt.map((e) => ({ id: e.id, geraet: e.geraet, pl: e.noten.preisLeistung })),
      preise: vergleichspreise(gewaehlt),
      pruefstelle: gruppenwert(pruef, gewichte),
      community: gruppenwert(comm, gewichte),
    };
  });
  const mitWert = aufbau.filter((s) => s.wert.gesamt !== null);
  // Preis-Leistung hat eine eigene Rangfolge: das Mittel der Preis-Leistungs-Noten, ebenfalls ohne versteckte Gewichtung.
  type PlWert = { id: string; geraet?: string; pl: number | null };
  const dealWert = (pl: PlWert[]) => mittelJePerson(pl, (e) => e.pl);
  const dealPersonen = (pl: PlWert[]) => new Set(pl.filter((e) => e.pl !== null).map(personVon)).size;
  const dealRang = new Map(
    platziere(mitWert.filter((s) => dealPersonen(s.plWerte) > 0), (s) => dealWert(s.plWerte), (s) => dealPersonen(s.plWerte)).map((p) => [p.s.id, p.rang]),
  );
  const staende: Stand<T>[] = aufbau.map((s) => {
    const n = s.wert.personen;
    const rangWert = s.wert.gesamt;
    const { plWerte, preise, ...rest } = s;
    const punkte = dealWert(plWerte);
    return {
      ...rest,
      preis: { median: medianVon(preise), n: preise.length },
      deal: { punkte, anzahl: dealPersonen(plWerte), rangWert: punkte, rang: dealRang.get(s.id) ?? null, top: punkte !== null && runde2(punkte) >= TOP_DEAL },
      rangWert,
      vorlaeufig: n < MIN_BEWERTUNGEN,
      urteil: urteil(s.wert.gesamt),
      rang: null,
    };
  });
  return platziere(
    staende.filter((x) => x.wert.anzahl > 0),
    (x) => x.rangWert,
    (x) => x.wert.personen,
  ).map((p) => ({ ...p.s, rang: p.rang }));
}

/**
 * Sortiert nach der angezeigten Zahl (Sterne auf eine Stelle), bei Gleichstand nach Zahl der Bewertungen, dann nach Name.
 * Gleicher Wert bei gleicher Zahl von Bewertungen teilt den Platz (1, 1, 3).
 */
function platziere<S extends { stand: string }>(items: readonly S[], wert: (s: S) => number | null, anzahl: (s: S) => number): { s: S; rang: number }[] {
  const mit = items.filter((x) => wert(x) !== null);
  const sortiert = [...mit].sort(
    (a, b) => sterne1(wert(b)!) - sterne1(wert(a)!) || anzahl(b) - anzahl(a) || a.stand.localeCompare(b.stand, 'de'),
  );
  let rang = 0;
  return sortiert.map((x, i) => {
    const vor = sortiert[i - 1];
    if (!vor || sterne1(wert(vor)!) !== sterne1(wert(x)!) || anzahl(vor) !== anzahl(x)) rang = i + 1;
    return { s: x, rang };
  });
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

/** Mittel je Kriterium (in der Reihenfolge von KRITERIEN) über mehrere Bewertungen; null, wenn nie bewertet. */
export function kriterienMittel(bewertungen: readonly Eintrag[]): (number | null)[] {
  return KRITERIEN.map((k) => mittelJePerson(bewertungen, (e) => e.noten[k]));
}

export function anzahlText(n: number): string {
  return n === 1 ? '1 Bewertung' : `${n} Bewertungen`;
}

/** Auf zwei Stellen gerundet, für Vergleiche in Tests. */
export const gerundet = (x: number | null): number | null => (x === null ? null : runde2(x));

/** Ein Stand als Zeile der Top-Deals-Liste: statt der Gesamtnote steht die Preis-Leistung, statt des Platzes der Deal-Platz. */
export function dealAlsZeile(s: Stand): Zeile {
  const z = standAlsZeile(s);
  return { ...z, rang: s.deal.rang, wertung: { ...z.wertung, gesamt: s.deal.punkte } };
}
