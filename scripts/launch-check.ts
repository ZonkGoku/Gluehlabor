// Startcheck: Ist alles bereit, bevor der Link verteilt wird? Meldet jeden offenen Punkt.
//   npm run launch-check
import { readFileSync } from 'node:fs';
import { fehlendeAngaben, type Betreiber } from '../src/lib/betreiber';

const lies = (p: string) => JSON.parse(readFileSync(p, 'utf8'));
const SEITE = 'https://zonkgoku.github.io';

type Ergebnis = { ok: boolean; text: string; hinweis?: string };
const ergebnisse: Ergebnis[] = [];
const pruefe = (ok: boolean, text: string, hinweis?: string) => ergebnisse.push({ ok, text, hinweis });

// 1. Betreiberangaben
const fehlt = fehlendeAngaben(lies('data/betreiber.json') as Partial<Betreiber>);
pruefe(fehlt.length === 0, 'Impressum: Betreiberangaben vollständig', fehlt.length ? `fehlt: ${fehlt.join(', ')} (data/betreiber.json)` : undefined);

// 2. Server eingetragen und erreichbar
const apiUrl = ((process.env.VITE_API_URL ?? '') || lies('data/server.json').apiUrl || '').replace(/\/+$/, '');
pruefe(Boolean(apiUrl), 'Server-Adresse eingetragen', 'data/server.json: apiUrl setzen');
if (apiUrl) {
  try {
    const s = await fetch(`${apiUrl}/api/status`);
    pruefe(s.ok, 'Server antwortet', `Status ${s.status}`);

    const l = (await (await fetch(`${apiUrl}/api/becher?limit=500`)).json()) as { eintraege: { pruefstelle?: boolean }[] };
    const pruefstelle = l.eintraege.filter((e) => e.pruefstelle).length;
    pruefe(pruefstelle >= 14, 'Bestandsdaten 2025 als Prüfstelle hochgeladen', `${pruefstelle} von 14 (npm run worker:seed)`);

    const pre = await fetch(`${apiUrl}/api/becher`, {
      method: 'OPTIONS',
      headers: { Origin: SEITE, 'Access-Control-Request-Method': 'POST', 'Access-Control-Request-Headers': 'authorization,content-type' },
    });
    pruefe(pre.status === 204 && pre.headers.get('access-control-allow-origin') === SEITE, 'Die Seite darf schreiben (CORS)', `Status ${pre.status}`);

    const fremd = await fetch(`${apiUrl}/api/geraete`, { method: 'POST', headers: { Origin: 'https://fremd.example', 'Content-Type': 'application/json' }, body: '{}' });
    pruefe(fremd.status === 403, 'Fremde Seiten dürfen nicht schreiben', `Status ${fremd.status}`);

    const admin = await fetch(`${apiUrl}/api/admin/meldungen`);
    pruefe(admin.status === 401, 'Moderation ist ohne Schlüssel gesperrt', `Status ${admin.status}`);

    const code = await fetch(`${apiUrl}/api/pruefstelle`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' });
    pruefe(code.status === 401, 'Prüfstellen-Code ist ohne Anmeldung gesperrt', `Status ${code.status}`);
  } catch (err) {
    pruefe(false, 'Server erreichbar', String(err));
  }
}

// 3. Live-Seite
try {
  const r = await fetch(`${SEITE}/Becherwerk/`);
  pruefe(r.ok, 'Live-Seite erreichbar', `Status ${r.status}`);
} catch (err) {
  pruefe(false, 'Live-Seite erreichbar', String(err));
}

let offen = 0;
for (const e of ergebnisse) {
  if (!e.ok) offen++;
  console.log(`${e.ok ? 'OK    ' : 'OFFEN '} ${e.text}${!e.ok && e.hinweis ? `  → ${e.hinweis}` : ''}`);
}
console.log(offen === 0 ? '\nAlles bereit.' : `\n${offen} Punkt(e) offen.`);
process.exit(offen === 0 ? 0 : 1);
