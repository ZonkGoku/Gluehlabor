import { describe, expect, it } from 'vitest';
import { berechneRennen, rennenLink, type Rennen, type Teilnehmer } from './rennen';

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
  it('Zeit abgelaufen ohne Sieger: vorbei, vorn liegt, wer die meisten Schritte hat', () => {
    const s = berechneRennen(rennen, [a, b], [e('a', 10), e('b', 2000), e('b', 3000)], T0 + 15 * TAG);
    expect(s.vorbei).toBe(true);
    expect(s.sieger).toBeNull();
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
