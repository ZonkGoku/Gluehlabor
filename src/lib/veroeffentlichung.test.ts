import { describe, expect, it } from 'vitest';
import { leereNoten, type Eintrag } from './modell';
import { eintragFuerServer, istEintrag } from './veroeffentlichung';

const basis: Eintrag = {
  id: 'abc',
  stand: 'Salz Chrom',
  markt: 'Sonstiger',
  saison: 2026,
  noten: { ...leereNoten(), geschmack: 7 },
  erstelltAm: 1,
};

describe('eintragFuerServer', () => {
  it('schickt nur Felder des Modells, behält null-Noten', () => {
    const lokal = { ...basis, sync: 'offen', fotoBlob: 'x', name: 'Anna', geraet: 'g', pruefstelle: true } as unknown as Eintrag;
    const j = eintragFuerServer(lokal);
    for (const f of ['sync', 'fotoBlob', 'name', 'geraet', 'pruefstelle']) expect(j).not.toHaveProperty(f);
    expect((j.noten as Record<string, unknown>).becher).toBeNull();
    expect((j.noten as Record<string, unknown>).geschmack).toBe(7);
  });
  it('nimmt Stadt, Besuchs-Nr. und optionale Felder mit', () => {
    const j = eintragFuerServer({ ...basis, stadt: 'München', besuchId: 'abcd1234', sorte: 'kirsch', becherNr: 2, preis: 4.5, notiz: 'gut', datum: '2026-12-05' });
    expect(j).toMatchObject({ stadt: 'München', besuchId: 'abcd1234', sorte: 'kirsch', becherNr: 2, preis: 4.5, notiz: 'gut', datum: '2026-12-05' });
  });
  it('Rundreise ergibt einen gültigen Eintrag', () => {
    expect(istEintrag(eintragFuerServer({ ...basis, sorte: 'kirsch', becherNr: 2, preis: 4.5 }))).toBe(true);
  });
});

describe('istEintrag', () => {
  it('nimmt Antworten des Servers an, mit Name, Kennung und Siegel', () => {
    expect(istEintrag({ ...basis, name: 'Anna', geraet: 'g-1', pruefstelle: false, besuchId: 'abcd1234', seq: 5 })).toBe(true);
  });
  it('lehnt kaputte Daten ab', () => {
    expect(istEintrag(null)).toBe(false);
    expect(istEintrag({ ...basis, stand: '' })).toBe(false);
    expect(istEintrag({ ...basis, noten: { ...basis.noten, geruch: 0 } })).toBe(false);
    expect(istEintrag({ ...basis, sorte: 'glitzer' })).toBe(false);
    expect(istEintrag({ ...basis, name: 42 })).toBe(false);
    expect(istEintrag({ ...basis, pruefstelle: 'ja' })).toBe(false);
  });
});
