import { describe, expect, it } from 'vitest';
import { DEFAULT_GEWICHTE, KRITERIEN, type Noten } from './modell';
import { bewerte, gewichteterSchnitt, rangliste, runde2, urteil } from './scoring';

/** Noten in der Reihenfolge geschmack, geruch, temperatur, personal, atmosphaere, preisLeistung, becher. */
function n(...werte: (number | null)[]): Noten {
  return Object.fromEntries(KRITERIEN.map((k, i) => [k, werte[i]])) as Noten;
}

const zwei = (x: number | null) => (x === null ? null : runde2(x).toFixed(2));

describe('bewerte – Pflichtfälle aus dem Auftrag', () => {
  const faelle: [Noten, string, string | null, string | null][] = [
    [n(6, 6, 8, 7, 5, 5, 8), '6.33', '6.57', '6.00'],
    [n(6, 7, 9, 5, 6, 6, 3), '6.33', '7.14', '5.20'],
    [n(6, 5, 8, 4, 8, 6, 7), '6.25', '6.29', '6.20'],
    [n(4, 4, 2, 5, 4, 3, 5), '3.67', '3.43', '4.00'],
    [n(10, 10, 10, 10, 10, 10, 10), '10.00', null, null],
    [n(1, 1, 1, 1, 1, 1, 1), '1.00', null, null],
  ];

  for (const [noten, gesamt, gluehwein, drumherum] of faelle) {
    it(`${Object.values(noten).join(',')} -> ${gesamt}`, () => {
      const w = bewerte(noten, DEFAULT_GEWICHTE);
      expect(zwei(w.gesamt)).toBe(gesamt);
      if (gluehwein) expect(zwei(w.gluehwein)).toBe(gluehwein);
      if (drumherum) expect(zwei(w.drumherum)).toBe(drumherum);
    });
  }
});

describe('fehlende Noten', () => {
  it('Lückentest: 6,6,8,7,5,5,null ergibt 6.18, nicht 5.67', () => {
    const g = bewerte(n(6, 6, 8, 7, 5, 5, null), DEFAULT_GEWICHTE).gesamt;
    expect(zwei(g)).toBe('6.18');
    expect(zwei(g)).not.toBe('5.67');
  });

  it('null fällt auch aus der Teilnote, statt sie zu drücken', () => {
    const w = bewerte(n(6, 6, 8, 7, 5, 5, null), DEFAULT_GEWICHTE);
    expect(zwei(w.gluehwein)).toBe('6.57');
    expect(zwei(w.drumherum)).toBe('5.50'); // (7·1 + 5·1 + 5·2) / 4 = 22/4
  });

  it('nur null ergibt null statt 0 oder NaN', () => {
    const w = bewerte(n(null, null, null, null, null, null, null), DEFAULT_GEWICHTE);
    expect(w).toEqual({ gesamt: null, gluehwein: null, drumherum: null, urteil: null });
  });

  it('Teilnote ohne Noten ist null, Gesamt trotzdem berechnet', () => {
    const w = bewerte(n(8, 8, 8, null, null, null, null), DEFAULT_GEWICHTE);
    expect(w.gesamt).toBe(8);
    expect(w.drumherum).toBeNull();
  });

  it('ein Kriterium allein ergibt genau seine Note', () => {
    expect(bewerte(n(null, null, null, null, null, null, 3), DEFAULT_GEWICHTE).gesamt).toBe(3);
  });
});

describe('Gewichte', () => {
  it('Gleichgewichtung ergibt das arithmetische Mittel', () => {
    const eins = Object.fromEntries(KRITERIEN.map((k) => [k, 1])) as typeof DEFAULT_GEWICHTE;
    expect(bewerte(n(1, 2, 3, 4, 5, 6, 7), eins).gesamt).toBe(4);
  });

  it('Gewicht 0 nimmt ein Kriterium heraus', () => {
    const ohneBecher = { ...DEFAULT_GEWICHTE, becher: 0 };
    expect(zwei(bewerte(n(6, 6, 8, 7, 5, 5, 1), ohneBecher).gesamt)).toBe('6.18');
  });

  it('alle Gewichte 0 ergibt null', () => {
    const null0 = Object.fromEntries(KRITERIEN.map((k) => [k, 0])) as typeof DEFAULT_GEWICHTE;
    expect(bewerte(n(5, 5, 5, 5, 5, 5, 5), null0).gesamt).toBeNull();
  });

  it('Default-Gewichte entsprechen dem Auftrag', () => {
    expect(DEFAULT_GEWICHTE).toEqual({
      geschmack: 3,
      geruch: 2,
      temperatur: 2,
      preisLeistung: 2,
      personal: 1,
      atmosphaere: 1,
      becher: 1,
    });
  });
});

describe('Eingabeprüfung', () => {
  it.each([0, 11, 5.5, -1, NaN, '5', undefined])('lehnt Note %s ab', (bad) => {
    const noten = { ...n(5, 5, 5, 5, 5, 5, 5), geschmack: bad as never };
    expect(() => gewichteterSchnitt(noten, DEFAULT_GEWICHTE)).toThrow(RangeError);
  });

  it('lehnt negative Gewichte ab', () => {
    expect(() => bewerte(n(5, 5, 5, 5, 5, 5, 5), { ...DEFAULT_GEWICHTE, geruch: -1 })).toThrow(RangeError);
  });
});

describe('urteil', () => {
  it.each([
    [10, 'Nachschenken'],
    [8, 'Nachschenken'],
    [7.99, 'Richtig gut'],
    [7.996, 'Nachschenken'], // angezeigt als 8.00
    [6, 'Richtig gut'],
    [5.99, 'Geht klar'],
    [5, 'Geht klar'],
    [4, 'Einmal reicht'],
    [3.99, 'Weggießen'],
    [1, 'Weggießen'],
  ] as const)('%s -> %s', (g, u) => {
    expect(urteil(g)).toBe(u);
  });

  it('null -> null', () => expect(urteil(null)).toBeNull());

  it('Trauen Max (3.67) ist Weggießen', () => {
    expect(bewerte(n(4, 4, 2, 5, 4, 3, 5), DEFAULT_GEWICHTE).urteil).toBe('Weggießen');
  });
});

describe('rangliste', () => {
  const r = (werte: (number | null)[]) => rangliste(werte, (x) => x).map((p) => [p.rang, p.eintrag]);

  it('Rangtest: 6.33, 6.33, 6.25 ergibt 1, 1, 3', () => {
    const a = bewerte(n(6, 6, 8, 7, 5, 5, 8), DEFAULT_GEWICHTE).gesamt;
    const b = bewerte(n(6, 7, 9, 5, 6, 6, 3), DEFAULT_GEWICHTE).gesamt;
    const c = bewerte(n(6, 5, 8, 4, 8, 6, 7), DEFAULT_GEWICHTE).gesamt;
    expect(rangliste([c, a, b], (x) => x).map((p) => p.rang)).toEqual([1, 1, 3]);
  });

  it('sortiert absteigend', () => {
    expect(r([3, 9, 5])).toEqual([
      [1, 9],
      [2, 5],
      [3, 3],
    ]);
  });

  it('Gleichstand mitten in der Liste: 1, 2, 2, 4', () => {
    expect(r([9, 7, 7, 5]).map(([rang]) => rang)).toEqual([1, 2, 2, 4]);
  });

  it('dreifacher Gleichstand: 1, 1, 1, 4', () => {
    expect(r([5, 5, 5, 4]).map(([rang]) => rang)).toEqual([1, 1, 1, 4]);
  });

  it('Gleichstand gilt auf zwei Stellen: 76/12 und 57/9 teilen sich den Platz', () => {
    expect(r([76 / 12, 57 / 9]).map(([rang]) => rang)).toEqual([1, 1]);
  });

  it('Werte, die sich erst in der dritten Stelle unterscheiden, aber verschieden runden, teilen nicht', () => {
    expect(r([6.335, 6.334]).map(([rang]) => rang)).toEqual([1, 2]);
  });

  it('Einträge ohne Wert ans Ende, ohne Rang', () => {
    expect(r([null, 4, 6])).toEqual([
      [1, 6],
      [2, 4],
      [null, null],
    ]);
  });

  it('leere Liste', () => expect(r([])).toEqual([]));
});
