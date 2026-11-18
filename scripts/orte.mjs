// Erzeugt data/orte.json: Orte in Deutschland und Österreich für die Ortssuche in der Erfassung und für die Karte.
// Quelle: GeoNames (https://www.geonames.org, CC BY 4.0) über das npm-Paket all-the-cities. Einmalig bzw. bei Bedarf:
//
//   npm install --no-save all-the-cities@3.1.0 && node scripts/orte.mjs
//
// Orte unter 3.000 Einwohnern fehlen, außer sie stehen schon in data/staedte.json. Die Suche erlaubt immer auch freie Eingaben.
import { readFileSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';

const cities = createRequire(import.meta.url)('all-the-cities');
const bekannt = JSON.parse(readFileSync(new URL('../data/staedte.json', import.meta.url), 'utf8'));

// GeoNames-Codes der Bundesländer (admin1), Reihenfolge wie in `laender`. Als Arrays, weil Objektschlüssel wie "16" vorgezogen würden.
const DE_CODES = ['01', '02', '03', '04', '05', '06', '07', '08', '09', '10', '11', '12', '13', '14', '15', '16'];
const DE_NAMEN = ['Baden-Württemberg', 'Bayern', 'Bremen', 'Hamburg', 'Hessen', 'Niedersachsen', 'Nordrhein-Westfalen', 'Rheinland-Pfalz', 'Saarland', 'Schleswig-Holstein', 'Brandenburg', 'Mecklenburg-Vorpommern', 'Sachsen', 'Sachsen-Anhalt', 'Thüringen', 'Berlin'];
const laender = [...DE_NAMEN, 'Österreich', 'Deutschland'];
const land = (c) => (c.country === 'AT' ? DE_NAMEN.length : DE_CODES.indexOf(c.adminCode));
// GeoNames führt einige Großstädte unter englischem Namen
const DEUTSCH = { Munich: 'München', Vienna: 'Wien' };
const MIN = 3000;
const AUSGESCHLOSSEN = new Set(['PPLX', 'PPLL', 'PPLH', 'PPLW', 'PPLQ']); // Stadtteile, Weiler, historische Orte

const aus = new Map(); // "Name|Land" -> Eintrag
for (const c of cities) {
  if ((c.country !== 'DE' && c.country !== 'AT') || AUSGESCHLOSSEN.has(c.featureCode)) continue;
  const l = land(c);
  if (l < 0) continue;
  const name = DEUTSCH[c.name] ?? c.name;
  const e = [name, +c.loc.coordinates[1].toFixed(2), +c.loc.coordinates[0].toFixed(2), l, Math.round(c.population / 100)];
  const k = `${name}|${l}`;
  if (c.population < MIN && !(name in bekannt)) continue;
  if (!aus.has(k) || aus.get(k)[4] < e[4]) aus.set(k, e);
}
// Eigene Städte, die GeoNames nicht oder anders kennt, kommen mit ihren Koordinaten aus data/staedte.json dazu
for (const [name, k] of Object.entries(bekannt)) {
  if (name.startsWith('_') || ![...aus.values()].every((e) => e[0] !== name)) continue;
  aus.set(`${name}|x`, [name, k[0], k[1], laender.length - 1, 1]);
}
const liste = [...aus.values()].sort((a, b) => b[4] - a[4] || a[0].localeCompare(b[0], 'de'));
writeFileSync(new URL('../data/orte.json', import.meta.url), JSON.stringify({ quelle: 'GeoNames, CC BY 4.0', laender, orte: liste }));
console.log(`${liste.length} Orte, ${(JSON.stringify(liste).length / 1024).toFixed(0)} KB`);
