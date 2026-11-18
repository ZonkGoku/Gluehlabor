// Die tägliche Sicherung: SQLite-Kopie ist lesbar, Rotation behält 14, Aufruf über den Browser ist gesperrt.
import { execFileSync, spawn } from 'node:child_process';
import { cpSync, existsSync, mkdirSync, mkdtempSync, readdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { gunzipSync } from 'node:zlib';
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

function einrichten(db: Record<string, unknown>) {
  const w = mkdtempSync(resolve(tmpdir(), 'gl-sich-'));
  cpSync(resolve(process.cwd(), 'php/api'), resolve(w, 'api'), { recursive: true });
  const cfg = { admin_token: 'a'.repeat(30), pruefstelle_code: 'c', ip_salz: 's'.repeat(20), db };
  writeFileSync(resolve(w, 'api/privat/config.php'), `<?php return json_decode(${JSON.stringify(JSON.stringify(cfg))}, true);`);
  return w;
}
const php = (w: string, ...a: string[]) => execFileSync('php', [resolve(w, 'api/lib/sicherung.php'), ...a], { encoding: 'utf8' });

describe('Sicherung', () => {
  it('SQLite: legt eine lesbare Kopie an, auch wiederholt am selben Tag', () => {
    const w = einrichten({ typ: 'sqlite', datei: '__DATEI__' });
    const datei = resolve(w, 'api/daten/gluehlabor.sqlite');
    writeFileSync(resolve(w, 'api/privat/config.php'), `<?php return ['admin_token'=>str_repeat('a',30),'ip_salz'=>str_repeat('s',20),'db'=>['typ'=>'sqlite','datei'=>'${datei}']];`);
    mkdirSync(resolve(w, 'api/daten'), { recursive: true });
    // Datenbank anlegen und einen Eintrag schreiben (macht die Schnittstelle sonst selbst)
    execFileSync('php', ['-r', `require '${w}/api/lib/db.php'; $d = new Db(['typ'=>'sqlite','datei'=>'${datei}']); $d->lauf("INSERT INTO geraete (id, schluessel_hash, erstellt_am) VALUES ('x','h',1)");`]);
    php(w);
    const aus = php(w);
    expect(aus).toContain('Sicherung:');
    const sich = readdirSync(resolve(w, 'api/daten/sicherungen'));
    expect(sich).toHaveLength(1);
    const kopie = new DatabaseSync(resolve(w, 'api/daten/sicherungen', sich[0]), { readOnly: true });
    expect((kopie.prepare('SELECT COUNT(*) AS n FROM geraete').get() as { n: number }).n).toBe(1);
    kopie.close();
    expect(readFileSync(resolve(w, 'api/daten/.htaccess'), 'utf8')).toContain('denied');
  });

  it('Rotation: es bleiben die letzten 14', () => {
    const w = einrichten({ typ: 'sqlite' });
    const datei = resolve(w, 'api/daten/gluehlabor.sqlite');
    writeFileSync(resolve(w, 'api/privat/config.php'), `<?php return ['admin_token'=>str_repeat('a',30),'ip_salz'=>str_repeat('s',20),'db'=>['typ'=>'sqlite','datei'=>'${datei}']];`);
    mkdirSync(resolve(w, 'api/daten/sicherungen'), { recursive: true });
    for (let t = 1; t <= 20; t++) writeFileSync(resolve(w, `api/daten/sicherungen/gluehlabor-2020-01-${String(t).padStart(2, '0')}.sqlite`), 'alt');
    php(w);
    const rest = readdirSync(resolve(w, 'api/daten/sicherungen')).sort();
    expect(rest).toHaveLength(14);
    expect(rest.at(-1)).toMatch(/^gluehlabor-\d{4}-\d{2}-\d{2}\.sqlite$/);
    expect(existsSync(resolve(w, 'api/daten/sicherungen/gluehlabor-2020-01-01.sqlite'))).toBe(false);
  });

  it('über den Browser nicht aufrufbar (404, keine Sicherung)', async () => {
    const w = einrichten({ typ: 'sqlite' });
    const port = 30000 + Math.floor(Math.random() * 9000);
    const server = spawn('php', ['-S', `127.0.0.1:${port}`, '-t', w], { stdio: 'ignore' });
    try {
      let r: Response | null = null;
      for (let i = 0; i < 40 && !r; i++) {
        try {
          r = await fetch(`http://127.0.0.1:${port}/api/lib/sicherung.php`);
        } catch {
          await new Promise((ok) => setTimeout(ok, 100));
        }
      }
      expect(r?.status).toBe(404);
      expect(existsSync(resolve(w, 'api/daten/sicherungen'))).toBe(false);
    } finally {
      server.kill();
    }
  });

  const mysqlDa = (() => {
    try {
      execFileSync('mysql', ['-uroot', '-e', 'SELECT 1'], { stdio: 'ignore' });
      return true;
    } catch {
      return false;
    }
  })();
  it.skipIf(!mysqlDa)('MySQL: komprimierte JSON-Datei mit allen Tabellen', () => {
    execFileSync('mysql', ['-uroot', '-e', 'DROP DATABASE IF EXISTS gl_sich; CREATE DATABASE gl_sich CHARACTER SET utf8mb4']);
    const w = einrichten({ typ: 'mysql', host: 'localhost', name: 'gl_sich', benutzer: 'root', passwort: '' });
    execFileSync('php', ['-r', `require '${w}/api/lib/db.php'; $d = new Db(['typ'=>'mysql','host'=>'localhost','name'=>'gl_sich','benutzer'=>'root','passwort'=>'']); $d->lauf("INSERT INTO geraete (id, schluessel_hash, erstellt_am) VALUES ('x','h',1)");`]);
    php(w);
    const sich = readdirSync(resolve(w, 'api/daten/sicherungen'));
    expect(sich).toHaveLength(1);
    expect(sich[0]).toMatch(/\.json\.gz$/);
    const dump = JSON.parse(gunzipSync(readFileSync(resolve(w, 'api/daten/sicherungen', sich[0]))).toString());
    expect(dump.geraete).toHaveLength(1);
    expect(Object.keys(dump)).toEqual(['geraete', 'becher', 'meldungen', 'zaehler']);
  });
});
