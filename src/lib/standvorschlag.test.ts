import { describe, expect, it } from 'vitest';
import { abstand, kanonischerStand, schlageStaendeVor, type StandEintrag } from './standvorschlag';

const E = (stand: string, markt: string, stadt?: string): StandEintrag => ({ stand, markt, stadt });
const BESTAND = [
  E('Salz Chrom', 'Sonstiger', 'Hamburg'),
  E('Salz Chrom', 'Sonstiger', 'Hamburg'),
  E('salz chrom', 'Sonstiger', 'Hamburg'),
  E('Ikea Altona', 'Ikea Altona'),
  E('Glühweinkönig', 'Christkindlesmarkt'),
  E('Glühweinkönig', 'Rathausmarkt'),
  E('Otten Schleenwurm', 'Ottensen'),
  E('Santa Pauli', 'Santa Pauli'),
];

describe('abstand (Levenshtein)', () => {
  it('zählt Einfügen, Löschen und Ersetzen', () => {
    expect(abstand('abc', 'abc')).toBe(0);
    expect(abstand('abc', 'abd')).toBe(1);
    expect(abstand('abc', 'ab')).toBe(1);
    expect(abstand('', 'abc')).toBe(3);
    expect(abstand('kitten', 'sitting')).toBe(3);
  });
});

describe('schlageStaendeVor', () => {
  it('zu kurze Eingabe: nichts', () => {
    expect(schlageStaendeVor(BESTAND, '')).toEqual([]);
    expect(schlageStaendeVor(BESTAND, 's')).toEqual([]);
  });
  it('Anfang des Namens, ohne Groß/Klein; Schreibweisen werden zusammengefasst, die häufigste gewinnt', () => {
    const v = schlageStaendeVor(BESTAND, 'SALZ');
    expect(v).toHaveLength(1);
    expect(v[0]).toMatchObject({ stand: 'Salz Chrom', markt: 'Sonstiger', stadt: 'Hamburg', anzahl: 3 });
  });
  it('Bindestrich und Leerzeichen sind gleich', () => {
    expect(schlageStaendeVor(BESTAND, 'salz-chrom')[0]?.stand).toBe('Salz Chrom');
  });
  it('Teil eines späteren Worts findet den Stand', () => {
    expect(schlageStaendeVor(BESTAND, 'chrom')[0]?.stand).toBe('Salz Chrom');
    expect(schlageStaendeVor(BESTAND, 'altona')[0]?.stand).toBe('Ikea Altona');
  });
  it('Tippfehler werden verziehen, aber nicht jeder Unsinn', () => {
    expect(schlageStaendeVor(BESTAND, 'santa paulie')[0]?.stand).toBe('Santa Pauli');
    // fehlende Umlaute (Tippen ohne Umlauttaste) zählen als zwei Fehler und werden bei langen Namen verziehen
    expect(schlageStaendeVor(BESTAND, 'gluhweinkonig').map((x) => x.stand)).toContain('Glühweinkönig');
    expect(schlageStaendeVor(BESTAND, 'salzburger')).toEqual([]);
  });
  it('derselbe Name an zwei Märkten sind zwei Vorschläge; der Markt der Erfassung zuerst', () => {
    const v = schlageStaendeVor(BESTAND, 'glühwein', 'Rathausmarkt');
    expect(v.map((x) => x.markt)).toEqual(['Rathausmarkt', 'Christkindlesmarkt']);
    const w = schlageStaendeVor(BESTAND, 'glühwein', 'Christkindlesmarkt');
    expect(w.map((x) => x.markt)).toEqual(['Christkindlesmarkt', 'Rathausmarkt']);
  });
  it('höchstens fünf', () => {
    const viele = Array.from({ length: 12 }, (_, i) => E(`Stand ${i}`, 'M'));
    expect(schlageStaendeVor(viele, 'stand')).toHaveLength(5);
  });
  it('findet nichts, wenn nichts passt', () => {
    expect(schlageStaendeVor(BESTAND, 'xyzxyz')).toEqual([]);
  });
});

describe('gleicher Name in verschiedenen Städten (Markt „Sonstiger")', () => {
  const B = [E('Max', 'Sonstiger', 'Traunstein'), E('Max', 'Sonstiger', 'Salzburg'), E('Max', 'Sonstiger', 'Salzburg')];
  it('sind getrennte Vorschläge', () => {
    const v = schlageStaendeVor(B, 'max');
    expect(v.map((x) => [x.stadt, x.anzahl]).sort()).toEqual([['Salzburg', 2], ['Traunstein', 1]]);
  });
  it('die Schreibweise wird nur aus derselben Stadt übernommen', () => {
    const C = [E('MAX', 'Sonstiger', 'Traunstein'), E('Max', 'Sonstiger', 'Salzburg')];
    expect(kanonischerStand(C, 'max', 'Sonstiger', 'Traunstein')).toBe('MAX');
    expect(kanonischerStand(C, 'max', 'Sonstiger', 'salzburg')).toBe('Max');
  });
});

describe('kanonischerStand', () => {
  it('übernimmt die Schreibweise des vorhandenen Stands am selben Markt', () => {
    expect(kanonischerStand(BESTAND, 'SALZ-CHROM', 'sonstiger')).toBe('Salz Chrom');
  });
  it('anderer Markt: Eingabe bleibt, nur getrimmt', () => {
    expect(kanonischerStand(BESTAND, '  salz chrom ', 'Rathausmarkt')).toBe('salz chrom');
  });
  it('neuer Stand bleibt unverändert', () => {
    expect(kanonischerStand(BESTAND, 'Neuer Stand', 'Sonstiger')).toBe('Neuer Stand');
  });
});
