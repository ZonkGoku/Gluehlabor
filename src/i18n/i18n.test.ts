import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { EN } from './en';
import { setzeSprache, t, tn } from './index';

describe('t und tn', () => {
  it('Deutsch ist der Schlüssel und bleibt unverändert, Platzhalter werden gefüllt', () => {
    setzeSprache('de');
    expect(t('Rangliste')).toBe('Rangliste');
    expect(t('Alle {n}', { n: 4 })).toBe('Alle 4');
    expect(tn(1, '{n} Bewertung', '{n} Bewertungen')).toBe('1 Bewertung');
    expect(tn(3, '{n} Bewertung', '{n} Bewertungen')).toBe('3 Bewertungen');
  });
  it('Englisch übersetzt, unbekannte Texte bleiben deutsch', () => {
    setzeSprache('en');
    expect(t('Rangliste')).toBe('Leaderboard');
    expect(t('Alle {n}', { n: 4 })).toBe('All 4');
    expect(tn(1, '{n} Stand', '{n} Stände')).toBe('1 stall');
    expect(tn(2, '{n} Stand', '{n} Stände')).toBe('2 stalls');
    expect(tn(1, '{n} Becher', '{n} Becher')).toBe('1 cup');
    expect(tn(2, '{n} Becher', '{n} Becher')).toBe('2 cups');
    expect(t('Dieser Text hat keine Übersetzung')).toBe('Dieser Text hat keine Übersetzung');
    setzeSprache('de');
  });
});

describe('Wörterbuch', () => {
  it('jeder Eintrag hat dieselben Platzhalter wie sein deutscher Schlüssel', () => {
    const plz = (s: string) => [...s.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort().join(',');
    for (const [de, en] of Object.entries(EN)) expect(plz(en), de).toBe(plz(de.replace(/\|1$/, '')));
  });
  it('kein Eintrag ist leer', () => {
    for (const [de, en] of Object.entries(EN)) expect(en.trim(), de).not.toBe('');
  });
  it('alle im Code verwendeten Texte t(\'…\') und tn(n, \'…\', \'…\') sind übersetzt', () => {
    const dateien: string[] = [];
    const lauf = (d: string) => {
      for (const n of readdirSync(d)) {
        const p = join(d, n);
        if (statSync(p).isDirectory()) lauf(p);
        else if (/\.(ts|tsx)$/.test(n) && !/\.test\./.test(n) && !p.includes('/i18n/')) dateien.push(p);
      }
    };
    lauf('src');
    const fehlt: string[] = [];
    for (const f of dateien) {
      const s = readFileSync(f, 'utf8');
      for (const m of s.matchAll(/\b(?:t|tt|uebersetze)\(\s*'((?:[^'\\]|\\.)*)'/g)) {
        const k = m[1].replace(/\\'/g, "'");
        if (!(k in EN)) fehlt.push(`${f}: ${k}`);
      }
      for (const m of s.matchAll(/\btn\([^,]+,\s*'((?:[^'\\]|\\.)*)',\s*'((?:[^'\\]|\\.)*)'/g)) {
        for (const k of [m[1], m[2]]) if (!(k in EN) && k !== '{n} Becher') fehlt.push(`${f}: ${k}`);
      }
    }
    expect(fehlt).toEqual([]);
  });
});
