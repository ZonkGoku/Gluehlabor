import { describe, expect, it } from 'vitest';
import { pruefeName } from './community';
import { haeufigsteSorte, ordneStaende, standPreisVorschlag } from './eingabehilfen';
import { ALLE_ZUFALLSNAMEN_TEILE, zufallsname } from './zufallsname';

describe('zufallsname', () => {
  it('jede Kombination ist ein gültiger Name mit höchstens 24 Zeichen', () => {
    for (const a of ALLE_ZUFALLSNAMEN_TEILE.ADJEKTIVE)
      for (const t of ALLE_ZUFALLSNAMEN_TEILE.TIERE)
        for (const n of [10, 99]) {
          const name = `${a} ${t} ${n}`;
          expect(name.length, name).toBeLessThanOrEqual(24);
          expect(pruefeName(name).ok, name).toBe(true);
        }
  });
  it('liefert je nach Zufall verschiedene Namen', () => {
    expect(zufallsname(() => 0)).toBe('Zimtiger Fuchs 10');
    expect(zufallsname(() => 0.99)).toBe('Mutiger Otter 99');
  });
});

describe('standPreisVorschlag', () => {
  const e = [
    { stand: 'Hütte', stadt: 'Hamburg', preis: 5, menge: 0.2 },
    { stand: 'HÜTTE!', stadt: 'Hamburg', preis: 6, menge: 0.2 },
    { stand: 'Hütte', stadt: 'Hamburg', preis: 9, menge: 0.3 },
    { stand: 'Hütte', stadt: 'Köln', preis: 3 },
  ];
  it('Median derselben Größe am selben Stand in derselben Stadt', () => expect(standPreisVorschlag(e, 'hütte', 'Hamburg', undefined)).toBe(5.5));
  it('andere Größe getrennt', () => expect(standPreisVorschlag(e, 'Hütte', 'Hamburg', 0.3)).toBe(9));
  it('ohne Meldung: null', () => expect(standPreisVorschlag(e, 'Neu', 'Hamburg', 0.2)).toBeNull());
});

describe('haeufigsteSorte', () => {
  it('nimmt die häufigste Sorte des Stands', () => {
    const e = [
      { stand: 'A', stadt: 'X', sorte: 'rot' as const },
      { stand: 'A', stadt: 'X', sorte: 'weiss' as const },
      { stand: 'A', stadt: 'X', sorte: 'weiss' as const },
      { stand: 'B', stadt: 'X', sorte: 'rot' as const },
    ];
    expect(haeufigsteSorte(e, 'a', 'X')).toBe('weiss');
    expect(haeufigsteSorte(e, 'C', 'X')).toBeUndefined();
  });
});

describe('ordneStaende', () => {
  const liste = [
    { stand: 'Alt', markt: 'M', stadt: 'X', anzahl: 9 },
    { stand: 'Neu', markt: 'M', stadt: 'X', anzahl: 1 },
    { stand: 'Heute', markt: 'M', stadt: 'X', anzahl: 2 },
  ];
  const eintr = [
    { stand: 'Alt', stadt: 'X', erstelltAm: 100, geraet: 'a', datum: '2026-11-01' },
    { stand: 'Neu', stadt: 'X', erstelltAm: 500, geraet: 'b', datum: '2026-11-20' },
    { stand: 'Heute', stadt: 'X', erstelltAm: 300, geraet: 'ich', datum: '2026-11-28' },
  ];
  it('heute von mir bewertet zuerst, dann zuletzt bewertet', () => {
    const r = ordneStaende(liste, eintr, 'ich', '2026-11-28');
    expect(r.map((s) => s.stand)).toEqual(['Heute', 'Neu', 'Alt']);
    expect(r[0].heute).toBe(true);
    expect(r[1].heute).toBe(false);
  });
});
