import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import type { MarktListe } from './orte';
import { baueOrte, beliebteStaedte, entfernungKm, findeOrt, maerkteIn, naechsteOrte, schluessel, sucheOrte, type OrteDaten } from './ortssuche';

const daten: OrteDaten = JSON.parse(readFileSync(resolve(process.cwd(), 'data/orte.json'), 'utf8'));
const orte = baueOrte(daten);
const liste: MarktListe = JSON.parse(readFileSync(resolve(process.cwd(), 'data/maerkte.json'), 'utf8'));
const namen = (r: { name: string }[]) => r.map((o) => o.name);

describe('schluessel', () => {
  it('Umlaute, ß, Großschreibung, Satzzeichen', () => {
    expect(schluessel('München')).toBe(schluessel('muenchen'));
    expect(schluessel('Düsseldorf')).toBe(schluessel('Duesseldorf'));
    expect(schluessel('Köln')).toBe(schluessel('KOELN'));
    expect(schluessel('Straßburg')).toBe('strassburg');
    expect(schluessel('Halle (Saale)')).toBe('halle saale');
    expect(schluessel('  Rothenburg   ob der Tauber ')).toBe('rothenburg ob der tauber');
  });
});

describe('Ortsdaten', () => {
  it('rund 4000 Orte aus Deutschland und Österreich, Quelle genannt', () => {
    expect(orte.length).toBeGreaterThan(3500);
    expect(daten.quelle).toMatch(/GeoNames/);
  });
  it('Bundesländer stimmen', () => {
    const land = (n: string) => findeOrt(orte, n)?.land;
    expect(land('München')).toBe('Bayern');
    expect(land('Traunstein')).toBe('Bayern');
    expect(land('Hamburg')).toBe('Hamburg');
    expect(land('Köln')).toBe('Nordrhein-Westfalen');
    expect(land('Dresden')).toBe('Sachsen');
    expect(land('Berlin')).toBe('Berlin');
    expect(land('Salzburg')).toBe('Österreich');
    expect(land('Wien')).toBe('Österreich');
  });
  it('keine Stadtteile wie Wandsbek oder Kreuzberg, keine englischen Namen', () => {
    for (const n of ['Wandsbek', 'Kreuzberg', 'Prenzlauer Berg', 'Munich', 'Vienna']) expect(findeOrt(orte, n), n).toBeNull();
  });
  it('alle gepflegten Städte sind enthalten', () => {
    for (const s of liste.staedte) expect(findeOrt(orte, s.stadt), s.stadt).not.toBeNull();
  });
});

describe('sucheOrte', () => {
  it('leere Eingabe: nichts', () => expect(sucheOrte(orte, '  ')).toEqual([]));
  it('„mü": große Städte zuerst', () => {
    const r = namen(sucheOrte(orte, 'mü'));
    expect(r[0]).toBe('München');
    expect(r).toContain('Münster');
  });
  it('ohne Umlaut und Großschreibung', () => {
    expect(sucheOrte(orte, 'MUENCHEN')[0].name).toBe('München');
    expect(sucheOrte(orte, 'koeln')[0].name).toBe('Köln');
    expect(sucheOrte(orte, 'dusseldorf')[0].name).toBe('Düsseldorf');
  });
  it('Anfang schlägt Mitte: „salz" findet Salzburg vor Orten mit „salz" mittendrin', () => {
    const r = namen(sucheOrte(orte, 'salz', 5));
    expect(r[0]).toBe('Salzburg');
  });
  it('Wortanfang: „main" findet Frankfurt am Main', () => {
    expect(namen(sucheOrte(orte, 'am main', 20))).toContain('Frankfurt am Main');
  });
  it('findet kleine Orte', () => {
    expect(namen(sucheOrte(orte, 'traunst'))).toContain('Traunstein');
    expect(namen(sucheOrte(orte, 'rothenburg'))).toContain('Rothenburg ob der Tauber');
  });
  it('höchstens max, keine Dubletten', () => {
    const r = sucheOrte(orte, 'neustadt', 6);
    expect(r.length).toBeLessThanOrEqual(6);
    expect(new Set(r.map((o) => `${o.name}|${o.land}`)).size).toBe(r.length);
  });
  it('Unsinn: nichts', () => expect(sucheOrte(orte, 'qqqzzz')).toEqual([]));
});

describe('naechsteOrte', () => {
  it('von Salzburg aus ist Salzburg der nächste Ort', () => {
    const s = findeOrt(orte, 'Salzburg')!;
    const r = naechsteOrte(orte, s.lat + 0.01, s.lon, 3);
    expect(r[0].name).toBe('Salzburg');
    expect(r[0].km).toBeLessThan(3);
  });
  it('Entfernung Hamburg München etwa 610 km', () => {
    expect(entfernungKm(53.55, 9.99, 48.14, 11.58)).toBeGreaterThan(600);
    expect(entfernungKm(53.55, 9.99, 48.14, 11.58)).toBeLessThan(620);
  });
});

describe('beliebteStaedte und maerkteIn', () => {
  const E = [
    { markt: 'Rathausmarkt' },
    { markt: 'Ottensen' },
    { markt: 'Ottensen' },
    { markt: 'Sonstiger', stadt: 'Salzburg' },
    { markt: 'Sonstiger', stadt: 'Salzburg' },
    { markt: 'Dorfmarkt', stadt: 'Hamburg' },
    { markt: 'Sonstiger' },
  ];
  it('Städte nach Zahl der Becher', () => {
    expect(beliebteStaedte(E, liste)).toEqual([
      { stadt: 'Hamburg', becher: 4 },
      { stadt: 'Salzburg', becher: 2 },
    ]);
  });
  it('Märkte einer Stadt: gepflegte und selbst eingetragene, genutzte zuerst, ohne „Sonstiger"', () => {
    const m = maerkteIn(E, liste, 'hamburg');
    expect(m[0]).toEqual({ markt: 'Ottensen', gepflegt: true, becher: 2 });
    expect(m.find((x) => x.markt === 'Dorfmarkt')).toEqual({ markt: 'Dorfmarkt', gepflegt: false, becher: 1 });
    expect(m.some((x) => x.markt === 'Sonstiger')).toBe(false);
    expect(m.find((x) => x.markt === 'Fleetinsel')).toMatchObject({ gepflegt: true, becher: 0 });
  });
  it('Stadt ohne gepflegte Märkte: nur die genutzten', () => {
    expect(maerkteIn(E, liste, 'Salzburg')).toEqual([]);
  });
});
