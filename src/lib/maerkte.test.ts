// Prüft die gepflegte Marktliste (data/maerkte.json): Namen eindeutig, jede Stadt auf der Karte.
import { describe, expect, it } from 'vitest';
import maerkteJson from '../../data/maerkte.json';
import staedteJson from '../../data/staedte.json';
import { alleMaerkte, stadtZuMarkt, type MarktListe } from './orte';

const LISTE = maerkteJson as MarktListe;

describe('Marktliste', () => {
  it('Marktnamen sind über alle Städte eindeutig (sonst ist die Stadt nicht ableitbar)', () => {
    const alle = alleMaerkte(LISTE);
    expect(new Set(alle.map((m) => m.toLowerCase())).size).toBe(alle.length);
  });
  it('jede Stadt hat Koordinaten für die Deutschlandkarte', () => {
    for (const s of LISTE.staedte) expect(Object.keys(staedteJson), s.stadt).toContain(s.stadt);
  });
  it('jede Stadt hat mindestens einen Markt, kein Name ist leer oder hat Randleerzeichen', () => {
    for (const s of LISTE.staedte) {
      expect(s.maerkte.length, s.stadt).toBeGreaterThan(0);
      for (const m of s.maerkte) expect(m).toBe(m.trim());
    }
  });
  it('Hamburg, München und Nürnberg stehen vorn', () => {
    expect(LISTE.staedte.slice(0, 3).map((s) => s.stadt)).toEqual(['Hamburg', 'München', 'Nürnberg']);
  });
  it('Märkte lassen sich ihrer Stadt zuordnen', () => {
    expect(stadtZuMarkt(LISTE, 'Christkindlesmarkt')).toBe('Nürnberg');
    expect(stadtZuMarkt(LISTE, 'Rathausmarkt')).toBe('Hamburg');
    expect(stadtZuMarkt(LISTE, 'Striezelmarkt')).toBe('Dresden');
  });
});
