import { describe, expect, it } from 'vitest';
import { berechneRennen, lage, rennenLink, sichtbareBahnen, type Rennen, type Teilnehmer } from './rennen';

const T0 = Date.parse('2026-12-01T18:00:00Z');
const TAG = 86_400_000;
const rennen: Rennen = { id: 'abcd2345', name: 'Test', ziel: 3, erstellt_am: T0, ende: T0 + 14 * TAG };
const a: Teilnehmer = { geraet: 'a', kamel: 'Anna', farbe: 0, seit: T0 };
const b: Teilnehmer = { geraet: 'b', kamel: 'Ben', farbe: 1, seit: T0 + 1000 };
let n = 0;
const e = (geraet: string, offset: number) => ({ id: 'e' + ++n, geraet, erstelltAm: T0 + offset });

describe('Rennen', () => {
  it('zählt nur Bewertungen nach dem Beitritt und vor dem Ende', () => {
    const s = berechneRennen(rennen, [b], [e('b', 0), e('b', 2000), e('b', 15 * TAG), e('a', 5000)], T0 + TAG);
    expect(s.bahnen[0].schritte).toBe(1);
  });
  it('Bestandsdaten (import-…) zählen nicht', () => {
    const s = berechneRennen(rennen, [a], [{ id: 'import-2025-1-x', geraet: 'a', erstelltAm: T0 + 10 }, e('a', 10)], T0 + TAG);
    expect(s.bahnen[0].schritte).toBe(1);
  });
  it('Bewertungen, die der Server abgelehnt hat (zum Beispiel derselbe Stand am selben Abend), zählen nicht', () => {
    const s = berechneRennen(rennen, [a], [e('a', 10), { ...e('a', 20), sync: 'abgelehnt' }, { ...e('a', 30), sync: 'fertig' }], T0 + TAG);
    expect(s.bahnen[0].schritte).toBe(2);
  });
  it('Plätze nach Schritten, Gleichstand teilt den Platz (1, 1, 3)', () => {
    const c: Teilnehmer = { geraet: 'c', kamel: 'Cem', farbe: 2, seit: T0 };
    const s = berechneRennen(rennen, [a, b, c], [e('a', 10), e('b', 2000), e('a', 20), e('b', 3000)], T0 + TAG);
    expect(s.bahnen.map((x) => [x.kamel, x.platz])).toEqual([['Anna', 1], ['Ben', 1], ['Cem', 3]]);
  });
  it('wer zuerst im Ziel ist, gewinnt, auch bei gleich vielen Schritten später', () => {
    const s = berechneRennen(rennen, [a, b], [e('b', 2000), e('b', 3000), e('b', 4000), e('a', 10), e('a', 20), e('a', 5000), e('a', 6000)], T0 + TAG);
    expect(s.sieger?.kamel).toBe('Ben');
    expect(s.vorbei).toBe(true);
    expect(s.bahnen.map((x) => x.platz)).toEqual([1, 2]);
    expect(s.bahnen[1].imZiel).toBe(true);
  });
  it('Schritte bleiben beim Ziel stehen', () => {
    const s = berechneRennen(rennen, [a], Array.from({ length: 8 }, (_, i) => e('a', 10 + i)), T0 + TAG);
    expect(s.bahnen[0]).toMatchObject({ schritte: 3, anteil: 1, imZiel: true });
  });
  it('Zeit abgelaufen ohne Ziel: vorbei, Sieger ist, wer die meisten Schritte hat', () => {
    const s = berechneRennen(rennen, [a, b], [e('a', 10), e('b', 2000), e('b', 3000)], T0 + 15 * TAG);
    expect(s.vorbei).toBe(true);
    expect(s.sieger?.kamel).toBe('Ben');
    expect(s.bahnen[0].kamel).toBe('Ben');
  });
  it('Resttage laufen runter', () => {
    expect(berechneRennen(rennen, [a], [], T0 + TAG).tageUebrig).toBe(13);
    expect(berechneRennen(rennen, [a], [], T0 + 13.5 * TAG).tageUebrig).toBe(1);
  });
  it('Link', () => {
    expect(rennenLink('https://gluehlabor.de/#/mehr', 'abcd2345')).toBe('https://gluehlabor.de/#/schlittenfahren/abcd2345');
  });
});

describe('Sieger bei Zeitablauf', () => {
  it('ohne Ziel gewinnt, wer am Ende die meisten Schritte hat; ohne Schritte gewinnt niemand', () => {
    const spaet = T0 + 15 * TAG;
    expect(berechneRennen(rennen, [a, b], [e('a', 10), e('b', 2000), e('b', 3000)], spaet).sieger?.kamel).toBe('Ben');
    expect(berechneRennen(rennen, [a, b], [], spaet).sieger).toBeNull();
  });
});

describe('Lage', () => {
  const c: Teilnehmer = { geraet: 'c', kamel: 'Cem', farbe: 2, seit: T0 };
  const lg = (eintr: ReturnType<typeof e>[], ich: string) => lage(berechneRennen(rennen, [a, b, c], eintr, T0 + TAG), rennen.ziel, ich);
  it('Start: noch keiner gefahren', () => expect(lg([], 'a')?.art).toBe('start'));
  it('vorn, mit Abstand zum Verfolger', () => {
    expect(lg([e('a', 10), e('a', 20), e('b', 2000)], 'a')).toMatchObject({ art: 'vorn', abstand: 1, gegner: 'Ben', fehlt: 1, platz: 1 });
  });
  it('gleichauf', () => expect(lg([e('a', 10), e('b', 2000)], 'a')).toMatchObject({ art: 'gleich', gegner: 'Ben' }));
  it('hinten, mit Abstand zum Führenden', () => {
    expect(lg([e('b', 2000), e('b', 3000), e('a', 10)], 'a')).toMatchObject({ art: 'hinten', abstand: 1, gegner: 'Ben', fehlt: 2, platz: 2 });
  });
  it('nicht dabei: null', () => expect(lg([e('a', 10)], 'x')).toBeNull());
  it('Ende', () => expect(lage(berechneRennen(rennen, [a], [], T0 + 15 * TAG), 3, 'a')?.art).toBe('ende'));
});

describe('sichtbare Bahnen', () => {
  const viele = Array.from({ length: 20 }, (_, i) => ({ geraet: 'g' + i, kamel: 'K' + i, farbe: 0, fahrzeug: 0, schritte: 20 - i, anteil: 0, platz: i + 1, imZiel: false, zielZeit: null }));
  it('wenige: alle', () => expect(sichtbareBahnen(viele.slice(0, 5), 'g0', 6)).toEqual({ sichtbar: viele.slice(0, 5), rest: 0 }));
  it('viele: Spitze plus du, wenn du nicht dabei bist', () => {
    const r = sichtbareBahnen(viele, 'g15', 6);
    expect(r.sichtbar.map((x) => x.geraet)).toEqual(['g0', 'g1', 'g2', 'g3', 'g4', 'g15']);
    expect(r.rest).toBe(14);
  });
  it('viele: bist du vorn, genau die ersten', () => expect(sichtbareBahnen(viele, 'g1', 6).sichtbar).toHaveLength(6));
});
