// Holt Weihnachtsmärkte aus OpenStreetMap (Overpass) und schreibt data/maerkte-osm.json:
//   { quelle, stand, staedte: { "Stadt": ["Markt", …] } }
// Läuft über den Workflow „Märkte aktualisieren" (.github/workflows/maerkte.yml), lokal: node scripts/maerkte-osm.mjs
// Die Stadt kommt aus addr:city bzw. dem nächsten Ort aus data/orte.json (höchstens 12 km). Nur Orte in Deutschland und Österreich.
// Daten © OpenStreetMap-Mitwirkende, ODbL (Quelle steht im Impressum).
import { readFileSync, writeFileSync } from 'node:fs';

const orte = JSON.parse(readFileSync(new URL('../data/orte.json', import.meta.url), 'utf8')).orte; // [name, lat, lon, land, einw/100]
const ENDPUNKTE = ['https://overpass-api.de/api/interpreter', 'https://overpass.kumi.systems/api/interpreter'];
const NAME = '(weihnacht|christkind|christkindl|advent|wintermarkt|winterzauber|nikolaus|lichtermarkt|glühwein|gluehwein|striezel|weihnachtsdorf|christmas)';
// Mehrere kleine Abfragen statt einer großen (Overpass bricht große Namenssuchen über ganz Deutschland gern ab).
// Jede Abfrage hat ein eigenes Zeitlimit; scheitert eine, laufen die anderen weiter.
const FILTER = ['"amenity"="marketplace"', '"market"', '"event"', '"seasonal"="winter"', '"tourism"', '"leisure"', '"amenity"="events_venue"', '"amenity"="festival_grounds"'];
const abfragen = ['DE', 'AT'].flatMap((land) =>
  FILTER.map((f) => `[out:json][timeout:90];area["ISO3166-1"="${land}"]->.a;nwr[${f}]["name"~"${NAME}",i](area.a);out center tags;`),
);

async function einzeln(abfrage) {
  let fehler;
  for (const url of ENDPUNKTE) {
    try {
      const r = await fetch(url, {
        method: 'POST',
        body: 'data=' + encodeURIComponent(abfrage),
        headers: { 'content-type': 'application/x-www-form-urlencoded', 'user-agent': 'gluehlabor-maerkte/1.0' },
        signal: AbortSignal.timeout(120000),
      });
      const text = await r.text();
      if (!r.ok) throw new Error(`${url}: HTTP ${r.status} ${text.slice(0, 120).replace(/\s+/g, ' ')}`);
      return JSON.parse(text).elements ?? [];
    } catch (e) {
      fehler = e;
      console.error('Fehlgeschlagen:', String(e.message ?? e).slice(0, 200));
    }
  }
  throw fehler;
}

async function hole() {
  const elements = [];
  let ok = 0;
  for (const [i, q] of abfragen.entries()) {
    try {
      const el = await einzeln(q);
      elements.push(...el);
      ok++;
      console.log(`Abfrage ${i + 1}/${abfragen.length}: ${el.length} Treffer`);
    } catch {
      console.error(`Abfrage ${i + 1}/${abfragen.length} übersprungen`);
    }
    await new Promise((res) => setTimeout(res, 2000));
  }
  if (ok === 0) throw new Error('Keine einzige Overpass-Abfrage hat geantwortet.');
  return { elements };
}

const rad = (g) => (g * Math.PI) / 180;
const km = (a, b, c, d) => {
  const x = rad(c - a), y = rad(d - b);
  const h = Math.sin(x / 2) ** 2 + Math.cos(rad(a)) * Math.cos(rad(c)) * Math.sin(y / 2) ** 2;
  return 12742 * Math.asin(Math.sqrt(h));
};
const norm = (s) => s.toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '').replace(/ß/g, 'ss').replace(/[^a-z0-9]+/g, ' ').trim();
const nachName = new Map(orte.map((o) => [norm(o[0]), o[0]]));

function stadtVon(t, lat, lon) {
  const c = t['addr:city'];
  if (c && nachName.has(norm(c))) return nachName.get(norm(c));
  let best = null, bd = 12;
  for (const o of orte) {
    if (Math.abs(o[1] - lat) > 0.2) continue;
    const d = km(lat, lon, o[1], o[2]) - Math.log10(1 + o[4]) * 0.8; // größere Orte leicht bevorzugt
    if (d < bd) { bd = d; best = o[0]; }
  }
  return best;
}

function bereinige(n) {
  let s = n.replace(/\s+/g, ' ').trim();
  if (s.length < 4 || s.length > 60) return null;
  if (/https?:|@/.test(s)) return null;
  return s;
}

const daten = await hole();
const je = new Map(); // Stadt -> Map(norm -> Name)
for (const el of daten.elements ?? []) {
  const t = el.tags ?? {};
  const lat = el.lat ?? el.center?.lat, lon = el.lon ?? el.center?.lon;
  const name = t.name && bereinige(t.name);
  if (!name || lat == null) continue;
  if (!new RegExp(NAME, 'i').test(name)) continue;
  const stadt = stadtVon(t, lat, lon);
  if (!stadt) continue;
  const m = je.get(stadt) ?? new Map();
  // Name ohne Stadtnamen als Schlüssel, damit „Weihnachtsmarkt" und „Weihnachtsmarkt Hamburg" nicht doppelt stehen
  const k = norm(name).replace(norm(stadt), '').trim() || norm(name);
  if (!m.has(k) || name.length < m.get(k).length) m.set(k, name);
  je.set(stadt, m);
}
const staedte = {};
for (const [stadt, m] of [...je].sort((a, b) => a[0].localeCompare(b[0], 'de'))) staedte[stadt] = [...m.values()].sort((a, b) => a.localeCompare(b, 'de'));
const anzahl = Object.values(staedte).reduce((n, l) => n + l.length, 0);
if (anzahl < 200) throw new Error(`Nur ${anzahl} Märkte gefunden, das sieht nach einer fehlerhaften Antwort aus. Nichts geschrieben.`);
writeFileSync(new URL('../data/maerkte-osm.json', import.meta.url), JSON.stringify({ quelle: 'OpenStreetMap, ODbL (Mitwirkende)', stand: new Date().toISOString().slice(0, 10), staedte }, null, 1) + '\n');
console.log(`${anzahl} Märkte in ${Object.keys(staedte).length} Städten`);
