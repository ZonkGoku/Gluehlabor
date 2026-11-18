import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { abendDatum, naechsteBecherNr } from './abend';
import { ankerFuer, type AnkerDaten } from './anker';
import { KRITERIEN } from './modell';

const anker: AnkerDaten = JSON.parse(readFileSync(resolve(process.cwd(), 'data/anker.json'), 'utf8'));

describe('anker.json', () => {
  it('hat für jedes Kriterium Label und die Anker 2, 4, 6, 8, 10', () => {
    for (const k of KRITERIEN) {
      expect(anker[k].label).toBeTruthy();
      expect(Object.keys(anker[k].anker).sort()).toEqual(['10', '2', '4', '6', '8']);
    }
  });
});

describe('ankerFuer', () => {
  const g = () => anker.geschmack;
  it('gerade Note: genau ein Anker', () => {
    expect(ankerFuer(g(), 8).map((a) => a.stufe)).toEqual([8]);
  });
  it('ungerade Note: Nachbarn oben und unten', () => {
    expect(ankerFuer(g(), 7).map((a) => a.stufe)).toEqual([8, 6]);
    expect(ankerFuer(g(), 9).map((a) => a.stufe)).toEqual([10, 8]);
  });
  it('Note 1 liegt unter dem untersten Anker', () => {
    expect(ankerFuer(g(), 1).map((a) => a.stufe)).toEqual([2]);
  });
  it('keine Note: Skalenenden', () => {
    expect(ankerFuer(g(), null).map((a) => a.stufe)).toEqual([10, 2]);
  });
  it('liefert die Texte aus den Daten', () => {
    expect(ankerFuer(g(), 2)[0].text).toBe('Man lässt den Rest stehen.');
  });
});

describe('abendDatum', () => {
  it('abends: dasselbe Datum', () => {
    expect(abendDatum(new Date(2026, 11, 3, 21, 15))).toBe('2026-12-03');
  });
  it('nach Mitternacht bis 5 Uhr: Vortag', () => {
    expect(abendDatum(new Date(2026, 11, 4, 0, 30))).toBe('2026-12-03');
    expect(abendDatum(new Date(2026, 11, 1, 4, 59))).toBe('2026-11-30');
  });
  it('ab 5 Uhr: neuer Tag', () => {
    expect(abendDatum(new Date(2026, 11, 4, 5, 0))).toBe('2026-12-04');
  });
});

describe('naechsteBecherNr', () => {
  it('erster Becher des Abends: 1', () => expect(naechsteBecherNr([], '2026-12-03')).toBe(1));
  it('zählt nur denselben Abend', () => {
    const e = [
      { datum: '2026-12-03', becherNr: 2 },
      { datum: '2026-12-02', becherNr: 5 },
      { datum: '2026-12-03' },
    ];
    expect(naechsteBecherNr(e, '2026-12-03')).toBe(3);
  });
  it('höchstens 7', () => {
    expect(naechsteBecherNr([{ datum: 'x', becherNr: 7 }], 'x')).toBe(7);
  });
});
