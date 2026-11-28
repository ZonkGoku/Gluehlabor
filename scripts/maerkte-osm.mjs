// Holt Weihnachtsmärkte aus OpenStreetMap (Overpass) und schreibt data/maerkte-osm.json:
//   { quelle, stand, staedte: { "Stadt": ["Markt", …] } }
// Läuft über den Workflow „Märkte aktualisieren" (.github/workflows/maerkte.yml), lokal: node scripts/maerkte-osm.mjs
// Die Stadt kommt aus addr:city bzw. dem nächsten Ort aus data/orte.json (höchstens 12 km). Nur Orte in Deutschland und Österreich.
// Daten © OpenStreetMap-Mitwirkende, ODbL (Quelle steht im Impressum).
import { readFileSync, writeFileSync } from 'node:fs';

const orte = JSON.parse(readFileSync(new URL('../data/orte.json', import.meta.url), 'utf8')).orte; // [name, lat, lon, land, einw/100]
const ENDPUNKTE = ['https://overpass-api.de/api/interpreter', 'https://overpass.private.coffee/api/interpreter', 'https://overpass.kumi.systems/api/interpreter'];
const NAME = '(weihnacht|christkind|christkindl|advent|wintermarkt|winterzauber|nikolaus|lichtermarkt|glühwein|gluehwein|striezel|weihnachtsdorf|christmas)';
// Zuerst nur Bayern (Fokus von David & Philip): ein Rechteck um Bayern statt der Gebietssuche, das ist für Overpass viel billiger (die Gebietssuche
// über ganze Länder lief im ersten Lauf in Zeitüberschreitungen). Treffer außerhalb Bayerns (z. B. Salzburg) bleiben drin, sie werden unten über
// den nächsten Ort aus data/orte.json zugeordnet. Mit REGION=alle (Umgebungsvariable) läuft es für Deutschland und Österreich, je Bundesland.
const REGION = process.env.REGION ?? 'bayern';
const BAYERN = '47.2,8.9,50.6,13.9'; // Süd, West, Nord, Ost
const GEBIETE = ['DE-BW', 'DE-BY', 'DE-BE', 'DE-BB', 'DE-HB', 'DE-HH', 'DE-HE', 'DE-MV', 'DE-NI', 'DE-NW', 'DE-RP', 'DE-SL', 'DE-SN', 'DE-ST', 'DE-SH', 'DE-TH', 'AT'];
const FILTER = ['"amenity"="marketplace"', '"market"', '"event"', '"seasonal"="winter"', '"tourism"', '"leisure"'];
const abfragen =
  REGION === 'alle'
    ? GEBIETE.flatMap((g) => FILTER.map((f) => `[out:json][timeout:40];area["${g.includes('-') ? 'ISO3166-2' : 'ISO3166-1'}"="${g}"]->.a;nwr[${f}]["name"~"${NAME}",i](area.a);out center tags;`))
    : FILTER.map((f) => `[out:json][timeout:60][bbox:${BAYERN}];nwr[${f}]["name"~"${NAME}",i];out center tags;`);

// Gesamtbudget: nach 15 Minuten wird mit den bisherigen Treffern weitergemacht (der Workflow bricht nach 30 ab).
const ENDE = Date.now() + 15 * 60 * 1000;

async function einzeln(abfrage) {
  let fehler;
  for (const url of ENDPUNKTE) {
    if (Date.now() > ENDE) break;
    try {
      const r = await fetch(url, {
        method: 'POST',
        body: 'data=' + encodeURIComponent(abfrage),
        headers: { 'content-type': 'application/x-www-form-urlencoded', 'user-agent': 'gluehlabor-maerkte/1.0' },
        signal: AbortSignal.timeout(75000),
      });
      const text = await r.text();
      if (!r.ok) throw new Error(`${url}: HTTP ${r.status} ${text.slice(0, 120).replace(/\s+/g, ' ')}`);
      return JSON.parse(text).elements ?? [];
    } catch (e) {
      fehler = e;
      console.error('Fehlgeschlagen:', String(e.message ?? e).slice(0, 200));
    }
  }
  throw fehler ?? new Error('Zeitbudget aufgebraucht');
}

/** Aus einem Geofabrik-Auszug: Datei im GeoJSON-Sequenz-Format (osmium export), schon auf Markt-Tags gefiltert. Siehe Workflow „Märkte aktualisieren“. */
function leseGeojsonSeq(datei) {
  const elements = [];
  for (const zeile of readFileSync(datei, 'utf8').split('\n')) {
    const text = zeile.replace(/^\u001e/, '').trim();
    if (!text) continue;
    let f;
    try {
      f = JSON.parse(text);
    } catch {
      continue;
    }
    const punkte = [];
    const sammle = (c) => (typeof c[0] === 'number' ? punkte.push(c) : c.forEach(sammle));
    if (f.geometry?.coordinates) sammle(f.geometry.coordinates);
    if (punkte.length === 0) continue;
    const lon = punkte.reduce((n, q) => n + q[0], 0) / punkte.length;
    const lat = punkte.reduce((n, q) => n + q[1], 0) / punkte.length;
    elements.push({ tags: f.properties ?? {}, lat, lon });
  }
  console.log(`${elements.length} Objekte aus ${datei}`);
  return { elements };
}

async function hole() {
  if (process.env.GEOJSONSEQ) return leseGeojsonSeq(process.env.GEOJSONSEQ);
  const elements = [];
  let ok = 0;
  for (const [i, q] of abfragen.entries()) {
    if (Date.now() > ENDE) {
      console.error(`Zeitbudget aufgebraucht, Abfragen ab ${i + 1} entfallen`);
      break;
    }
    try {
      const el = await einzeln(q);
      elements.push(...el);
      ok++;
      console.log(`Abfrage ${i + 1}/${abfragen.length}: ${el.length} Treffer`);
    } catch {
      console.error(`Abfrage ${i + 1}/${abfragen.length} übersprungen`);
    }
    await new Promise((res) => setTimeout(res, 1000));
  }
  console.log(`${ok} von ${abfragen.length} Abfragen beantwortet, ${elements.length} Treffer.`);
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
const zaehl = { gesamt: 0, mitName: 0, treffer: 0, ohneStadt: 0, weihnachtsTag: 0 };
const probeTreffer = [], probeOhne = [], probeKeinTreffer = [];
const WEIHNACHT_TAG = /christmas|weihnacht|winter/i;
for (const el of daten.elements ?? []) {
  const t = el.tags ?? {};
  const lat = el.lat ?? el.center?.lat, lon = el.lon ?? el.center?.lon;
  zaehl.gesamt++;
  // Name: auch Zweitnamen, viele Märkte stehen nur dort („name:de", „official_name", „alt_name")
  const kandidaten = [t.name, t['name:de'], t.official_name, t.alt_name, t.short_name].filter(Boolean);
  const namen = kandidaten.map(bereinige).filter(Boolean);
  if (namen.length) zaehl.mitName++;
  // Nur ausdrückliche Weihnachts-Tags. „seasonal=winter" gehört vor allem Wildschutzgebieten und Skiliften (so kam der erste Lauf auf lauter Unsinn).
  const tagTreffer = [t.market, t.event].some((v) => typeof v === 'string' && /christmas|xmas/i.test(v));
  if (tagTreffer) zaehl.weihnachtsTag++;
  const name = namen.find((n) => new RegExp(NAME, 'i').test(n)) ?? (tagTreffer ? namen[0] : undefined);
  if (name && /schongebiet|schutzgebiet|wildruhe|lift|loipe|skitour|parkplatz|stadion|hallenbad/i.test(name)) continue;
  if (!name || lat == null) {
    if (namen[0] && /markt|fest|zauber|dorf/i.test(namen[0]) && probeKeinTreffer.length < 25) probeKeinTreffer.push(namen[0]);
    continue;
  }
  const stadt = stadtVon(t, lat, lon);
  if (!stadt) {
    zaehl.ohneStadt++;
    if (probeOhne.length < 15) probeOhne.push(`${name} (${lat.toFixed(2)}, ${lon.toFixed(2)})`);
    continue;
  }
  zaehl.treffer++;
  if (probeTreffer.length < 25) probeTreffer.push(`${name} → ${stadt}`);
  const m = je.get(stadt) ?? new Map();
  // Name ohne Stadtnamen als Schlüssel, damit „Weihnachtsmarkt" und „Weihnachtsmarkt Hamburg" nicht doppelt stehen
  const k = norm(name).replace(norm(stadt), '').trim() || norm(name);
  if (!m.has(k) || name.length < m.get(k).length) m.set(k, name);
  je.set(stadt, m);
}
console.log('Zählung:', JSON.stringify(zaehl));
console.log('Treffer (Beispiele):', probeTreffer.join(' | '));
if (probeOhne.length) console.log('Ohne Stadt (Beispiele):', probeOhne.join(' | '));
console.log('Nicht erkannt, mit „markt/fest/zauber/dorf“ im Namen (Beispiele):', probeKeinTreffer.join(' | '));
const staedte = {};
for (const [stadt, m] of [...je].sort((a, b) => a[0].localeCompare(b[0], 'de'))) staedte[stadt] = [...m.values()].sort((a, b) => a.localeCompare(b, 'de'));
const anzahl = Object.values(staedte).reduce((n, l) => n + l.length, 0);
// Schutz vor einer kaputten Antwort: nie weniger als die Hälfte des bisherigen Bestands schreiben (ohne Bestand genügt ein Markt, der erste Lauf soll auch kleine Ergebnisse zeigen).
let bisher = 0;
try {
  const alt = JSON.parse(readFileSync(new URL('../data/maerkte-osm.json', import.meta.url), 'utf8')).staedte ?? {};
  bisher = Object.values(alt).reduce((n, l) => n + l.length, 0);
} catch {
  /* noch kein Bestand */
}
if (anzahl < 1 || (bisher > 0 && anzahl < bisher / 2)) throw new Error(`Nur ${anzahl} Märkte gefunden (bisher ${bisher}), das sieht nach einer unvollständigen Antwort aus. Nichts geschrieben.`);
writeFileSync(new URL('../data/maerkte-osm.json', import.meta.url), JSON.stringify({ quelle: 'OpenStreetMap, ODbL (Mitwirkende)', stand: new Date().toISOString().slice(0, 10), staedte }, null, 1) + '\n');
console.log(`${anzahl} Märkte in ${Object.keys(staedte).length} Städten`);
