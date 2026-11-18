// Lädt die Bestandsdaten (data/gluehwein-2025.csv) als Bewertungen der Prüfstelle auf den Server.
// Mehrfach ausführbar: schon vorhandene Becher werden übersprungen.
//
//   API_URL=https://… ADMIN_TOKEN=… npx tsx worker/scripts/seed.ts
import { readFileSync } from 'node:fs';
import { importiereCsv } from '../../src/lib/csvImport';

const API_URL = (process.env.API_URL ?? '').replace(/\/+$/, '');
const TOKEN = process.env.ADMIN_TOKEN ?? '';
if (!API_URL || !TOKEN) {
  console.error('API_URL und ADMIN_TOKEN setzen.');
  process.exit(1);
}

const eintraege = importiereCsv(readFileSync('data/gluehwein-2025.csv', 'utf8'));
let neu = 0;
for (let i = 0; i < eintraege.length; i += 100) {
  const res = await fetch(`${API_URL}/api/admin/import`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ eintraege: eintraege.slice(i, i + 100) }),
  });
  const antwort = (await res.json()) as { neu?: number; abgelehnt?: unknown[]; fehler?: string };
  if (!res.ok) {
    console.error(`Fehler ${res.status}: ${antwort.fehler}`);
    process.exit(1);
  }
  neu += antwort.neu ?? 0;
  if (antwort.abgelehnt?.length) console.warn('Abgelehnt:', antwort.abgelehnt);
}
console.log(`${neu} neue Becher importiert (${eintraege.length - neu} schon vorhanden).`);
