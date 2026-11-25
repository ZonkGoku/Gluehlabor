import { describe, expect, it } from 'vitest';
import { trefferFuerKorrektur, type Korrektur } from './korrekturen';

const K: Korrektur = {
  von: ['Elbschlossen', 'Elbschlösdchen', 'Rathaus Schloss'],
  stadt: 'Hamburg',
  nach: { stand: 'Elbschlösschen', markt: 'Rathausmarkt', stadt: 'Hamburg' },
};
const z = (id: string, stand: string, stadt = 'Hamburg', markt = 'Rathausmarkt') => ({ id, stand, markt, stadt });

describe('trefferFuerKorrektur', () => {
  it('findet alle Schreibweisen in der Stadt', () => {
    const liste = [z('1', 'Elbschlossen'), z('2', 'Elbschlösdchen'), z('3', 'Rathaus Schloss'), z('4', 'elbschlossen!')];
    expect(trefferFuerKorrektur(liste, K).map((e) => e.id)).toEqual(['1', '2', '3', '4']);
  });
  it('fasst andere Städte und andere Stände nicht an', () => {
    const liste = [z('1', 'Elbschlossen', 'München'), z('2', 'Winterwald'), z('3', 'Chrom', 'Salzburg')];
    expect(trefferFuerKorrektur(liste, K)).toEqual([]);
  });
  it('ist nach dem Zusammenführen erledigt', () => {
    expect(trefferFuerKorrektur([z('1', 'Elbschlösschen')], K)).toEqual([]);
  });
  it('korrigiert den Markt, wenn der Name schon stimmt', () => {
    expect(trefferFuerKorrektur([z('1', 'Elbschlösschen', 'Hamburg', 'Sonstiger')], K).map((e) => e.id)).toEqual(['1']);
  });
  it('Bewertungen ohne gespeicherte Stadt gehören zur Stadt der Korrektur', () => {
    expect(trefferFuerKorrektur([{ id: '1', stand: 'Rathaus Schloss', markt: 'Rathausmarkt' }], K).map((e) => e.id)).toEqual(['1']);
  });
});
