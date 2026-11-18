import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { importiereCsv, parseCsv } from './csvImport';
import { DEFAULT_GEWICHTE } from './modell';
import { bewerte, rangliste, runde2 } from './scoring';

const csv = readFileSync(resolve(process.cwd(), 'data/gluehwein-2025.csv'), 'utf8');

describe('parseCsv', () => {
  it('versteht Anführungszeichen, Kommas im Feld und CRLF', () => {
    expect(parseCsv('a,b\r\n"x, y","sagt ""hi"""\r\n')).toEqual([
      ['a', 'b'],
      ['x, y', 'sagt "hi"'],
    ]);
  });
  it('ignoriert Leerzeilen', () => expect(parseCsv('a\n\n1\n')).toEqual([['a'], ['1']]));
});

describe('importiereCsv', () => {
  it('lehnt ungültige Noten ab', () => {
    expect(() => importiereCsv('stand,saison,geschmack\nX,2025,0')).toThrow(/ungültig/);
    expect(() => importiereCsv('stand,saison,geschmack\nX,2025,11')).toThrow(/ungültig/);
  });
  it('liest eine optionale Stadt-Spalte', () => {
    const [e] = importiereCsv('stand,markt,stadt,saison,geschmack\nKönig,Christkindlesmarkt,Nürnberg,2026,8');
    expect(e.stadt).toBe('Nürnberg');
    expect(importiereCsv(csv)[0].stadt).toBe('Salzburg');
    expect(importiereCsv(csv).find((e) => e.stand === 'Rathaus Schloss')?.stadt).toBeUndefined();
  });
  it('die Spalte id hält die ID stabil, auch wenn der Stand umbenannt wird', () => {
    const [e] = importiereCsv('id,stand,saison,geschmack\nimport-2025-001-salz-chrom,Chrom,2025,6');
    expect(e.id).toBe('import-2025-001-salz-chrom');
    expect(e.stand).toBe('Chrom');
  });
  it('leere Notenzelle wird null, nicht 0', () => {
    const [e] = importiereCsv('stand,saison,geschmack,becher\nX,2025,7,');
    expect(e.noten.becher).toBeNull();
    expect(e.noten.geschmack).toBe(7);
  });
});

describe('Bestandsdaten 2025', () => {
  const eintraege = importiereCsv(csv);

  it('liest 14 Einträge mit 98 Einzelnoten', () => {
    expect(eintraege).toHaveLength(14);
    const noten = eintraege.flatMap((e) => Object.values(e.noten));
    expect(noten.filter((x) => x !== null)).toHaveLength(98);
  });

  it('mappt preis_leistung und Märkte korrekt', () => {
    const ikea = eintraege.find((e) => e.stand === 'Ikea Altona')!;
    expect(ikea.markt).toBe('Ikea Altona');
    expect(ikea.saison).toBe(2025);
    expect(ikea.noten).toEqual({
      geschmack: 6,
      geruch: 7,
      temperatur: 9,
      personal: 5,
      atmosphaere: 6,
      preisLeistung: 6,
      becher: 3,
    });
    expect(eintraege.find((e) => e.stand === 'Gaensemarkt')!.markt).toBe('Gänsemarkt');
  });

  it('„Salz", „Trauen" und „Otten" waren nie Teil der Namen: Salzburg, Traunstein und Ottensen sind Orte', () => {
    expect(eintraege.some((e) => /^(salz|trauen|otten)\b/i.test(e.stand))).toBe(false);
    expect(eintraege.filter((e) => e.markt === 'Ottensen').map((e) => e.stand)).toEqual(['Schleenwurm', 'Tallinn']);
    expect(eintraege.filter((e) => e.stadt === 'Salzburg').map((e) => e.stand)).toEqual(['Chrom', 'Oma', 'Kameraden', 'Kroate', 'Pfadfinder', 'Stern']);
    expect(eintraege.find((e) => e.stand === 'Max')).toMatchObject({ stadt: 'Traunstein', markt: 'Sonstiger' });
  });
  it('die IDs sind seit dem ersten Import unverändert (der Server kennt sie, neue IDs würden alles doppeln)', () => {
    expect(eintraege.map((e) => e.id)).toEqual([
      'import-2025-001-salz-chrom', 'import-2025-002-rathaus-schloss', 'import-2025-003-ikea-altona', 'import-2025-004-otten-schleenwurm',
      'import-2025-005-winterwald', 'import-2025-006-salz-oma', 'import-2025-007-salz-kameraden', 'import-2025-008-salz-kroate',
      'import-2025-009-salz-pfadfinder', 'import-2025-010-santa-pauli', 'import-2025-011-otten-tallinn', 'import-2025-012-gaensemarkt',
      'import-2025-013-salz-stern', 'import-2025-014-trauen-max',
    ]);
  });
  it('IDs sind eindeutig und stabil', () => {
    expect(new Set(eintraege.map((e) => e.id)).size).toBe(14);
    expect(importiereCsv(csv).map((e) => e.id)).toEqual(eintraege.map((e) => e.id));
  });

  it('Rangliste: Chrom und Ikea Altona Platz 1 (6.33), Rathaus Schloss Platz 3 (6.25), Max letzter (3.67, Weggießen)', () => {
    const liste = rangliste(eintraege, (e) => bewerte(e.noten, DEFAULT_GEWICHTE).gesamt);
    const zeile = (p: (typeof liste)[number]) => {
      const w = bewerte(p.eintrag.noten, DEFAULT_GEWICHTE);
      return { rang: p.rang, stand: p.eintrag.stand, gesamt: runde2(w.gesamt!).toFixed(2), urteil: w.urteil };
    };
    const z = liste.map(zeile);

    expect(z.slice(0, 3)).toEqual([
      { rang: 1, stand: 'Chrom', gesamt: '6.33', urteil: 'Richtig gut' },
      { rang: 1, stand: 'Ikea Altona', gesamt: '6.33', urteil: 'Richtig gut' },
      { rang: 3, stand: 'Rathaus Schloss', gesamt: '6.25', urteil: 'Richtig gut' },
    ]);
    expect(z.at(-1)).toEqual({ rang: 14, stand: 'Max', gesamt: '3.67', urteil: 'Weggießen' });
  });
});
