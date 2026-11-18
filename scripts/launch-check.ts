// Startcheck: Ist alles bereit, bevor der Link verteilt wird? Meldet jeden offenen Punkt.
//   npm run launch-check
import { readFileSync } from 'node:fs';
import { fehlendeAngaben, type Betreiber } from '../src/lib/betreiber';

const lies = (p: string) => JSON.parse(readFileSync(p, 'utf8'));
const SEITE_URL: string = lies('data/server.json').seite || 'https://gluehlabor.de/';
const SEITE = new URL(SEITE_URL).origin;

type Ergebnis = { ok: boolean; text: string; hinweis?: string };
const ergebnisse: Ergebnis[] = [];
const pruefe = (ok: boolean, text: string, hinweis?: string) => ergebnisse.push({ ok, text, hinweis });

// 1. Betreiberangaben
const fehlt = fehlendeAngaben(lies('data/betreiber.json') as Partial<Betreiber>);
pruefe(fehlt.length === 0, 'Impressum: Betreiberangaben vollständig', fehlt.length ? `fehlt: ${fehlt.join(', ')} (data/betreiber.json)` : undefined);

// 2. Server eingetragen und erreichbar
const roh = ((process.env.VITE_API_URL ?? '') || lies('data/server.json').apiUrl || '').trim();
// "/" = Server und Seite liegen unter derselben Adresse (Hetzner)
const apiUrl = roh === '/' ? SEITE : roh.replace(/\/+$/, '');
pruefe(Boolean(apiUrl), 'Server-Adresse eingetragen', 'data/server.json: apiUrl setzen');
if (apiUrl) {
  try {
    const s = await fetch(`${apiUrl}/api/status`);
    pruefe(s.ok, 'Server antwortet', `Status ${s.status}`);
    pruefe(
      s.headers.get('x-adresse-erkannt') === 'ja' || !apiUrl.startsWith(SEITE),
      'Echte Besucheradresse kommt beim Server an (X-Real-IP)',
      'Proxy-Konfiguration prüfen: proxy_set_header X-Real-IP $remote_addr; sonst teilen sich alle Besucher ein Limit',
    );
    if (SEITE.startsWith('https://')) {
      const h = await fetch(SEITE.replace('https://', 'http://'), { redirect: 'manual' });
      pruefe(h.status >= 301 && h.status <= 308 && (h.headers.get('location') ?? '').startsWith('https://'), 'http leitet auf https um', `Status ${h.status}`);
      const k = await fetch(SEITE + '/');
      pruefe(Boolean(k.headers.get('content-security-policy')), 'Sicherheitsköpfe (CSP) werden gesendet', 'läuft die Seite über den eigenen Server?');
      pruefe(Boolean(k.headers.get('strict-transport-security')), 'HSTS aktiv', 'Proxy muss X-Forwarded-Proto: https setzen');
    }

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

    // Webhosting: Konfiguration, Quelltext und Datenbankdatei dürfen von außen nicht erreichbar sein.
    if (apiUrl.startsWith(SEITE)) {
      for (const pfad of ['/api/privat/config.php', '/api/lib/app.php', '/api/daten/gluehlabor.sqlite']) {
        const r = await fetch(SEITE + pfad);
        const text = r.status === 200 ? await r.text() : '';
        pruefe(r.status !== 200 || text === '', `${pfad} ist von außen gesperrt`, `Status ${r.status}: .htaccess in api/ wird nicht ausgewertet?`);
      }
    }

    const code = await fetch(`${apiUrl}/api/pruefstelle`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' });
    pruefe(code.status === 401, 'Prüfstellen-Code ist ohne Anmeldung gesperrt', `Status ${code.status}`);
  } catch (err) {
    pruefe(false, 'Server erreichbar', String(err));
  }
}

// 3. Live-Seite
try {
  const r = await fetch(SEITE_URL);
  pruefe(r.ok, 'Live-Seite erreichbar', `Status ${r.status}`);
  // Link-Vorschau: Das Bild muss unter der angegebenen absoluten Adresse liegen und unter 300 KB bleiben (WhatsApp).
  const html = await r.text();
  const bildUrl = /property="og:image" content="([^"]+)"/.exec(html)?.[1];
  pruefe(Boolean(bildUrl), 'Link-Vorschau: og:image gesetzt', 'index.html prüfen');
  if (bildUrl) {
    const b = await fetch(bildUrl);
    const gr = Number(b.headers.get('content-length') ?? (await b.arrayBuffer()).byteLength);
    pruefe(b.ok && (b.headers.get('content-type') ?? '').startsWith('image/') && gr < 300_000, 'Link-Vorschau: Bild erreichbar und unter 300 KB', `${bildUrl}: Status ${b.status}, ${gr} Bytes`);
  }
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
