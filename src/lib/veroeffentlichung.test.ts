import { describe, expect, it } from 'vitest';
import { leereNoten, type Eintrag } from './modell';
import { eintragAlsJson, istEintrag } from './veroeffentlichung';

const basis: Eintrag = {
  id: 'abc',
  stand: 'Salz Chrom',
  markt: 'Sonstiger',
  saison: 2026,
  noten: { ...leereNoten(), geschmack: 7 },
  erstelltAm: 1,
};

describe('eintragAlsJson', () => {
  it('lässt lokale Felder weg und behält null-Noten', () => {
    const lokal = { ...basis, sync: 'offen', fotoBlob: 'x' } as unknown as Eintrag;
    const j = JSON.parse(eintragAlsJson(lokal));
    expect(j.sync).toBeUndefined();
    expect(j.fotoBlob).toBeUndefined();
    expect(j.noten.becher).toBeNull();
    expect(j.noten.geschmack).toBe(7);
  });
  it('Rundreise ergibt einen gültigen Eintrag', () => {
    expect(istEintrag(JSON.parse(eintragAlsJson({ ...basis, sorte: 'kirsch', becherNr: 2, preis: 4.5 })))).toBe(true);
  });
});

describe('istEintrag', () => {
  it('lehnt kaputte Daten ab', () => {
    expect(istEintrag(null)).toBe(false);
    expect(istEintrag({ ...basis, stand: '' })).toBe(false);
    expect(istEintrag({ ...basis, noten: { ...basis.noten, geruch: 0 } })).toBe(false);
    expect(istEintrag({ ...basis, sorte: 'glitzer' })).toBe(false);
  });
});
