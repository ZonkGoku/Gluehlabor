import { describe, expect, it } from 'vitest';
import { alsPunktliste, netzPunkt, reihenPunkte } from './netz';

const M = { x: 100, y: 100 };
describe('Netzdiagramm', () => {
  it('erste Achse oben, Wert 10 am Rand, Wert 0 in der Mitte', () => {
    const oben = netzPunkt(0, 4, 10, 80, M);
    expect(oben.x).toBeCloseTo(100);
    expect(oben.y).toBeCloseTo(20);
    const rechts = netzPunkt(1, 4, 10, 80, M);
    expect(rechts.x).toBeCloseTo(180);
    expect(rechts.y).toBeCloseTo(100);
    expect(netzPunkt(2, 4, 0, 80, M)).toEqual({ x: 100, y: 100 });
  });
  it('halber Wert liegt auf halbem Radius', () => {
    const p = netzPunkt(0, 4, 5, 80, M);
    expect(p.y).toBeCloseTo(60);
  });
  it('Werte außerhalb werden begrenzt', () => {
    expect(netzPunkt(0, 4, 99, 80, M).y).toBeCloseTo(20);
    expect(netzPunkt(0, 4, -3, 80, M).y).toBeCloseTo(100);
  });
  it('fehlende Werte haben keinen Punkt und zählen nicht als 0', () => {
    const p = reihenPunkte([8, null, 6, null], 80, M);
    expect(p.map((q) => q.index)).toEqual([0, 2]);
  });
  it('Punktliste', () => {
    expect(alsPunktliste([{ x: 1, y: 2 }, { x: 3.04, y: 4 }])).toBe('1.0,2.0 3.0,4.0');
  });
});
