import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { importiereCsv } from './csvImport';
import { KARTE_BREITE, KARTE_HOEHE, kartenPunkte, koordinatenVon, projiziere, umrissPfad, umrisse, UMRISS_OESTERREICH, type Koordinaten } from './karte';
import staedteKarte from '../../data/staedte.json';
import { DEFAULT_GEWICHTE, leereNoten, type Eintrag } from './modell';
import type { MarktListe } from './orte';
import { abend, gesamtZahlen, kennzahlen, neuesteBecher, saisonStatus, saisonVerlauf, standardSaison } from './startseite';

const bestand = importiereCsv(readFileSync(resolve(process.cwd(), 'data/gluehwein-2025.csv'), 'utf8'));
const orte: Koordinaten = JSON.parse(readFileSync(resolve(process.cwd(), 'data/staedte.json'), 'utf8'));

const mk = (id: string, saison: number, datum: string | undefined, g: number, extra: Partial<Eintrag> = {}): Eintrag => ({
  id,
  stand: id,
  markt: 'Ottensen',
  saison,
  datum,
  noten: { ...leereNoten(), geschmack: g },
  erstelltAm: Date.parse(`${datum ?? '2025-12-01'}T20:00:00Z`) + Number(id.replace(/\D/g, '') || 0),
  ...extra,
});

describe('standardSaison', () => {
  it('laufendes Jahr, sobald es dort Becher gibt', () => {
    expect(standardSaison([...bestand, mk('a1', 2026, '2026-11-20', 7)], 2026)).toBe(2026);
  });
  it('sonst die letzte Saison mit Bechern', () => {
    expect(standardSaison(bestand, 2026)).toBe(2025);
  });
  it('ohne Becher das laufende Jahr', () => {
    expect(standardSaison([], 2026)).toBe(2026);
  });
  it('ignoriert Saisons in der Zukunft', () => {
    expect(standardSaison([mk('a1', 2027, '2027-12-01', 5), ...bestand], 2026)).toBe(2025);
  });
});

describe('saisonStatus', () => {
  it('Tag 1 ist der erste Becher der Saison', () => {
    const e = [mk('a1', 2026, '2026-11-20', 6), mk('a2', 2026, '2026-11-23', 6)];
    expect(saisonStatus(e, 2026, '2026-11-20').tag).toBe(1);
    expect(saisonStatus(e, 2026, '2026-11-23').tag).toBe(4);
  });
  it('vergangene Saison hat keinen laufenden Tag', () => {
    expect(saisonStatus(bestand, 2025, '2026-11-18')).toMatchObject({ tag: null, becher: 14, laufend: false });
  });
  it('Saison ohne datierten Becher: kein Tag', () => {
    expect(saisonStatus([mk('a1', 2026, undefined, 6)], 2026, '2026-11-20').tag).toBeNull();
  });
});

describe('abend', () => {
  const heute = '2026-11-24';
  const e = [
    mk('a1', 2026, heute, 6, { becherNr: 1 }),
    mk('a2', 2026, heute, 9, { becherNr: 2, stand: 'Bester' }),
    mk('a3', 2026, heute, 3, { becherNr: 3, markt: 'Rathausmarkt' }),
    mk('a4', 2026, '2026-11-23', 10, { becherNr: 5 }),
  ];
  it('zählt, mittelt und findet den besten Becher nur dieses Abends', () => {
    const a = abend(e, heute, DEFAULT_GEWICHTE);
    expect(a.anzahl).toBe(3);
    expect(a.mittel).toBeCloseTo(6, 10);
    expect(a.bester?.stand).toBe('Bester');
    expect(a.markt).toBe('Ottensen');
    expect(a.naechsteNr).toBe(4);
  });
  it('leerer Abend', () => {
    expect(abend(e, '2026-12-01', DEFAULT_GEWICHTE)).toMatchObject({ anzahl: 0, mittel: null, bester: null, markt: null, naechsteNr: 1 });
  });
});

describe('saisonVerlauf', () => {
  const e = [mk('a1', 2026, '2026-11-20', 6), mk('a2', 2026, '2026-11-20', 8), mk('a3', 2026, '2026-11-23', 5)];
  it('füllt Tage ohne Becher mit 0', () => {
    const v = saisonVerlauf(e, 2026, DEFAULT_GEWICHTE, '2026-11-23');
    expect(v.tage.map((t) => [t.datum, t.anzahl])).toEqual([
      ['2026-11-20', 2],
      ['2026-11-21', 0],
      ['2026-11-22', 0],
      ['2026-11-23', 1],
    ]);
    expect(v.tage[0].mittel).toBe(7);
    expect(v.tage[1].mittel).toBeNull();
  });
  it('läuft die Saison, reicht der Verlauf bis heute', () => {
    expect(saisonVerlauf(e, 2026, DEFAULT_GEWICHTE, '2026-11-25').tage.at(-1)).toMatchObject({ datum: '2026-11-25', anzahl: 0 });
  });
  it('vergangene Saison endet am letzten Becher', () => {
    expect(saisonVerlauf(e, 2026, DEFAULT_GEWICHTE, '2027-03-01').tage.at(-1)?.datum).toBe('2026-11-23');
  });
  it('Monatswechsel und Sommerzeit stören nicht', () => {
    const x = [mk('a1', 2026, '2026-10-29', 6), mk('a2', 2026, '2026-11-02', 6)];
    expect(saisonVerlauf(x, 2026, DEFAULT_GEWICHTE, '2026-11-02').tage.map((t) => t.datum)).toEqual([
      '2026-10-29', '2026-10-30', '2026-10-31', '2026-11-01', '2026-11-02',
    ]);
  });
  it('Becher ohne Datum (altes Sheet) werden gezählt, aber nicht eingezeichnet', () => {
    const v = saisonVerlauf(bestand, 2025, DEFAULT_GEWICHTE, '2026-11-18');
    expect(v.tage).toEqual([]);
    expect(v.ohneDatum).toBe(14);
  });
});

describe('kennzahlen', () => {
  const liste: MarktListe = JSON.parse(readFileSync(resolve(process.cwd(), 'data/maerkte.json'), 'utf8'));
  it('Bestand 2025: 14 Becher, 7 Märkte, 3 Städte (Hamburg, Salzburg, Traunstein)', () => {
    const k = kennzahlen(bestand, liste, DEFAULT_GEWICHTE);
    expect(k).toMatchObject({ becher: 14, maerkte: 7, staedte: 3 });
    expect(k.mittel).toBeCloseTo(5.255952381, 8);
  });
  it('freie Städte zählen mit', () => {
    const k = kennzahlen([...bestand, mk('x1', 2026, '2026-11-20', 7, { markt: 'Christkindlesmarkt', stadt: 'Nürnberg' })], liste, DEFAULT_GEWICHTE);
    expect(k.staedte).toBe(4);
  });
  it('leer', () => expect(kennzahlen([], liste, DEFAULT_GEWICHTE)).toEqual({ becher: 0, maerkte: 0, staedte: 0, mittel: null }));
});

describe('neuesteBecher', () => {
  it('neueste zuerst, höchstens n', () => {
    const e = [mk('a1', 2026, '2026-11-20', 6), mk('a2', 2026, '2026-11-22', 6), mk('a3', 2026, '2026-11-21', 6)];
    expect(neuesteBecher(e, 2).map((x) => x.id)).toEqual(['a2', 'a3']);
  });
});

describe('Karte', () => {
  it('Städte liegen auf der Karte, Nord über Süd und West links von Ost', () => {
    const hh = projiziere(53.55, 9.99);
    const m = projiziere(48.14, 11.58);
    expect(hh[1]).toBeLessThan(m[1]);
    const aachen = projiziere(50.78, 6.08);
    const dresden = projiziere(51.05, 13.74);
    expect(aachen[0]).toBeLessThan(dresden[0]);
    for (const [x, y] of [hh, m, aachen, dresden]) {
      expect(x).toBeGreaterThan(0);
      expect(x).toBeLessThan(KARTE_BREITE);
      expect(y).toBeGreaterThan(0);
      expect(y).toBeLessThan(KARTE_HOEHE);
    }
  });
  it('Umriss ist ein geschlossener Pfad', () => {
    const p = umrissPfad();
    expect(p.startsWith('M')).toBe(true);
    expect(p.endsWith('Z')).toBe(true);
  });
  it('Koordinaten ohne Rücksicht auf Groß/Klein, unbekannte Stadt null', () => {
    expect(koordinatenVon(orte, 'hamburg')).toEqual([53.55, 9.99]);
    expect(koordinatenVon(orte, 'Entenhausen')).toBeNull();
    expect(koordinatenVon(orte, '_hinweis')).toBeNull();
  });
  it('Punkte: Radius wächst mit der Zahl der Becher, unbekannte Orte getrennt', () => {
    const { punkte, ohneOrt } = kartenPunkte(
      [
        { stadt: 'Hamburg', becher: 12 },
        { stadt: 'Nürnberg', becher: 3 },
        { stadt: 'Entenhausen', becher: 2 },
        { stadt: null, becher: 7 },
      ],
      orte,
    );
    expect(punkte.map((p) => p.stadt)).toEqual(['Hamburg', 'Nürnberg']);
    expect(punkte[0].r).toBeGreaterThan(punkte[1].r);
    expect(ohneOrt.map((o) => o.becher)).toEqual([2, 7]);
  });
  it('alle Städte der Daten haben Koordinaten', () => {
    const maerkte = JSON.parse(readFileSync(resolve(process.cwd(), 'data/maerkte.json'), 'utf8'));
    for (const s of maerkte.staedte) expect(koordinatenVon(orte, s.stadt), s.stadt).not.toBeNull();
  });
});

describe('Karte: Deutschland und Österreich', () => {
  const innen = (poly: [number, number][], lat: number, lon: number) => {
    let drin = false;
    for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
      const [yi, xi] = poly[i];
      const [yj, xj] = poly[j];
      if (yi > lat !== yj > lat && lon < ((xj - xi) * (lat - yi)) / (yj - yi) + xi) drin = !drin;
    }
    return drin;
  };
  it('zwei Länder, beide als geschlossener Pfad', () => {
    const u = umrisse();
    expect(u.map((x) => x.land)).toEqual(['Deutschland', 'Österreich']);
    for (const x of u) expect(x.pfad).toMatch(/^M[\d. -]+(L[\d. -]+)+ Z$/);
  });
  it('Salzburg und Wien liegen in Österreich, München und Traunstein nicht', () => {
    expect(innen(UMRISS_OESTERREICH, 47.81, 13.05)).toBe(true); // Salzburg
    expect(innen(UMRISS_OESTERREICH, 48.21, 16.37)).toBe(true); // Wien
    expect(innen(UMRISS_OESTERREICH, 47.07, 15.44)).toBe(true); // Graz
    expect(innen(UMRISS_OESTERREICH, 47.27, 11.4)).toBe(true); // Innsbruck
    expect(innen(UMRISS_OESTERREICH, 48.14, 11.58)).toBe(false); // München
    expect(innen(UMRISS_OESTERREICH, 47.87, 12.64)).toBe(false); // Traunstein
  });
  it('alle Städte der Karte liegen im sichtbaren Ausschnitt', () => {
    for (const [name, k] of Object.entries(staedteKarte)) {
      if (name.startsWith('_')) continue;
      const [x, y] = projiziere((k as number[])[0], (k as number[])[1]);
      expect(x, name).toBeGreaterThan(0);
      expect(x, name).toBeLessThan(KARTE_BREITE);
      expect(y, name).toBeGreaterThan(0);
      expect(y, name).toBeLessThan(KARTE_HOEHE);
    }
  });
});

describe('gesamtZahlen', () => {
  const liste: MarktListe = JSON.parse(readFileSync(resolve(process.cwd(), 'data/maerkte.json'), 'utf8'));
  it('leer', () => expect(gesamtZahlen([], liste)).toEqual({ staende: 0, maerkte: 0, staedte: 0, bewertungen: 0 }));
  it('zählt Stände je Stadt, echte Märkte und Städte; Sonstiger ist kein Markt', () => {
    const e = [
      mk('g1', 2026, '2026-11-20', 7, { stand: 'Glüh & Co', markt: 'Christkindlesmarkt', stadt: 'Nürnberg' }),
      mk('g2', 2026, '2026-11-21', 6, { stand: 'GLÜH Co.', markt: 'Christkindlesmarkt', stadt: 'Nürnberg' }), // gleicher Stand
      mk('g3', 2026, '2026-11-21', 6, { stand: 'Glüh & Co', markt: 'Sonstiger', stadt: 'Fürth' }), // anderer Stand (andere Stadt), kein Markt
      mk('g4', 2026, '2026-11-22', 5, { stand: 'Punsch', markt: 'Sonstiger', stadt: 'Fürth' }),
    ];
    expect(gesamtZahlen(e, liste)).toEqual({ staende: 3, maerkte: 1, staedte: 2, bewertungen: 4 });
  });
});
