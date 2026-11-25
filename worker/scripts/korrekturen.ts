// Wendet data/korrekturen.json an: führt Stände zusammen, die dieselbe Bude in anderer Schreibweise sind.
// Läuft beim Deploy nach dem Einspielen der Bestandsdaten. Mehrfach ausführbar (nichts zu tun, wenn alles schon zusammengeführt ist).
// Geändert werden nur Stand, Markt und Stadt der Bewertungen: Wer bewertet hat, bleibt an jeder Bewertung erhalten.
//
//   API_URL=https://… ADMIN_TOKEN=… npx tsx worker/scripts/korrekturen.ts
import { readFileSync } from 'node:fs';
import { trefferFuerKorrektur, type Korrektur } from '../../src/lib/korrekturen';

const API_URL = (process.env.API_URL ?? '').replace(/\/+$/, '');
const TOKEN = process.env.ADMIN_TOKEN ?? '';
if (!API_URL || !TOKEN) {
  console.error('API_URL und ADMIN_TOKEN setzen.');
  process.exit(1);
}

interface Zeile {
  id: string;
  stand: string;
  markt: string;
  stadt?: string;
  versteckt?: boolean;
}

const datei = JSON.parse(readFileSync('data/korrekturen.json', 'utf8')) as { zusammenfuehren: Korrektur[] };

async function alleBecher(): Promise<Zeile[]> {
  const out: Zeile[] = [];
  let cursor = 0;
  for (;;) {
    const res = await fetch(`${API_URL}/api/becher?nach=${cursor}&limit=200`, { headers: { 'Cache-Control': 'no-cache' } });
    if (!res.ok) throw new Error(`Liste nicht lesbar (${res.status})`);
    const seite = (await res.json()) as { eintraege: Zeile[]; naechste: number; mehr: boolean };
    out.push(...seite.eintraege);
    cursor = seite.naechste;
    if (!seite.mehr) break;
  }
  return out;
}

const liste = (await alleBecher()).filter((e) => !e.versteckt);
let geaendert = 0;
for (const k of datei.zusammenfuehren) {
  const treffer = trefferFuerKorrektur(liste, k);
  if (treffer.length === 0) {
    console.log(`„${k.nach.stand}": nichts zu tun.`);
    continue;
  }
  for (let i = 0; i < treffer.length; i += 100) {
    const res = await fetch(`${API_URL}/api/admin/stand-aendern`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${TOKEN}`, 'X-Auth': `Bearer ${TOKEN}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ ids: treffer.slice(i, i + 100).map((e) => e.id), stand: k.nach.stand, markt: k.nach.markt, stadt: k.nach.stadt }),
    });
    const antwort = (await res.json()) as { betroffen?: number; fehler?: string };
    if (!res.ok) {
      console.error(`Fehler ${res.status}: ${antwort.fehler}`);
      process.exit(1);
    }
    geaendert += antwort.betroffen ?? 0;
  }
  console.log(`„${k.nach.stand}": ${treffer.length} Bewertungen zusammengeführt.`);
}
console.log(`${geaendert} Bewertungen geändert.`);
