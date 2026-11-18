import { describe, expect, it } from 'vitest';
import { DEFAULT_GEWICHTE, leereNoten, type Eintrag, type Noten } from './modell';
import { berechnePreisLeistung, medianVon, preisJeBasis, referenzPreis, START_REFERENZ, vergleichbar, vergleichspreise } from './preisleistung';

const LISTE = { sonstiger: 'Sonstiger', staedte: [{ stadt: 'Hamburg', maerkte: ['Rathausmarkt'] }] };
const G = DEFAULT_GEWICHTE;
const n = (gs: number, ge = gs, te = gs): Noten => ({ ...leereNoten(), geschmack: gs, geruch: ge, temperatur: te });
let i = 0;
const e = (preis: number, p: Partial<Eintrag> = {}): Eintrag => ({ id: `id-${++i}-xxxxxxxx`, stand: 'S', markt: 'Rathausmarkt', stadt: 'Hamburg', saison: 2026, noten: n(7), erstelltAm: i, preis, ...p });

describe('Preis auf 0,2 l', () => {
  it('rechnet um, ohne Angabe gilt 0,2 l', () => {
    expect(preisJeBasis(5)).toBe(5);
    expect(preisJeBasis(6, 0.3)).toBe(4);
    expect(preisJeBasis(5, 0.25)).toBe(4);
  });
  it('Median', () => {
    expect(medianVon([])).toBeNull();
    expect(medianVon([3, 1, 2])).toBe(2);
    expect(medianVon([4, 1, 2, 3])).toBe(2.5);
  });
  it('nur Glühwein mit Alkohol und brauchbare Preise sind vergleichbar', () => {
    expect(vergleichbar('rot')).toBe(true);
    expect(vergleichbar(undefined)).toBe(true);
    expect(vergleichbar('alkoholfrei')).toBe(false);
    expect(vergleichbar('feuerzangen')).toBe(false);
    expect(vergleichspreise([e(5), e(4, { sorte: 'alkoholfrei' }), e(99), e(0.2), e(6, { menge: 0.3 })])).toEqual([5, 4]);
  });
});

describe('Referenzpreis', () => {
  it('ohne Meldungen oder Stadt: Startwert', () => {
    expect(referenzPreis([], 'Hamburg', LISTE)).toBe(START_REFERENZ);
    expect(referenzPreis([e(6)], null, LISTE)).toBe(START_REFERENZ);
  });
  it('wenige Meldungen ziehen nur etwas, viele übernehmen die Stadt', () => {
    expect(referenzPreis([e(7)], 'Hamburg', LISTE)).toBeCloseTo((7 + 5 * 5) / 6, 2);
    const viele = Array.from({ length: 95 }, () => e(6));
    expect(referenzPreis(viele, 'Hamburg', LISTE)).toBeGreaterThan(5.9);
  });
  it('andere Städte zählen nicht', () => {
    expect(referenzPreis([e(8, { stadt: 'Köln', markt: 'X' })], 'Hamburg', LISTE)).toBe(START_REFERENZ);
  });
});

describe('Preis-Leistung', () => {
  it('beim Referenzpreis gleich der Glühwein-Note', () => {
    expect(berechnePreisLeistung(n(7), G, 5, undefined, 5)).toBe(7);
  });
  it('0,5 Punkte je Euro; gleich viel Wert für teuren Guten und billigen Schlichten', () => {
    expect(berechnePreisLeistung(n(7), G, 5.5, undefined, 5)).toBe(7); // 6,75 → 7
    expect(berechnePreisLeistung(n(6), G, 3.5, undefined, 5)).toBe(7); // 6,75 → 7
    expect(berechnePreisLeistung(n(8), G, 7, undefined, 5)).toBe(7);
    expect(berechnePreisLeistung(n(8), G, 3, undefined, 5)).toBe(9);
  });
  it('begrenzt auf 1 bis 10', () => {
    expect(berechnePreisLeistung(n(10), G, 2, undefined, 5)).toBe(10);
    expect(berechnePreisLeistung(n(2), G, 12, undefined, 5)).toBe(1);
  });
  it('rechnet die Größe ein', () => {
    expect(berechnePreisLeistung(n(7), G, 7.5, 0.3, 5)).toBe(7); // 7,5 € für 0,3 l = 5 € je 0,2 l
  });
  it('ohne Preis, ohne Glühwein-Note oder bei nicht vergleichbarer Sorte: null', () => {
    expect(berechnePreisLeistung(n(7), G, undefined, undefined, 5)).toBeNull();
    expect(berechnePreisLeistung({ ...leereNoten(), personal: 8 }, G, 5, undefined, 5)).toBeNull();
    expect(berechnePreisLeistung(n(7), G, 5, undefined, 5, 'alkoholfrei')).toBeNull();
    expect(berechnePreisLeistung(n(7), G, 5, undefined, 5, 'feuerzangen')).toBeNull();
  });
  it('bewertet nur mit den Noten, die es gibt (null fällt aus Zähler und Nenner)', () => {
    expect(berechnePreisLeistung({ ...leereNoten(), geschmack: 8 }, G, 5, undefined, 5)).toBe(8);
  });
});
