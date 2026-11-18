// Baut den Ordner out/webhosting: App (dist) + PHP-Schnittstelle + .htaccess, bereit zum Hochladen ins Hauptverzeichnis
// der Domain bei Hetzner Webhosting. Aufruf: npm run build:webhosting
// Die Konfiguration (Geheimnisse) kommt aus Umgebungsvariablen: ADMIN_TOKEN, PRUEFSTELLE_CODE, IP_SALT,
// optional DB_NAME, DB_USER, DB_PASSWORD, DB_HOST (dann MySQL statt SQLite). Fehlen sie, wird keine config.php erzeugt.
import { execSync } from 'node:child_process';
import { cpSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';

const aus = 'out/webhosting';
rmSync(aus, { recursive: true, force: true });
mkdirSync(aus, { recursive: true });

if (!process.env.SKIP_BUILD) execSync('npm run build', { stdio: 'inherit', env: { ...process.env, VITE_API_URL: '/' } });
if (!existsSync('dist/index.html')) throw new Error('dist/ fehlt');
cpSync('dist', aus, { recursive: true });
cpSync('php/api', `${aus}/api`, { recursive: true, filter: (q) => !q.endsWith('config.php') && !q.includes('/daten') });
writeFileSync(`${aus}/.htaccess`, readFileSync('php/htaccess.txt'));

const e = process.env;
if (e.ADMIN_TOKEN && e.PRUEFSTELLE_CODE && e.IP_SALT) {
  if (e.ADMIN_TOKEN.length < 24 || e.IP_SALT.length < 16) throw new Error('ADMIN_TOKEN (mind. 24) oder IP_SALT (mind. 16) zu kurz');
  const db = e.DB_NAME
    ? { typ: 'mysql', host: e.DB_HOST || 'localhost', name: e.DB_NAME, benutzer: e.DB_USER ?? '', passwort: e.DB_PASSWORD ?? '' }
    : { typ: 'sqlite' };
  const cfg = {
    admin_token: e.ADMIN_TOKEN.trim(),
    pruefstelle_code: e.PRUEFSTELLE_CODE.trim(),
    ip_salz: e.IP_SALT.trim(),
    erlaubte_ursprunge: ['https://gluehlabor.de', 'https://www.gluehlabor.de'],
    db,
  };
  // PHP-Datei mit eingebetteter JSON-Zeichenkette (Nowdoc), damit nichts maskiert werden muss.
  // Bei SQLite liegt die Datei in api/daten/ (gesperrt, wird vom Deploy nie überschrieben).
  const fertig = `<?php
$c = json_decode(<<<'JSON'
${JSON.stringify(cfg)}
JSON, true);
if ($c['db']['typ'] === 'sqlite') {
    $c['db']['datei'] = dirname(__DIR__) . '/daten/gluehlabor.sqlite';
}
return $c;
`;
  mkdirSync(`${aus}/api/privat`, { recursive: true });
  writeFileSync(`${aus}/api/privat/config.php`, fertig);
  console.log('config.php erzeugt.');
} else {
  console.log('Keine config.php erzeugt (ADMIN_TOKEN, PRUEFSTELLE_CODE, IP_SALT fehlen). Von Hand aus api/privat/config.beispiel.php anlegen.');
}
console.log(`Fertig: ${aus}`);
