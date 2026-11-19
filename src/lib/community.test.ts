import { describe, expect, it } from 'vitest';
import { abendVon, anzeigeName, GRENZEN, istOrtsname, standIdent, pruefeEinreichung, pruefeName, saeubere } from './community';
import { leereNoten } from './modell';

const JETZT = Date.parse('2026-12-05T20:00:00Z');
const gut = () => ({
  id: 'abc12345-uuid',
  stand: 'Glühweinkönig',
  markt: 'Christkindlesmarkt',
  stadt: 'Nürnberg',
  saison: 2026,
  datum: '2026-12-05',
  sorte: 'rot',
  becherNr: 2,
  preis: 4.5,
  noten: { ...leereNoten(), geschmack: 8, geruch: 7 },
  erstelltAm: JETZT - 1000,
});

describe('saeubere', () => {
  it('glättet Leerraum und entfernt Steuerzeichen und unsichtbare Umschalter', () => {
    expect(saeubere('  Anna \u0000 ‮ Lisa\t\n ')).toBe('Anna Lisa');
  });
  it('normalisiert Unicode', () => {
    expect(saeubere('Glühwein')).toBe('Glühwein');
  });
});

describe('pruefeName', () => {
  it.each([
    ['Anna', 'Anna'],
    ['  Anna   K.  ', 'Anna K.'],
    ["O'Brien", "O'Brien"],
    ['Müller_1', 'Müller_1'],
    ['Zoë', 'Zoë'],
  ])('erlaubt %s', (roh, name) => expect(pruefeName(roh)).toEqual({ ok: true, name }));

  it.each([null, undefined, '', '   '])('leer (%s) heißt kein Name', (roh) =>
    expect(pruefeName(roh)).toEqual({ ok: true, name: null }));

  it('mindestens zwei Zeichen', () => {
    expect(pruefeName('A').ok).toBe(false);
    expect(pruefeName('Al').ok).toBe(true);
  });
  it('zu lang', () => {
    expect(pruefeName('x'.repeat(GRENZEN.name + 1)).ok).toBe(false);
    expect(pruefeName('x'.repeat(GRENZEN.name)).ok).toBe(true);
  });
  it.each(['http://x.de', 'www.spam.de', 'a@b.de', 'Anna<script>', '#1', '/slash', '😀'])('lehnt %s ab', (roh) =>
    expect(pruefeName(roh).ok).toBe(false));

  it('Nicht-Text', () => expect(pruefeName(42).ok).toBe(false));

  it('reservierte Namen nur für die Prüfstelle, auch in anderer Schreibweise', () => {
    for (const n of ['David', 'PHILIP', ' prüfstelle ', 'Admin']) {
      expect(pruefeName(n).ok).toBe(false);
      expect(pruefeName(n, true).ok).toBe(true);
    }
    expect(pruefeName('David M.').ok).toBe(true);
  });
});

describe('pruefeEinreichung', () => {
  it('nimmt einen guten Eintrag an und bereinigt ihn', () => {
    const r = pruefeEinreichung({ ...gut(), stand: '  Glühweinkönig  ', notiz: 'sehr\u0000 gut' }, JETZT);
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.eintrag.stand).toBe('Glühweinkönig');
      expect(r.eintrag.notiz).toBe('sehr gut');
      expect(r.eintrag.noten.geschmack).toBe(8);
      expect(r.eintrag.noten.becher).toBeNull();
    }
  });

  it('übernimmt nur Felder des Modells; Name, Kennung und Siegel kommen nie vom Client', () => {
    const r = pruefeEinreichung({ ...gut(), name: 'Admin', pruefstelle: true, geraet: 'x', foo: 1 }, JETZT);
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.eintrag).not.toHaveProperty('name');
      expect(r.eintrag).not.toHaveProperty('pruefstelle');
      expect(r.eintrag).not.toHaveProperty('geraet');
      expect(r.eintrag).not.toHaveProperty('foo');
    }
  });

  const schlecht: [string, Record<string, unknown>][] = [
    ['ID zu kurz', { id: 'abc' }],
    ['ID mit Sonderzeichen', { id: 'abc/../12345' }],
    ['Stand fehlt', { stand: '' }],
    ['Stand zu lang', { stand: 'x'.repeat(GRENZEN.stand + 1) }],
    ['Link im Stand', { stand: 'Besucht www.spam.de' }],
    ['Link in der Notiz', { notiz: 'siehe https://x.de' }],
    ['Markt fehlt', { markt: undefined }],
    ['Saison vor 2025', { saison: 2024 }],
    ['Saison zu weit in der Zukunft', { saison: 2028 }],
    ['Datum kaputt', { datum: '2026-13-45' }],
    ['Datum in der Zukunft', { datum: '2026-12-20' }],
    ['Sorte unbekannt', { sorte: 'glitzer' }],
    ['Becher-Nr. 8', { becherNr: 8 }],
    ['Preis negativ', { preis: -1 }],
    ['Preis absurd', { preis: 999 }],
    ['Zeitpunkt Zukunft', { erstelltAm: JETZT + 3 * 86_400_000 }],
    ['Zeitpunkt uralt', { erstelltAm: JETZT - 200 * 86_400_000 }],
    ['Note 0', { noten: { ...leereNoten(), geschmack: 0 } }],
    ['Note 11', { noten: { ...leereNoten(), geschmack: 11 } }],
    ['Note als Text', { noten: { ...leereNoten(), geschmack: '8' } }],
    ['keine einzige Note', { noten: leereNoten() }],
    ['Noten fehlen', { noten: undefined }],
    ['Besuchs-Nr. kaputt', { besuchId: 'a b' }],
  ];
  it.each(schlecht)('lehnt ab: %s', (_n, patch) => {
    expect(pruefeEinreichung({ ...gut(), ...patch }, JETZT).ok).toBe(false);
  });

  it.each([null, 5, 'x', [], undefined])('lehnt Nicht-Objekt %s ab', (x) => {
    expect(pruefeEinreichung(x, JETZT).ok).toBe(false);
  });

  it('Spät-Sync: Becher von vor einer Woche sind erlaubt (Funkloch)', () => {
    expect(pruefeEinreichung({ ...gut(), erstelltAm: JETZT - 7 * 86_400_000, datum: '2026-11-28' }, JETZT).ok).toBe(true);
  });
  it('fehlende Noten bleiben null, nie 0', () => {
    const r = pruefeEinreichung(gut(), JETZT);
    expect(r.ok && r.eintrag.noten.temperatur).toBeNull();
  });
  it('Preis wird auf Cent gerundet', () => {
    const r = pruefeEinreichung({ ...gut(), preis: 4.499999 }, JETZT);
    expect(r.ok && r.eintrag.preis).toBe(4.5);
  });
});

describe('anzeigeName', () => {
  it('ohne Namen: Anonym', () => {
    expect(anzeigeName({})).toBe('Anonym');
    expect(anzeigeName({ name: '   ' })).toBe('Anonym');
    expect(anzeigeName({ name: 'Anna' })).toBe('Anna');
  });
});

describe('istPruefstelle', () => {
  it('Server-Siegel und lokale Bestandsdaten zählen als Prüfstelle', async () => {
    const { istPruefstelle } = await import('./community');
    expect(istPruefstelle({ pruefstelle: true })).toBe(true);
    expect(istPruefstelle({ sync: 'bestand' })).toBe(true);
  });
  it('alles andere ist Community', async () => {
    const { istPruefstelle } = await import('./community');
    expect(istPruefstelle({})).toBe(false);
    expect(istPruefstelle({ pruefstelle: false, sync: 'fertig' })).toBe(false);
  });
});

describe('Ortsname', () => {
  it.each(['Hamburg', 'Frankfurt (Oder)', 'St. Pölten', 'Garmisch-Partenkirchen', 'Rothenburg ob der Tauber', "L'Aquila"])('erlaubt %s', (s) => expect(istOrtsname(s)).toBe(true));
  it.each(['Hamburg Bewerte mit mir: Superbude', 'https://x.de', 'Berlin 2', '3Stern', '', '😀', 'a'.repeat(61)])('lehnt %s ab', (s) => expect(istOrtsname(s)).toBe(false));
  it('Einreichung mit Satz als Stadt wird abgelehnt', () => {
    const e = { id: 'abcdefgh-1234', stand: 'A', markt: 'M', stadt: 'Hamburg Bewerte mit mir: Superbude', saison: 2026, noten: { ...leereNoten(), geschmack: 5 }, erstelltAm: JETZT - 5000 };
    expect(pruefeEinreichung(e, JETZT)).toEqual({ ok: false, grund: 'Ungültige Stadt.' });
  });
});

describe('Stand und Abend', () => {
  it('derselbe Stand trotz Schreibweise', () => {
    expect(standIdent({ stand: 'Salz-Chrom', stadt: 'Salzburg' })).toBe(standIdent({ stand: ' salz  chrom! ', stadt: 'SALZBURG' }));
    // der Markt zählt nicht, die Stadt schon
    expect(standIdent({ stand: 'Chrom', stadt: 'X' })).toBe(standIdent({ stand: 'Chrom', stadt: 'x' }));
    expect(standIdent({ stand: 'Chrom', stadt: 'X' })).not.toBe(standIdent({ stand: 'Chrom', stadt: 'Y' }));
  });
  it('Abend: Datum, sonst Tag der Erfassung', () => {
    expect(abendVon({ datum: '2026-12-05', erstelltAm: 0 })).toBe('2026-12-05');
    expect(abendVon({ erstelltAm: Date.parse('2026-12-06T01:00:00Z') })).toBe('2026-12-06');
  });
});
