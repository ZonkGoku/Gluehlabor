import { describe, expect, it } from 'vitest';
import { guenstigste, preisKlasse, referenzMedian } from './preisklasse';
import type { Stand } from './staende';

const st = (stand: string, median: number | null, gesamt = 6): Stand => ({ stand, preis: { median, n: 1 }, wert: { gesamt } } as unknown as Stand);

describe('preisKlasse', () => {
  it('Referenz braucht mindestens drei Preise', () => {
    expect(referenzMedian([4, 5])).toBeNull();
    expect(referenzMedian([4, 5, 7])).toBe(5);
  });
  it('günstig, normal, teuer mit 50 Cent Abstand', () => {
    expect(preisKlasse(4.5, 5)).toBe('guenstig');
    expect(preisKlasse(5.4, 5)).toBe('normal');
    expect(preisKlasse(5.5, 5)).toBe('teuer');
  });
  it('ohne Preis oder Referenz: keine Klasse', () => {
    expect(preisKlasse(null, 5)).toBeNull();
    expect(preisKlasse(5, null)).toBeNull();
  });
});

describe('guenstigste', () => {
  it('sortiert nach Preis, ohne Preis weg, gleicher Preis nach Note', () => {
    const r = guenstigste([st('C', 6), st('A', 4, 5), st('N', null), st('B', 4, 8)]);
    expect(r.map((s) => s.stand)).toEqual(['B', 'A', 'C']);
  });
});
