import { describe, expect, it } from 'vitest';
import { istPruefstelle } from './community';
import { DEFAULT_GEWICHTE, leereNoten, type Eintrag } from './modell';
import { anzahlText, baueStaende, gruppenwert, kriterienMittel, schonBewertet, standId } from './staende';

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
  it('wenige Bewertungen schlagen nicht durch: eine 10 steht hinter vielen guten Bewertungen', () => {
    const viele = [9, 9, 9, 9, 9, 9, 9, 9].map((x) => b('Zuverlässig', x));
    const s = baueStaende([b('Einmal', 10), ...viele, b('Mittel', 5), b('Mittel', 5), b('Mittel', 5)], LISTE, DEFAULT_GEWICHTE);
    expect(s.map((x) => x.stand)).toEqual(['Zuverlässig', 'Einmal', 'Mittel']);
    expect(s[1].wert.gesamt).toBe(10); // angezeigt wird der echte Durchschnitt
    expect(s[1].vorlaeufig).toBe(true);
    expect(s[0].vorlaeufig).toBe(false);
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

describe('schonBewertet', () => {
  const mein = b('Chrom', 7, { geraet: 'ich' });
  it('derselbe Stand am selben Abend', () => {
    expect(schonBewertet([mein], 'ich', { stand: 'CHROM', markt: 'Rathausmarkt', stadt: 'Hamburg', datum: '2026-12-05', erstelltAm: 1 })).toBe(true);
  });
  it('anderer Abend, anderes Gerät, anderer Stand', () => {
    const k = { stand: 'Chrom', markt: 'Rathausmarkt', stadt: 'Hamburg', datum: '2026-12-06', erstelltAm: 1 };
    expect(schonBewertet([mein], 'ich', k)).toBe(false);
    expect(schonBewertet([mein], 'du', { ...k, datum: '2026-12-05' })).toBe(false);
    expect(schonBewertet([mein], 'ich', { ...k, datum: '2026-12-05', stand: 'Gustl' })).toBe(false);
    expect(schonBewertet([mein], null, { ...k, datum: '2026-12-05' })).toBe(false);
  });
});
