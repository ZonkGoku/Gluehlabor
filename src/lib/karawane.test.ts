import { describe, expect, it } from 'vitest';
import { berechneKarawane, kamelVon, KAMELE, ZIEL } from './karawane';

const e = (id: string, geraet = 'g1', datum = '2026-11-25', saison = 2026, sync = 'fertig') => ({ id, saison, geraet, datum, erstelltAm: Date.parse(datum + 'T20:00:00'), sync });
const JETZT = new Date(2026, 10, 25, 21);
/** Geräte, die sicher auf unterschiedlichen Kamelen landen */
const geraetFuer = (k: number) => Array.from({ length: 200 }, (_, i) => 'dev' + i).find((g) => kamelVon(g) === k)!;

describe('Kamelrennen', () => {
  it('Zuordnung ist stabil und verteilt auf alle drei Kamele', () => {
    expect(kamelVon('abc')).toBe(kamelVon('abc'));
    const k = new Set(Array.from({ length: 60 }, (_, i) => kamelVon('geraet-' + i)));
    expect(k.size).toBe(KAMELE.length);
  });
  it('zählt nur echte Bewertungen der Saison, keine Bestandsdaten', () => {
    const s = berechneKarawane([e('a'), e('import-2025-1-x'), e('b', 'g1', '2025-12-01', 2025), e('c', 'g1', '2026-11-25', 2026, 'bestand')], 'g1', JETZT);
    expect(s.gesamt).toBe(1);
  });
  it('Schritte gehen an das Kamel des Geräts, Plätze nach Schritten', () => {
    const a = geraetFuer(0), b = geraetFuer(1);
    const s = berechneKarawane([e('1', a), e('2', a), e('3', a), e('4', b)], a, JETZT);
    expect(s.bahnen[0]).toMatchObject({ kamel: 'Kaspar', schritte: 3, platz: 1 });
    expect(s.bahnen[1]).toMatchObject({ schritte: 1, platz: 2 });
    expect(s.bahnen[2]).toMatchObject({ schritte: 0, platz: 3 });
    expect(s.meinKamel).toBe('Kaspar');
    expect(s.meine).toBe(3);
  });
  it('Gleichstand teilt den Platz (1, 1, 3)', () => {
    const a = geraetFuer(0), b = geraetFuer(1);
    const s = berechneKarawane([e('1', a), e('2', b)], null, JETZT);
    expect(s.bahnen.map((x) => x.platz)).toEqual([1, 1, 3]);
  });
  it('Ankunft in Bethlehem, Anteil bleibt bei 1', () => {
    const a = geraetFuer(2);
    const s = berechneKarawane(Array.from({ length: ZIEL + 5 }, (_, i) => e('x' + i, a)), null, JETZT);
    expect(s.angekommen).toBe(true);
    expect(s.bahnen[2]).toMatchObject({ anteil: 1, angekommen: true });
    expect(s.fehlt).toBe(0);
  });
  it('ohne Bewertungen und ohne Kennung', () => {
    const s = berechneKarawane([], null, JETZT);
    expect(s).toMatchObject({ gesamt: 0, meinKamel: null, meine: 0, heute: 0, angekommen: false, fehlt: ZIEL });
  });
  it('heutige Schritte, Tage bis Heiligabend nie negativ', () => {
    expect(berechneKarawane([e('a', 'g1', '2026-11-25'), e('b', 'g2', '2026-11-24')], 'g1', JETZT).heute).toBe(1);
    expect(berechneKarawane([], null, new Date(2026, 10, 24)).tage).toBe(30);
    expect(berechneKarawane([], null, new Date(2027, 0, 5)).tage).toBe(0);
  });
});
