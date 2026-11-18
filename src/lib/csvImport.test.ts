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

  it('IDs sind eindeutig und stabil', () => {
    expect(new Set(eintraege.map((e) => e.id)).size).toBe(14);
    expect(importiereCsv(csv).map((e) => e.id)).toEqual(eintraege.map((e) => e.id));
  });

  it('Rangliste: Salz Chrom und Ikea Altona Platz 1 (6.33), Rathaus Schloss Platz 3 (6.25), Trauen Max letzter (3.67, Weggießen)', () => {
    const liste = rangliste(eintraege, (e) => bewerte(e.noten, DEFAULT_GEWICHTE).gesamt);
    const zeile = (p: (typeof liste)[number]) => {
      const w = bewerte(p.eintrag.noten, DEFAULT_GEWICHTE);
      return { rang: p.rang, stand: p.eintrag.stand, gesamt: runde2(w.gesamt!).toFixed(2), urteil: w.urteil };
    };
    const z = liste.map(zeile);

    expect(z.slice(0, 3)).toEqual([
      { rang: 1, stand: 'Salz Chrom', gesamt: '6.33', urteil: 'Richtig gut' },
      { rang: 1, stand: 'Ikea Altona', gesamt: '6.33', urteil: 'Richtig gut' },
      { rang: 3, stand: 'Rathaus Schloss', gesamt: '6.25', urteil: 'Richtig gut' },
    ]);
    expect(z.at(-1)).toEqual({ rang: 14, stand: 'Trauen Max', gesamt: '3.67', urteil: 'Weggießen' });
  });
});
