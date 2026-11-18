import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { importiereCsv } from './csvImport';
import { leereNoten, type Eintrag } from './modell';
import type { MarktListe } from './orte';
import { MINDESTMELDUNGEN, preisindex } from './preisindex';

const liste: MarktListe = JSON.parse(readFileSync(resolve(process.cwd(), 'data/maerkte.json'), 'utf8'));
let z = 0;
const e = (preis: number | undefined, extra: Partial<Eintrag> = {}): Eintrag => ({
  id: `p-${++z}`,
  stand: 'S',
  markt: 'Rathausmarkt',
  saison: 2026,
  noten: { ...leereNoten(), geschmack: 6 },
  erstelltAm: 1,
  ...(preis === undefined ? {} : { preis }),
  ...extra,
});
const viele = (preise: number[], extra: Partial<Eintrag> = {}) => preise.map((p) => e(p, extra));

describe('preisindex', () => {
  it('Median, Mittel, Spanne je Stadt ab Mindestzahl', () => {
    const r = preisindex(viele([4, 4.5, 5, 4.5, 6]), liste);
    expect(r.zeilen).toEqual([{ stadt: 'Hamburg', n: 5, median: 4.5, mittel: 4.8, min: 4, max: 6 }]);
    expect(r.gesamt).toMatchObject({ n: 5, median: 4.5 });
  });

  it(`zu wenige Meldungen (unter ${MINDESTMELDUNGEN}): keine Stadtzeile, kein Gesamtwert`, () => {
    const r = preisindex(viele([4, 4.5, 5, 4.5]), liste);
    expect(r.zeilen).toEqual([]);
    expect(r.gesamt).toBeNull();
    expect(r.meldungen).toBe(4);
  });

  it('gerade Anzahl: Median ist der Mittelwert der mittleren zwei, auf Cent gerundet', () => {
    const r = preisindex(viele([4, 4.5, 4.5, 5, 5, 6.25]), liste);
    expect(r.zeilen[0].median).toBe(4.75);
    expect(preisindex(viele([3, 4, 4, 4, 4, 5, 4.01]), liste, 5).zeilen[0].mittel).toBe(4);
  });

  it('Ausreißer verzerren den Median kaum', () => {
    const r = preisindex(viele([4, 4.5, 4.5, 5, 14.9]), liste);
    expect(r.zeilen[0].median).toBe(4.5);
    expect(r.zeilen[0].max).toBe(14.9);
  });

  it('unplausible Preise und Alkoholfreies zählen nicht', () => {
    const r = preisindex(
      [...viele([4, 4.5, 5, 4.5, 6]), e(0.5), e(0), e(40), e(2, { sorte: 'alkoholfrei' }), e(undefined)],
      liste,
    );
    expect(r.meldungen).toBe(5);
    expect(r.zeilen[0].n).toBe(5);
  });

  it('Städte getrennt, meistgemeldete zuerst, gleiche Anzahl alphabetisch', () => {
    const hh = viele([4, 4, 4, 4, 4, 4], { markt: 'Ottensen' });
    const m = viele([6, 6, 6, 6, 6], { markt: 'Marienplatz', stadt: 'München' });
    const b = viele([5, 5, 5, 5, 5], { markt: 'Rathaus', stadt: 'Berlin' });
    const r = preisindex([...m, ...b, ...hh], liste);
    expect(r.zeilen.map((x) => [x.stadt, x.n])).toEqual([['Hamburg', 6], ['Berlin', 5], ['München', 5]]);
  });

  it('Meldungen ohne bekannte Stadt zählen im Gesamtwert, aber in keiner Stadtzeile', () => {
    const r = preisindex(viele([4, 4, 4, 4, 4], { markt: 'Sonstiger' }), liste);
    expect(r.zeilen).toEqual([]);
    expect(r.gesamt).toMatchObject({ n: 5, median: 4 });
  });

  it('Bestand 2025 hat keine Preise: leer, ohne Fehler', () => {
    const bestand = importiereCsv(readFileSync(resolve(process.cwd(), 'data/gluehwein-2025.csv'), 'utf8'));
    expect(preisindex(bestand, liste)).toEqual({ zeilen: [], gesamt: null, meldungen: 0, schwelle: 5 });
  });

  it('leere Liste', () => expect(preisindex([], liste).meldungen).toBe(0));
});
