// Prüfziel der Server-Tests. Dieselben Tests laufen gegen
//   ts         die TypeScript-Fassung (worker/src/app.ts, in-process, node:sqlite)      Standard
//   php-sqlite die PHP-Fassung fürs Webhosting (php/api), echter php-Server, SQLite
//   php-mysql  dieselbe, mit MariaDB/MySQL (braucht laufenden Server, siehe unten)
// Aufruf: API_ZIEL=php-sqlite npx vitest run worker/test/app.test.ts
// MariaDB: mysqld läuft lokal, Benutzer root ohne Passwort über den Socket, Datenbank "gl_test" wird je Test neu angelegt.
import { execFileSync, spawn, type ChildProcess } from 'node:child_process';
import { cpSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { handle as handleTs, type Env } from '../src/app';
import type { D1Like, D1Stmt } from '../src/db';
import { neueDb } from './sqlite-d1';

export const ZIEL = (process.env.API_ZIEL ?? 'ts') as 'ts' | 'php-sqlite' | 'php-mysql';

let server: ChildProcess | undefined;
let wurzel = '';
let port = 0;
let zaehler = 0;

export async function zielStart(): Promise<void> {
  if (ZIEL === 'ts') return;
  wurzel = mkdtempSync(resolve(tmpdir(), 'gl-php-'));
  cpSync(resolve(process.cwd(), 'php/api'), resolve(wurzel, 'api'), { recursive: true });
  writeFileSync(
    resolve(wurzel, 'router.php'),
    `<?php $p = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH); if (str_starts_with($p, '/api/')) { require __DIR__ . '/api/index.php'; return true; } return false;`,
  );
  port = 20000 + Math.floor(Math.random() * 20000);
  server = spawn('php', ['-S', `127.0.0.1:${port}`, '-t', wurzel, resolve(wurzel, 'router.php')], { stdio: 'ignore' });
  for (let i = 0; i < 50; i++) {
    try {
      await fetch(`http://127.0.0.1:${port}/api/status`);
      return;
    } catch {
      await new Promise((r) => setTimeout(r, 100));
    }
  }
  throw new Error('php-Server startet nicht');
}

export function zielStop(): void {
  server?.kill();
  if (wurzel) rmSync(wurzel, { recursive: true, force: true });
}

const NAMEN: Record<string, string> = { ADMIN_TOKEN: 'admin_token', PRUEFSTELLE_CODE: 'pruefstelle_code', IP_SALT: 'ip_salz' };

/** Ein mysql-Befehl über die Kommandozeile. Nur für Tests: Werte werden eingesetzt und maskiert. */
function mysqlLauf(sql: string): Record<string, unknown>[] {
  const aus = execFileSync('mysql', ['-uroot', '--batch', '--raw', 'gl_test', '-e', sql], { encoding: 'utf8' });
  const zeilen = aus.split('\n').filter(Boolean);
  if (zeilen.length === 0) return [];
  const kopf = zeilen[0].split('\t');
  return zeilen.slice(1).map((z) =>
    Object.fromEntries(
      z.split('\t').map((w, i) => [kopf[i], w === 'NULL' ? null : /^-?\d+(\.\d+)?$/.test(w) ? Number(w) : w]),
    ),
  );
}
const maskiere = (w: unknown) => (w === null || w === undefined ? 'NULL' : typeof w === 'number' ? String(w) : `'${String(w).replace(/\\/g, '\\\\').replace(/'/g, "\\'")}'`);
function mysqlStmt(sql: string, werte: unknown[] = []): D1Stmt {
  const fertig = () => {
    let i = 0;
    return sql.replace(/\?/g, () => maskiere(werte[i++]));
  };
  return {
    bind: (...w) => mysqlStmt(sql, w),
    first: async <T>() => (mysqlLauf(fertig())[0] as T | undefined) ?? null,
    all: async <T>() => ({ results: mysqlLauf(fertig()) as T[] }),
    run: async () => ({ meta: { changes: 0 } }),
  };
}
const mysqlDb: D1Like = { prepare: (s) => mysqlStmt(s), batch: async () => [] };

function sqliteLesen(datei: string): D1Like {
  const stmt = (sql: string, werte: unknown[] = []): D1Stmt => ({
    bind: (...w) => stmt(sql, w),
    first: async <T>() => {
      const db = new DatabaseSync(datei, { readOnly: true });
      try {
        return (db.prepare(sql).get(...(werte as never[])) as T | undefined) ?? null;
      } finally {
        db.close();
      }
    },
    all: async <T>() => {
      const db = new DatabaseSync(datei, { readOnly: true });
      try {
        return { results: db.prepare(sql).all(...(werte as never[])) as T[] };
      } finally {
        db.close();
      }
    },
    run: async () => ({ meta: { changes: 0 } }),
  });
  return { prepare: (s) => stmt(s), batch: async () => [] };
}

/** Frische Datenbank und frischer Env für einen Test. Setzen auf env.X schreibt die Konfiguration des php-Servers neu. */
export function neuerEnv(basis: Omit<Env, 'DB'>): Env {
  if (ZIEL === 'ts') return { DB: neueDb(), ...basis };
  const datei = resolve(wurzel, `db-${++zaehler}.sqlite`);
  let db: Record<string, unknown>;
  if (ZIEL === 'php-mysql') {
    execFileSync('mysql', ['-uroot', '-e', 'DROP DATABASE IF EXISTS gl_test; CREATE DATABASE gl_test CHARACTER SET utf8mb4']);
    db = { typ: 'mysql', host: 'localhost', name: 'gl_test', benutzer: 'root', passwort: '' };
  } else {
    db = { typ: 'sqlite', datei };
  }
  const werte: Record<string, unknown> = { testmodus: true, db };
  const schreibe = () => writeFileSync(resolve(wurzel, 'api/privat/cfg.json'), JSON.stringify(werte));
  writeFileSync(resolve(wurzel, 'api/privat/config.php'), `<?php return json_decode(file_get_contents(__DIR__ . '/cfg.json'), true);`);
  const setze = (k: string, v: unknown) => {
    if (k === 'ERLAUBTE_URSPRUENGE') werte.erlaubte_ursprunge = typeof v === 'string' ? v.split(',') : [];
    else if (NAMEN[k]) {
      if (v === undefined) delete werte[NAMEN[k]];
      else werte[NAMEN[k]] = v;
    }
    schreibe();
  };
  for (const [k, v] of Object.entries(basis)) setze(k, v);
  const lese = ZIEL === 'php-mysql' ? mysqlDb : sqliteLesen(datei);
  return new Proxy({ ...basis, DB: lese } as Env, {
    set(ziel, k, v) {
      (ziel as unknown as Record<string, unknown>)[k as string] = v;
      setze(k as string, v);
      return true;
    },
  });
}

/** Wie handle(), aber gegen das gewählte Ziel. */
export async function ruft(request: Request, env: Env, jetzt: number): Promise<Response> {
  if (ZIEL === 'ts') return handleTs(request, env, jetzt);
  const url = new URL(request.url);
  const kopf = new Headers(request.headers);
  kopf.set('X-Test-Jetzt', String(jetzt));
  kopf.set('X-Test-IP', kopf.get('CF-Connecting-IP') ?? '');
  kopf.delete('CF-Connecting-IP');
  const body = request.method === 'GET' || request.method === 'HEAD' ? undefined : await request.text();
  return fetch(`http://127.0.0.1:${port}${url.pathname}${url.search}`, { method: request.method, headers: kopf, body });
}
