import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { importiereCsv } from './csvImport';
import { alleMaerkte, ortTeile, ortText, staedte, stadtVon, stadtZuMarkt, zerlegeFreienMarkt, type MarktListe } from './orte';

// Die Abnahme von 2025 gilt für die Hamburger Liste; weitere Städte prüft maerkte.test.ts.
const voll: MarktListe = JSON.parse(readFileSync(resolve(process.cwd(), 'data/maerkte.json'), 'utf8'));
const liste: MarktListe = { ...voll, staedte: voll.staedte.filter((s) => s.stadt === 'Hamburg') };
const bestand = importiereCsv(readFileSync(resolve(process.cwd(), 'data/gluehwein-2025.csv'), 'utf8'));

describe('Marktliste', () => {
  it('enthält die 16 Einträge aus dem Auftrag in Reihenfolge', () => {
    expect(alleMaerkte(liste)).toEqual([
      'Rathausmarkt', 'Ottensen', 'Santa Pauli', 'Gänsemarkt', 'Fleetinsel', 'Jungfernstieg', 'Winterwald',
      'Spitalerstraße', 'HafenCity', 'St. Georg', 'Eppendorf', 'Osterstraße', 'Blankenese', 'Bergedorf',
      'Ikea Altona', 'Sonstiger',
    ]);
  });
  it('kennt die Stadt gepflegter Märkte', () => {
    expect(stadtZuMarkt(liste, 'Ottensen')).toBe('Hamburg');
    expect(stadtZuMarkt(liste, 'Sonstiger')).toBeNull();
  });
});

describe('stadtVon', () => {
  it('ausdrückliche Stadt gewinnt', () => {
    expect(stadtVon(liste, { markt: 'Christkindlesmarkt', stadt: 'Nürnberg' })).toBe('Nürnberg');
  });
  it('sonst aus der Liste, sonst unbekannt', () => {
    expect(stadtVon(liste, { markt: 'Rathausmarkt' })).toBe('Hamburg');
    expect(stadtVon(liste, { markt: 'Sonstiger' })).toBeNull();
  });
});

describe('zerlegeFreienMarkt', () => {
  it.each([
    ['Christkindlesmarkt, Nürnberg', { markt: 'Christkindlesmarkt', stadt: 'Nürnberg' }],
    ['Marienplatz,München', { markt: 'Marienplatz', stadt: 'München' }],
    ['Dorfplatz', { markt: 'Dorfplatz' }],
    ['Markt, Platz, Regensburg', { markt: 'Markt, Platz', stadt: 'Regensburg' }],
    ['Dorfplatz, ', { markt: 'Dorfplatz' }],
    [', Augsburg', { markt: 'Augsburg' }],
  ])('%s', (ein, aus) => expect(zerlegeFreienMarkt(ein)).toEqual(aus));
});

describe('staedte', () => {
  it('Bestand 2025: 7 Becher in Hamburg, 6 in Salzburg, 1 in Traunstein', () => {
    expect(staedte(liste, bestand)).toEqual([
      { stadt: 'Hamburg', becher: 7, maerkte: 6 },
      { stadt: 'Salzburg', becher: 6, maerkte: 1 },
      { stadt: 'Traunstein', becher: 1, maerkte: 1 },
    ]);
  });
  it('mehrere Städte, meistbesuchte zuerst', () => {
    const s = staedte(liste, [
      { markt: 'A', stadt: 'München' },
      { markt: 'B', stadt: 'München' },
      { markt: 'Rathausmarkt' },
    ]);
    expect(s.map((x) => x.stadt)).toEqual(['München', 'Hamburg']);
  });
});

describe('ortText', () => {
  it('„Sonstiger" erscheint nicht als Ort, die Stadt schon', () => {
    expect(ortText(liste, { markt: 'Sonstiger', stadt: 'Salzburg' })).toBe('Salzburg');
    expect(ortTeile(liste, { markt: 'Sonstiger', stadt: 'Salzburg' })).toEqual(['Salzburg']);
  });
  it('gepflegter Markt mit abgeleiteter Stadt', () => {
    expect(ortText(liste, { markt: 'Rathausmarkt' })).toBe('Rathausmarkt · Hamburg');
  });
  it('freier Markt mit Stadt', () => {
    expect(ortText(liste, { markt: 'Dorfmarkt', stadt: 'Traunstein' })).toBe('Dorfmarkt · Traunstein');
  });
  it('ohne jede Angabe', () => {
    expect(ortText(liste, { markt: 'Sonstiger' })).toBe('Ort unbekannt');
  });
});
