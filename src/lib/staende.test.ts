import { describe, expect, it } from 'vitest';
import { istPruefstelle } from './community';
import { DEFAULT_GEWICHTE, leereNoten, type Eintrag } from './modell';
import { anzahlText, baueStaende, gruppenwert, kriterienMittel, personVon, standId } from './staende';

const LISTE = { sonstiger: 'Sonstiger', staedte: [{ stadt: 'Hamburg', maerkte: ['Rathausmarkt'] }] };
let n = 0;
const b = (stand: string, note: number, p: Partial<Eintrag> = {}): Eintrag => ({
  id: `id-${++n}-xxxxxxxx`,
  stand,
  markt: 'Rathausmarkt',
  stadt: 'Hamburg',
  saison: 2026,
  datum: '2026-12-05',
  noten: { ...leereNoten(), geschmack: note, geruch: note },
  erstelltAm: n,
  ...p,
});

describe('Stände', () => {
  it('gruppiert Schreibweisen zu einem Stand und mittelt', () => {
    const s = baueStaende([b('Chrom', 8), b(' chrom! ', 6), b('Gustl', 5)], LISTE, DEFAULT_GEWICHTE);
    expect(s).toHaveLength(2);
    const chrom = s.find((x) => x.id.startsWith('chrom'))!;
    expect(chrom.wert.anzahl).toBe(2);
    expect(chrom.wert.gesamt).toBe(7);
  });
  it('die Reihenfolge ist genau die angezeigte Zahl, wenige Bewertungen sind nur gekennzeichnet', () => {
    const viele = [9, 9, 9, 9, 9, 9, 9, 9].map((x) => b('Zuverlässig', x));
    const s = baueStaende([b('Einmal', 10), ...viele, b('Mittel', 5), b('Mittel', 5), b('Mittel', 5)], LISTE, DEFAULT_GEWICHTE);
    expect(s.map((x) => x.stand)).toEqual(['Einmal', 'Zuverlässig', 'Mittel']);
    expect(s.map((x) => x.wert.gesamt)).toEqual([10, 9, 5]);
    expect(s[0].vorlaeufig).toBe(true);
    expect(s[1].vorlaeufig).toBe(false);
  });
  it('höhere angezeigte Zahl steht nie unter einer niedrigeren', () => {
    const s = baueStaende([b('A', 8), b('B', 7), b('B', 7), b('B', 7), b('C', 7), b('C', 8)], LISTE, DEFAULT_GEWICHTE);
    const zahlen = s.map((x) => x.wert.gesamt!);
    expect(zahlen).toEqual([...zahlen].sort((x, y) => y - x));
  });
  it('bei gleicher Zahl steht der Stand mit mehr Bewertungen vorn, Plätze fortlaufend', () => {
    const s = baueStaende([b('Einer', 7), b('Drei', 7), b('Drei', 7), b('Drei', 7)], LISTE, DEFAULT_GEWICHTE);
    expect(s.map((x) => x.stand)).toEqual(['Drei', 'Einer']);
    expect(s.map((x) => x.rang)).toEqual([1, 2]);
  });
  it('Plätze 1, 1, 3 bei gleichem Wert', () => {
    const s = baueStaende([b('A', 8), b('B', 8), b('C', 4)], LISTE, DEFAULT_GEWICHTE);
    expect(s.map((x) => x.rang)).toEqual([1, 1, 3]);
  });
  it('Quelle: Prüfstelle gegen Community, beide Seiten immer sichtbar', () => {
    const e = [b('Chrom', 6, { pruefstelle: true }), b('Chrom', 8), b('Chrom', 10), b('Nur Comm', 7)];
    const alle = baueStaende(e, LISTE, DEFAULT_GEWICHTE, 'alle');
    expect(alle.find((x) => x.stand === 'Chrom')!.wert.anzahl).toBe(3);
    const p = baueStaende(e, LISTE, DEFAULT_GEWICHTE, 'pruefstelle');
    expect(p.map((x) => x.stand)).toEqual(['Chrom']);
    expect(p[0].wert.gesamt).toBe(6);
    const c = baueStaende(e, LISTE, DEFAULT_GEWICHTE, 'community');
    expect(c.find((x) => x.stand === 'Chrom')!.wert.gesamt).toBe(9);
    expect(c.find((x) => x.stand === 'Chrom')!.pruefstelle.gesamt).toBe(6);
    expect(istPruefstelle(e[0])).toBe(true);
  });
  it('Noten ohne Wert zählen nicht als 0', () => {
    const leer = b('X', 5, { noten: leereNoten() });
    expect(gruppenwert([leer, b('X', 8)], DEFAULT_GEWICHTE).gesamt).toBe(8);
  });
  it('leer', () => expect(baueStaende([], LISTE, DEFAULT_GEWICHTE)).toEqual([]));
  it('standId nutzt die Stadt der Marktliste', () => {
    const e = b('Chrom', 5, { stadt: undefined });
    expect(standId(e, LISTE)).toBe('chrom|hamburg');
  });
  it('derselbe Stand an anderem Markt derselben Stadt zählt zusammen', () => {
    const s = baueStaende([b('Superbude', 6, { markt: 'Rathausmarkt' }), b('Superbude', 4, { markt: 'Sonstiger' }), b('Superbude', 8, { markt: 'Rathausmarkt' })], LISTE, DEFAULT_GEWICHTE);
    expect(s).toHaveLength(1);
    expect(s[0].wert.anzahl).toBe(3);
    expect(s[0].markt).toBe('Rathausmarkt');
  });
  it('anzahlText', () => {
    expect(anzahlText(1)).toBe('1 Bewertung');
    expect(anzahlText(4)).toBe('4 Bewertungen');
  });
});

describe('kriterienMittel', () => {
  it('Mittel je Kriterium in Reihenfolge, fehlende Noten zählen nicht, nie bewertet = null', () => {
    const m = kriterienMittel([b('A', 8), b('A', 6)]);
    expect(m[0]).toBe(7); // Geschmack
    expect(m[1]).toBe(7); // Geruch
    expect(m[3]).toBeNull(); // Personal nie bewertet
    expect(kriterienMittel([])).toEqual([null, null, null, null, null, null, null]);
  });
});

describe('Preis und Deals', () => {
  const mitPl = (stand: string, pl: number | null, preis?: number, p: Partial<Eintrag> = {}) =>
    b(stand, 7, { noten: { ...leereNoten(), geschmack: 7, preisLeistung: pl }, ...(preis !== undefined ? { preis } : {}), ...p });
  it('Median-Preis je 0,2 l, Größe wird umgerechnet', () => {
    const s = baueStaende([mitPl('A', 7, 5), mitPl('A', 7, 6, { menge: 0.3 }), mitPl('A', 7, 6)], LISTE, DEFAULT_GEWICHTE);
    expect(s[0].preis).toEqual({ median: 5, n: 3 }); // 5, 4, 6 → Median 5
  });
  it('Top Deal ab Preis-Leistung 8, eigene Rangfolge', () => {
    const s = baueStaende([mitPl('Günstig', 9), mitPl('Günstig', 8), mitPl('Teuer', 3), mitPl('Teuer', 4), mitPl('Mittel', 7)], LISTE, DEFAULT_GEWICHTE);
    const von = (n: string) => s.find((x) => x.stand === n)!;
    expect(von('Günstig').deal).toMatchObject({ punkte: 8.5, anzahl: 2, top: true, rang: 1 });
    expect(von('Mittel').deal.top).toBe(false);
    expect(von('Teuer').deal.rang).toBe(3);
  });
  it('ohne Preis-Leistungs-Note: keine Deal-Wertung', () => {
    const s = baueStaende([mitPl('X', null)], LISTE, DEFAULT_GEWICHTE);
    expect(s[0].deal).toMatchObject({ punkte: null, anzahl: 0, rang: null, top: false });
    expect(s[0].preis).toEqual({ median: null, n: 0 });
  });
});

describe('Mehrere Becher derselben Person', () => {
  const von = (geraet: string, stand: string, note: number) => b(stand, note, { geraet });
  it('zählen im Durchschnitt zusammen wie einer: erst je Person, dann über die Personen', () => {
    // Anna bewertet 5 Mal mit 10, Ben einmal mit 4: nicht (50+4)/6 = 9, sondern (10+4)/2 = 7
    const g = gruppenwert([...Array.from({ length: 5 }, () => von('anna', 'Chrom', 10)), von('ben', 'Chrom', 4)], DEFAULT_GEWICHTE);
    expect(g.gesamt).toBe(7);
    expect(g.anzahl).toBe(6);
    expect(g.personen).toBe(2);
  });
  it('mehrere Becher derselben Person mitteln sich zuerst', () => {
    expect(gruppenwert([von('anna', 'Chrom', 10), von('anna', 'Chrom', 6)], DEFAULT_GEWICHTE).gesamt).toBe(8);
  });
  it('„wenige Bewertungen“ und der Gleichstand richten sich nach den Personen, nicht nach den Bechern', () => {
    const viele = Array.from({ length: 6 }, () => von('anna', 'Allein', 8));
    const drei = ['a', 'b', 'c'].map((g) => von(g, 'Drei', 8));
    const s = baueStaende([...viele, ...drei], LISTE, DEFAULT_GEWICHTE);
    expect(s.map((x) => x.stand)).toEqual(['Drei', 'Allein']); // gleiche Note, mehr Personen vorn
    expect(s.find((x) => x.stand === 'Allein')!.vorlaeufig).toBe(true);
    expect(s.find((x) => x.stand === 'Drei')!.vorlaeufig).toBe(false);
  });
  it('Bestandsdaten (import-…) und Einträge ohne Kennung zählen einzeln', () => {
    const a = b('X', 8, { id: 'import-2025-1-x', geraet: 'bestand' });
    const c = b('X', 4, { id: 'import-2025-2-x', geraet: 'bestand' });
    expect(personVon(a)).not.toBe(personVon(c));
    expect(gruppenwert([a, c], DEFAULT_GEWICHTE)).toMatchObject({ gesamt: 6, personen: 2 });
    expect(gruppenwert([b('Y', 8), b('Y', 4)], DEFAULT_GEWICHTE).personen).toBe(2);
  });
  it('die Kriterien-Mittel folgen derselben Regel', () => {
    const k = kriterienMittel([von('anna', 'Chrom', 10), von('anna', 'Chrom', 10), von('anna', 'Chrom', 10), von('ben', 'Chrom', 4)]);
    expect(k[0]).toBe(7); // geschmack: Anna 10, Ben 4
  });
  it('Preis-Leistung: viele Becher derselben Person zählen einmal', () => {
    const pl = (g: string, w: number) => b('Deal', 8, { geraet: g, noten: { ...leereNoten(), geschmack: 8, preisLeistung: w } });
    const [st] = baueStaende([pl('anna', 10), pl('anna', 10), pl('anna', 10), pl('ben', 4)], LISTE, DEFAULT_GEWICHTE);
    expect(st.deal.punkte).toBe(7);
    expect(st.deal.anzahl).toBe(2);
  });
});

