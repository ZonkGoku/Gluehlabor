// Die PHP-Regeln (php/api/lib/regeln.php) müssen dasselbe entscheiden wie src/lib/community.ts.
import { execFileSync } from 'node:child_process';
import { describe, expect, it } from 'vitest';
import { adressSchluessel } from '../../worker/src/app';
import { abendVon, pruefeEinreichung, pruefeName, pruefeText, standIdent } from '../../src/lib/community';
import { leereNoten } from '../../src/lib/modell';

const JETZT = Date.parse('2026-12-05T20:00:00Z');
const gut = (p: Record<string, unknown> = {}) => ({
  id: 'abcdefgh-1234', stand: 'Glühweinkönig', markt: 'Christkindlesmarkt', stadt: 'Nürnberg', saison: 2026, datum: '2026-12-05',
  noten: { ...leereNoten(), geschmack: 8, geruch: 7 }, erstelltAm: JETZT - 5000, ...p,
});

const NAMEN: [unknown, boolean][] = [
  ['Anna', false], ['  Anna   Maria ', false], ['A', false], ['Zo', false], ['', false], ['   ', false], [null, false], [undefined, false], [42, false],
  ['David', false], ['david', true], ['DAVID', false], ['Philip', false], ['Glühlabor', false], ['GLÜHLABOR', false], ['Prüfstelle', false],
  ['x'.repeat(24), false], ['x'.repeat(25), false], ['ä'.repeat(24), false], ['ä'.repeat(25), false], ['😀'.repeat(5), false],
  ['http://x.de', false], ['www.x.de', false], ['a@b', false], ['a:/b', false], ['Anna_B-C.D\'E', false], ['Anna!', false], ['_Anna', false],
  ['Ann\u0000a', false], ['An\u200bna', false], ['An\u00a0na', false], ['An\u2003na', false], ['Zoë', false], ['Zoe\u0308', false], ['Çağlar', false], ['張偉', false],
  ['\u202eAnna', false], ['Anna\n\tMaria', false], ['1234', false], ['-Anna', false],
];
const STAENDE: [string, string, string | null, string | null, number][] = [
  ['Salz-Chrom', 'Sonstiger', 'Salzburg', '2026-12-05', JETZT], ['salz chrom', 'SONSTIGER', 'salzburg', null, JETZT],
  ['Glühweinkönig 💛', 'Rathausmarkt', null, null, Date.parse('2026-12-05T23:30:00Z')], ['ÄÖÜ  ß!', 'X', 'Köln', '', 0], ['  ', 'M', 'S', null, JETZT],
];
const TEXTE: [unknown, number, boolean][] = [
  ['Hallo', 80, true], ['', 80, true], [null, 80, true], [undefined, 80, false], ['  ', 80, false], [5, 80, false], ['a'.repeat(81), 80, true],
  ['ä'.repeat(80), 80, true], ['ä'.repeat(81), 80, true], ['siehe www.x.de', 80, false], ['mail@x.de', 80, false], ['HTTPS://x', 80, false],
  ['Glüh\u0000wein  Stand', 80, true], ['Zeile1\nZeile2', 500, false], ['a\u200fb', 80, true], ['Hamburg: Rathaus', 80, true],
];
const EINREICHUNGEN: unknown[] = [
  gut(), gut({ id: 'kurz' }), gut({ id: 'a b c d e f' }), gut({ stand: '' }), gut({ stand: 'x'.repeat(81) }), gut({ markt: undefined }),
  gut({ stadt: 'a'.repeat(61) }), gut({ stadt: null }), gut({ notiz: 'n'.repeat(501) }), gut({ notiz: 'www.x.de' }),
  gut({ saison: 2024 }), gut({ saison: 2027 }), gut({ saison: 2028 }), gut({ saison: 2026.5 }), gut({ saison: 2026.0 }), gut({ saison: '2026' }),
  gut({ erstelltAm: JETZT - 121 * 86_400_000 }), gut({ erstelltAm: JETZT + 2 * 86_400_000 }), gut({ erstelltAm: 'x' }), gut({ erstelltAm: JETZT - 1000.6 }),
  gut({ datum: '2026-02-30' }), gut({ datum: '2026-13-01' }), gut({ datum: '5.12.2026' }), gut({ datum: '2026-12-08' }), gut({ datum: '2026-12-10' }), gut({ datum: null }), gut({ datum: 5 }),
  gut({ sorte: 'rot' }), gut({ sorte: 'bier' }), gut({ sorte: 5 }), gut({ becherNr: 0 }), gut({ becherNr: 7 }), gut({ becherNr: 8 }), gut({ becherNr: 2.5 }), gut({ becherNr: 3 }),
  gut({ preis: 4.5 }), gut({ preis: 4.555 }), gut({ preis: -1 }), gut({ preis: 50 }), gut({ preis: 50.01 }), gut({ preis: 'x' }), gut({ preis: 0 }),
  gut({ besuchId: 'abc' }), gut({ besuchId: 'abcd' }), gut({ besuchId: 'a'.repeat(33) }), gut({ besuchId: 'ab cd' }),
  gut({ noten: {} }), gut({ noten: null }), gut({ noten: 5 }), gut({ noten: { ...leereNoten() } }), gut({ noten: { ...leereNoten(), geschmack: 0 } }),
  gut({ noten: { ...leereNoten(), geschmack: 11 } }), gut({ noten: { ...leereNoten(), geschmack: 5.5 } }), gut({ noten: { ...leereNoten(), geschmack: '5' } }),
  gut({ noten: { ...leereNoten(), geschmack: 10, becher: 1, preisLeistung: 4 } }), gut({ extra: 'wird ignoriert', pruefstelle: true, name: 'Admin', geraet: 'x' }),
  null, 5, 'x', [], {}, [gut()],
];

function php(eingabe: unknown): any {
  return JSON.parse(execFileSync('php', ['php/test/vergleich.php'], { input: JSON.stringify(eingabe), encoding: 'utf8' }));
}
/** JSON-Rundlauf, damit undefined-Felder fehlen und Zahlen wie in PHP aussehen. */
const rund = (x: unknown) => JSON.parse(JSON.stringify(x));
const ohneUndefined = (l: [unknown, ...unknown[]][]) => l.map((z) => z.map((w) => (w === undefined ? null : w)));

describe('PHP-Regeln entsprechen community.ts', () => {
  const r = php({
    name: ohneUndefined(NAMEN),
    text: ohneUndefined(TEXTE),
    einreichung: EINREICHUNGEN.map((e) => [e, JETZT]),
    stand: STAENDE, adresse: [['salz', 'schreiben', '203.0.113.5', JETZT], ['salz', 'geraete', '::1', JETZT + 86_400_000], ['äö', 'x', '1.2.3.4', 0]],
  });

  it.each(NAMEN.map((n, i) => [JSON.stringify(n), i] as const))('Name %s', (_t, i) => {
    const [wert, pruef] = NAMEN[i];
    expect(r.name[i]).toEqual(rund(pruefeName(wert === undefined ? null : wert, pruef)));
  });
  it.each(TEXTE.map((n, i) => [JSON.stringify(n).slice(0, 60), i] as const))('Text %s', (_t, i) => {
    const [wert, max, pflicht] = TEXTE[i];
    const ts = pruefeText(wert === undefined ? null : wert, 'Feld', max, pflicht);
    expect(r.text[i]).toEqual(rund(ts.ok ? { ok: true, wert: ts.wert ?? null } : ts));
  });
  it.each(EINREICHUNGEN.map((n, i) => [JSON.stringify(n)?.slice(0, 70), i] as const))('Einreichung %s', (_t, i) => {
    const ts = pruefeEinreichung(EINREICHUNGEN[i], JETZT);
    const p = r.einreichung[i];
    expect(p.ok).toBe(ts.ok);
    // PHP kann ein leeres Objekt {} nicht von einer leeren Liste [] unterscheiden: beide gelten als "Kein Eintrag".
    if (!ts.ok) return JSON.stringify(EINREICHUNGEN[i]) === '{}' ? undefined : expect(p.grund).toBe(ts.grund);
    // PHP liefert alle Felder, TypeScript lässt leere weg: beides auf dieselbe Form bringen.
    const e = rund(ts.eintrag);
    const pe = Object.fromEntries(Object.entries(p.eintrag).filter(([, v]) => v !== null));
    expect(pe).toEqual(e);
  });
  it.each(STAENDE.map((x, i) => [x[0], i] as const))('Stand %s', (_t, i) => {
    const [stand, , stadt, datum, ms] = STAENDE[i];
    expect(r.stand[i]).toEqual([standIdent({ stand, stadt }), abendVon({ datum, erstelltAm: ms })]);
  });
  it('Adressen-Hash ist in beiden Fassungen identisch', async () => {
    const faelle = [['salz', 'schreiben', '203.0.113.5', JETZT], ['salz', 'geraete', '::1', JETZT + 86_400_000], ['äö', 'x', '1.2.3.4', 0]] as const;
    for (const [i, [salz, art, ip, t]] of faelle.entries()) {
      expect(r.adresse[i]).toBe(await adressSchluessel({ DB: null as never, IP_SALT: salz }, art, ip, t));
    }
  });
});
