import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import type { AnkerDaten } from './anker';
import {
  filtere,
  marktCheckliste,
  ranglisteMitWertung,
  standSchluessel,
  urteilVerteilung,
  wiederholungen,
} from './auswertung';
import { importiereCsv } from './csvImport';
import { DEFAULT_GEWICHTE, KRITERIEN, leereNoten, type Eintrag, type Kriterium } from './modell';
import {
  befunde,
  diagnose,
  korrelation,
  korrelationZwischen,
  kriteriumStatistik,
  pegel,
  pegelSteigung,
  streuung,
  ueberblick,
} from './statistik';

const csv = readFileSync(resolve(process.cwd(), 'data/gluehwein-2025.csv'), 'utf8');
const maerkte: string[] = JSON.parse(readFileSync(resolve(process.cwd(), 'data/maerkte.json'), 'utf8'));
const anker: AnkerDaten = JSON.parse(readFileSync(resolve(process.cwd(), 'data/anker.json'), 'utf8'));
const labels = Object.fromEntries(KRITERIEN.map((k) => [k, anker[k].label])) as Record<Kriterium, string>;
const bestand = importiereCsv(csv);

const r2 = (x: number | null) => (x === null ? null : Math.round(x * 100) / 100);

describe('Statistik – Befunde aus Saison 2025 (Abnahme laut Auftrag)', () => {
  it('Geschmack nutzt nur die Stufen 3 bis 7', () => {
    const s = kriteriumStatistik(bestand, 'geschmack');
    expect([s.min, s.max]).toEqual([3, 7]);
    expect(s.stufen).toEqual([3, 4, 5, 6, 7]);
  });
  it('Die 10 ist in 98 Einzelnoten kein einziges Mal gefallen', () => {
    const u = ueberblick(bestand, DEFAULT_GEWICHTE);
    expect(u.einzelnoten).toBe(98);
    expect(u.zehner).toBe(0);
  });
  it('Preis/Leistung korreliert zu 0,71 mit Geschmack', () => {
    expect(r2(kriteriumStatistik(bestand, 'preisLeistung').korrGeschmack)).toBe(0.71);
  });
  it('Personal und Atmosphäre korrelieren zu −0,61', () => {
    expect(r2(korrelationZwischen(bestand, 'personal', 'atmosphaere'))).toBe(-0.61);
  });
  it('Werte wie im alten Sheet (Statistik-Tab)', () => {
    const g = kriteriumStatistik(bestand, 'geschmack');
    expect(g.mittel).toBeCloseTo(5.142857143, 8);
    expect(g.streuung).toBeCloseTo(1.186660552, 8);
    expect(kriteriumStatistik(bestand, 'geruch').korrGeschmack).toBeCloseTo(0.5308517144, 8);
    expect(kriteriumStatistik(bestand, 'becher').spanne).toBe(7);
    const u = ueberblick(bestand, DEFAULT_GEWICHTE);
    expect(u.einsOderZwei).toBe(6);
    expect(u.mittelGesamt).toBeCloseTo(5.255952381, 8);
    expect(u.spanneGesamt).toBeCloseTo(2.666666667, 8);
  });
});

describe('diagnose – wie im Sheet', () => {
  it('Geschmack, Geruch, Personal: Skala zu eng; P/L zusätzlich doppelt', () => {
    const d = Object.fromEntries(KRITERIEN.map((k) => [k, diagnose(kriteriumStatistik(bestand, k))]));
    expect(d.geschmack).toEqual(['Skala zu eng']);
    expect(d.geruch).toEqual(['Skala zu eng']);
    expect(d.personal).toEqual(['Skala zu eng']);
    expect(d.preisLeistung).toEqual(['Skala zu eng', 'doppelt sich mit Geschmack']);
    expect(d.temperatur).toEqual([]);
    expect(d.becher).toEqual([]);
  });
});

describe('befunde – Klartext', () => {
  const b = befunde(bestand, DEFAULT_GEWICHTE, labels);
  const texte = b.map((x) => x.text);
  it('nennt die zu enge Skala beim Geschmack als Satz', () => {
    expect(texte).toContain('Beim Geschmack habt ihr nur 3 bis 7 vergeben. Die Skala hat zehn Stufen.');
  });
  it('nennt die fehlende 10', () => {
    expect(texte.some((t) => t.startsWith('Die 10 ist in 98 Einzelnoten kein einziges Mal gefallen'))).toBe(true);
  });
  it('nennt Preis/Leistung als Doppelung des Geschmacks', () => {
    expect(texte.some((t) => t.startsWith('Preis/Leistung läuft zu 0,71 mit dem Geschmack mit'))).toBe(true);
  });
  it('nennt den Gegenlauf Personal/Atmosphäre', () => {
    expect(texte.some((t) => t.includes('Personal und Atmosphäre laufen gegeneinander (−0,61)'))).toBe(true);
  });
  it('ohne Becher-Nr. keine Pegel-Aussage', () => {
    expect(texte.some((t) => t.includes('Becher-Nr.'))).toBe(true);
  });
});

describe('Rechenbausteine', () => {
  it('Korrelation', () => {
    expect(korrelation([1, 2, 3], [2, 4, 6])).toBeCloseTo(1, 12);
    expect(korrelation([1, 2, 3], [3, 2, 1])).toBeCloseTo(-1, 12);
    expect(korrelation([1, 1, 1], [1, 2, 3])).toBeNull();
    expect(korrelation([1, 2], [1, 2])).toBeNull();
  });
  it('Streuung ist STDEVP', () => expect(streuung([2, 4, 4, 4, 5, 5, 7, 9])).toBe(2));
  it('fehlende Noten fallen aus der Statistik heraus', () => {
    const e = { ...bestand[0], noten: { ...bestand[0].noten, becher: null } };
    expect(kriteriumStatistik([e], 'becher').n).toBe(0);
  });
});

const mk = (stand: string, saison: number, g: number, extra: Partial<Eintrag> = {}): Eintrag => ({
  id: `${stand}-${saison}-${g}-${Math.random()}`,
  stand,
  markt: 'Ottensen',
  saison,
  noten: { ...leereNoten(), geschmack: g },
  erstelltAm: saison,
  ...extra,
});

describe('Pegel', () => {
  it('erkennt steigende Noten mit der Becher-Nr.', () => {
    const e = [1, 2, 3, 4, 5].map((nr) => mk('X', 2026, nr + 3, { becherNr: nr }));
    expect(pegelSteigung(e, DEFAULT_GEWICHTE)!.steigung).toBeCloseTo(1, 10);
    expect(befunde([...e], DEFAULT_GEWICHTE, labels).some((b) => b.text.includes('Pegel, nicht den Wein'))).toBe(true);
    expect(pegel(e, DEFAULT_GEWICHTE).map((p) => p.anzahl)).toEqual([1, 1, 1, 1, 1]);
  });
  it('5 und mehr werden zusammengefasst', () => {
    const e = [5, 6, 7].map((nr) => mk('X', 2026, 6, { becherNr: nr }));
    expect(pegel(e, DEFAULT_GEWICHTE)[4]).toEqual({ becherNr: 5, anzahl: 3, mittel: 6 });
  });
});

describe('Rangliste mit Filter', () => {
  it('Saison 2025: Plätze wie im Sheet', () => {
    const z = ranglisteMitWertung(filtere(bestand, { saison: 2025, markt: 'alle' }), DEFAULT_GEWICHTE);
    expect(z.map((x) => x.rang)).toEqual([1, 1, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14]);
    expect(z[3].eintrag.stand).toBe('Otten Schleenwurm');
  });
  it('Marktfilter rankt neu', () => {
    const z = ranglisteMitWertung(filtere(bestand, { saison: 'alle', markt: 'Ottensen' }), DEFAULT_GEWICHTE);
    expect(z.map((x) => [x.rang, x.eintrag.stand])).toEqual([
      [1, 'Otten Schleenwurm'],
      [2, 'Otten Tallinn'],
    ]);
  });
  it('leere Saison ergibt leere Liste', () => {
    expect(ranglisteMitWertung(filtere(bestand, { saison: 2026, markt: 'alle' }), DEFAULT_GEWICHTE)).toEqual([]);
  });
  it('Urteilsverteilung 2025', () => {
    const v = urteilVerteilung(ranglisteMitWertung(bestand, DEFAULT_GEWICHTE));
    expect(v).toEqual({ Nachschenken: 0, 'Richtig gut': 5, 'Geht klar': 3, 'Einmal reicht': 5, Weggießen: 1 });
  });
  it('Gewichte ändern das Ergebnis sofort', () => {
    const nurBecher = { ...DEFAULT_GEWICHTE, geschmack: 0, geruch: 0, temperatur: 0, personal: 0, atmosphaere: 0, preisLeistung: 0 };
    expect(ranglisteMitWertung(bestand, nurBecher)[0].eintrag.stand).toBe('Salz Chrom');
    expect(ranglisteMitWertung(bestand, nurBecher)[0].wertung.gesamt).toBe(8);
  });
});

describe('Vergleich über die Jahre', () => {
  it('Stand-Schlüssel ignoriert Emoji, Groß/Klein und Leerraum', () => {
    expect(standSchluessel('Ikea Altona 💛💙')).toBe(standSchluessel('ikea  altona'));
  });
  it('nur eine Saison: alle einmalig', () => {
    const w = wiederholungen(bestand, DEFAULT_GEWICHTE);
    expect(w).toHaveLength(14);
    expect(new Set(w.map((x) => x.entwicklung))).toEqual(new Set(['einmalig']));
  });
  it('Differenz und Richtung', () => {
    const e = [mk('Winterwald', 2025, 6), mk('Winterwald', 2026, 8), mk('Neu', 2026, 5), mk('Alt', 2025, 5), mk('Stabil', 2025, 5), mk('Stabil', 2026, 5)];
    const w = wiederholungen(e, DEFAULT_GEWICHTE);
    const nach = Object.fromEntries(w.map((x) => [x.stand, x]));
    expect(nach.Winterwald).toMatchObject({ differenz: 2, entwicklung: 'besser', jeSaison: { 2025: 6, 2026: 8 } });
    expect(nach.Stabil.entwicklung).toBe('unveraendert');
    expect(nach.Neu.entwicklung).toBe('neu');
    expect(nach.Alt.entwicklung).toBe('einmalig');
    expect(w[0].stand).toBe('Stabil'); // mehrfach bewertete zuerst, dann alphabetisch
  });
  it('mehrere Becher in einer Saison werden gemittelt', () => {
    const w = wiederholungen([mk('X', 2025, 4), mk('X', 2025, 6), mk('X', 2026, 7)], DEFAULT_GEWICHTE);
    expect(w[0].jeSaison[2025]).toBe(5);
    expect(w[0].differenz).toBe(2);
  });
});

describe('Markt-Checkliste', () => {
  it('wie im Sheet: Ottensen kaum erkundet, Fleetinsel noch nie, Sonstiger abgedeckt', () => {
    const c = Object.fromEntries(marktCheckliste(bestand, maerkte).map((m) => [m.markt, m]));
    expect(c.Ottensen).toMatchObject({ becher: 2, abdeckung: 'kaum erkundet' });
    expect(c.Fleetinsel).toMatchObject({ becher: 0, abdeckung: 'noch nie da' });
    expect(c.Sonstiger).toMatchObject({ becher: 7, abdeckung: 'abgedeckt' });
    expect(Object.values(c).filter((m) => m.abdeckung === 'noch nie da')).toHaveLength(9);
  });
});
