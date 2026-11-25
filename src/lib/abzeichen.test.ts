import { describe, expect, it } from 'vitest';
import { berechneAbzeichen, neueAbzeichen, passStempel, stufeFuer } from './abzeichen';
import { leereNoten, type Eintrag } from './modell';

const LISTE = {
  sonstiger: 'Sonstiger',
  staedte: [
    { stadt: 'Hamburg', maerkte: ['Rathausmarkt', 'Winterwald', 'Santa Pauli'] },
    { stadt: 'München', maerkte: ['Marienplatz'] },
    { stadt: 'Köln', maerkte: ['Dom'] },
  ],
};
let n = 0;
const b = (p: Partial<Eintrag> & { fotoBlob?: unknown } = {}): Eintrag & { fotoBlob?: unknown } => ({
  id: `id-${++n}-xxxxxxxx`,
  stand: `Stand ${n}`,
  markt: 'Rathausmarkt',
  stadt: 'Hamburg',
  saison: 2026,
  datum: '2026-11-21',
  noten: { ...leereNoten(), geschmack: 8 },
  erstelltAm: new Date(2026, 10, 21, 18, 0).getTime(),
  geraet: 'ich',
  ...p,
});
const erreicht = (meine: Eintrag[], alle: Eintrag[] = meine) => new Set(berechneAbzeichen(meine, alle, LISTE).filter((x) => x.erreicht).map((x) => x.id));

describe('Abzeichen', () => {
  it('ohne Bewertung gibt es nichts', () => {
    expect(erreicht([]).size).toBe(0);
  });
  it('Erster Schluck mit der ersten Bewertung', () => {
    expect(erreicht([b()]).has('erster-schluck')).toBe(true);
  });
  it('Stammgast ab 10 Bewertungen, Fortschritt zählt bis zum Ziel', () => {
    const meine = Array.from({ length: 9 }, () => b());
    const a = berechneAbzeichen(meine, meine, LISTE).find((x) => x.id === 'stammgast')!;
    expect(a.erreicht).toBe(false);
    expect(a.stand).toBe(9);
    expect(erreicht([...meine, b()]).has('stammgast')).toBe(true);
    expect(berechneAbzeichen(Array.from({ length: 14 }, () => b()), [], LISTE).find((x) => x.id === 'stammgast')!.stand).toBe(10);
  });
  it('Städtereise: drei verschiedene Städte', () => {
    const e = [b({ stadt: 'Hamburg' }), b({ stadt: 'München', markt: 'Marienplatz' }), b({ stadt: 'Köln', markt: 'Dom' })];
    expect(erreicht(e).has('staedtereise')).toBe(true);
    expect(erreicht(e.slice(0, 2)).has('staedtereise')).toBe(false);
  });
  it('Marktforscher zählt nur echte Märkte, „Sonstiger" nicht', () => {
    const e = [b({ markt: 'Rathausmarkt' }), b({ markt: 'Winterwald' }), b({ markt: 'Santa Pauli' }), b({ markt: 'Sonstiger' }), b({ markt: 'Sonstiger' }), b({ stadt: 'München', markt: 'Marienplatz' }), b({ stadt: 'Köln', markt: 'Dom' })];
    expect(erreicht(e).has('marktforscher')).toBe(true);
    expect(erreicht(e.slice(0, 5)).has('marktforscher')).toBe(false);
  });
  it('Treue: drei verschiedene Abende', () => {
    expect(erreicht([b({ datum: '2026-11-19' }), b({ datum: '2026-11-20' }), b({ datum: '2026-11-21' })]).has('treue')).toBe(true);
    expect(erreicht([b({ datum: '2026-11-19' }), b({ datum: '2026-11-19' }), b({ datum: '2026-11-21' })]).has('treue')).toBe(false);
  });
  it('Nachtschwärmer: nach 22 Uhr oder vor 5 Uhr', () => {
    expect(erreicht([b({ erstelltAm: new Date(2026, 10, 21, 23, 15).getTime() })]).has('nachtschwaermer')).toBe(true);
    expect(erreicht([b({ erstelltAm: new Date(2026, 10, 22, 2, 0).getTime() })]).has('nachtschwaermer')).toBe(true);
    expect(erreicht([b({ erstelltAm: new Date(2026, 10, 21, 20, 0).getTime() })]).has('nachtschwaermer')).toBe(false);
  });
  it('Fotograf und Schreiberling', () => {
    const fotos = Array.from({ length: 5 }, () => b({ fotoBlob: {} }));
    expect(erreicht(fotos).has('fotograf')).toBe(true);
    expect(erreicht(fotos.slice(0, 4)).has('fotograf')).toBe(false);
    const notizen = Array.from({ length: 3 }, () => b({ notiz: 'lecker' }));
    expect(erreicht(notizen).has('schreiberling')).toBe(true);
    expect(erreicht([b({ notiz: '  ' })]).has('schreiberling')).toBe(false);
  });
  it('Gruppenführer: mein Besuch hat zwei weitere Bewertende', () => {
    const meins = b({ besuchId: 'abcd1234', geraet: 'ich' });
    const andere = [b({ besuchId: 'abcd1234', geraet: 'anna' }), b({ besuchId: 'abcd1234', geraet: 'ben' })];
    expect(erreicht([meins], [meins, ...andere]).has('gruppenfuehrer')).toBe(true);
    expect(erreicht([meins], [meins, andere[0]]).has('gruppenfuehrer')).toBe(false);
    expect(erreicht([meins], [meins, andere[0], b({ besuchId: 'abcd1234', geraet: 'anna' })]).has('gruppenfuehrer')).toBe(false);
  });
  it('Top-Deal-Jäger: ein bewerteter Stand ist ein Top Deal', () => {
    const deal = (p: Partial<Eintrag>) => b({ stand: 'Dealbude', noten: { ...leereNoten(), geschmack: 8, preisLeistung: 9 }, ...p });
    const meins = deal({ geraet: 'ich' });
    expect(erreicht([meins], [meins, deal({ geraet: 'anna' })]).has('top-deal-jaeger')).toBe(true);
    const ohne = b({ stand: 'Teuer', noten: { ...leereNoten(), geschmack: 8, preisLeistung: 3 } });
    expect(erreicht([ohne], [ohne]).has('top-deal-jaeger')).toBe(false);
  });
});

describe('Stufen', () => {
  it('Schwellen', () => {
    expect(stufeFuer(0).stufe.name).toBe('Neuling');
    expect(stufeFuer(1).stufe.name).toBe('Probierer');
    expect(stufeFuer(2).stufe.name).toBe('Probierer');
    expect(stufeFuer(3).stufe.name).toBe('Lehrling');
    expect(stufeFuer(10).stufe.name).toBe('Kenner');
    expect(stufeFuer(25).stufe.name).toBe('Glühwein-Meister');
    expect(stufeFuer(50).stufe.name).toBe('Legende');
    expect(stufeFuer(500).stufe.name).toBe('Legende');
  });
  it('Fortschritt zur nächsten Stufe', () => {
    const s = stufeFuer(6);
    expect(s.naechste?.name).toBe('Kenner');
    expect(s.fehlen).toBe(4);
    expect(s.anteil).toBeCloseTo(3 / 7, 5);
    expect(stufeFuer(80)).toMatchObject({ naechste: null, anteil: 1, fehlen: 0 });
  });
});

describe('Pass und neue Abzeichen', () => {
  it('Stempel je Stadt, meistbesuchte zuerst', () => {
    const e = [b({ stadt: 'München', markt: 'Marienplatz' }), b(), b(), b({ stadt: 'Köln', markt: 'Dom' })];
    expect(passStempel(e, LISTE)).toEqual([
      { stadt: 'Hamburg', anzahl: 2 },
      { stadt: 'Köln', anzahl: 1 },
      { stadt: 'München', anzahl: 1 },
    ]);
  });
  it('neu erreicht ist nur, was diese Bewertung ausgelöst hat', () => {
    const alt = [b(), b()];
    const neu = b({ stadt: 'München', markt: 'Marienplatz' });
    const alle = [...alt, neu];
    expect(neueAbzeichen(alle, alle, LISTE, neu.id).map((x) => x.id)).toEqual([]);
    const erste = b();
    expect(neueAbzeichen([erste], [erste], LISTE, erste.id).map((x) => x.id)).toEqual(['erster-schluck']);
  });
});
