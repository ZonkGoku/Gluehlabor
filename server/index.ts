// Startpunkt des eigenen Servers (Hetzner). Konfiguration über Umgebungsvariablen, siehe hetzner/README.md.
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { importiereCsv } from '../src/lib/csvImport';
import { handle } from '../worker/src/app';
import { baueServer, taeglich } from './server';
import { oeffneDatenbank } from './sqlite-d1';

const env = process.env;
const wurzel = resolve(env.APP_ROOT ?? process.cwd());
const daten = resolve(env.DATA_DIR ?? '/data');
const port = Number(env.PORT ?? 8787);
const adminToken = env.ADMIN_TOKEN ?? '';
if (adminToken.length < 24) {
  console.error('ADMIN_TOKEN fehlt oder ist zu kurz (mindestens 24 Zeichen).');
  process.exit(1);
}
if ((env.IP_SALT ?? '').length < 16) {
  console.error('IP_SALT fehlt oder ist zu kurz (mindestens 16 Zeichen).');
  process.exit(1);
}

const db = oeffneDatenbank(resolve(daten, 'gluehlabor.sqlite'), resolve(wurzel, 'worker/migrations'));
const einstellungen = {
  ADMIN_TOKEN: adminToken,
  PRUEFSTELLE_CODE: env.PRUEFSTELLE_CODE,
  IP_SALT: env.IP_SALT,
  ERLAUBTE_URSPRUENGE: env.ERLAUBTE_URSPRUENGE ?? 'https://gluehlabor.de,https://www.gluehlabor.de',
};
const server = baueServer({ db, dist: resolve(wurzel, 'dist'), env: einstellungen });

// Bestandsdaten (Prüfstelle 2025) beim Start einspielen. Mehrfach ausführbar: Vorhandenes wird übersprungen.
async function seed(): Promise<void> {
  const csv = resolve(wurzel, 'data/gluehwein-2025.csv');
  const eintraege = importiereCsv(readFileSync(csv, 'utf8'));
  const antwort = await handle(
    new Request('http://intern/api/admin/import', {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ eintraege }),
    }),
    { ...einstellungen, DB: db.d1 },
  );
  const r = (await antwort.json()) as { neu?: number; fehler?: string };
  console.log(antwort.ok ? `Bestand: ${r.neu} neue Becher.` : `Bestand nicht eingespielt: ${r.fehler}`);
}

await seed().catch((f) => console.error('Seed fehlgeschlagen:', f));
const sicherungen = resolve(daten, 'sicherungen');
const lauf = () => taeglich(db, sicherungen).catch((f) => console.error('Tageslauf fehlgeschlagen:', f));
void lauf();
const timer = setInterval(lauf, 24 * 3600_000);

server.listen(port, '0.0.0.0', () => console.log(`Glühlabor läuft auf Port ${port}`));
const ende = () => {
  clearInterval(timer);
  server.close(() => {
    db.schliessen();
    process.exit(0);
  });
  setTimeout(() => process.exit(0), 5000).unref();
};
process.on('SIGTERM', ende);
process.on('SIGINT', ende);
