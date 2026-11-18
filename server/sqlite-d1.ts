// SQLite-Datenbank für den eigenen Server. Stellt dieselbe kleine Schnittstelle bereit wie Cloudflare D1
// (worker/src/db.ts), damit die Server-Logik in worker/src/app.ts unverändert läuft.
import { mkdirSync, readdirSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { DatabaseSync, type StatementSync } from 'node:sqlite';
import type { D1Like, D1Stmt } from '../worker/src/db';

export interface Datenbank {
  sqlite: DatabaseSync;
  d1: D1Like;
  schliessen(): void;
}

/** Wendet alle noch nicht angewandten Migrationen (worker/migrations/*.sql) der Reihe nach an. */
export function migriere(sqlite: DatabaseSync, ordner: string): string[] {
  sqlite.exec('CREATE TABLE IF NOT EXISTS _migrationen (name TEXT PRIMARY KEY, angewandt_am INTEGER NOT NULL)');
  const schon = new Set((sqlite.prepare('SELECT name FROM _migrationen').all() as { name: string }[]).map((r) => r.name));
  const neu: string[] = [];
  for (const datei of readdirSync(ordner).filter((f) => f.endsWith('.sql')).sort()) {
    if (schon.has(datei)) continue;
    sqlite.exec('BEGIN');
    try {
      sqlite.exec(readFileSync(resolve(ordner, datei), 'utf8'));
      sqlite.prepare('INSERT INTO _migrationen (name, angewandt_am) VALUES (?, ?)').run(datei, Date.now());
      sqlite.exec('COMMIT');
      neu.push(datei);
    } catch (fehler) {
      sqlite.exec('ROLLBACK');
      throw new Error(`Migration ${datei} fehlgeschlagen: ${String(fehler)}`);
    }
  }
  return neu;
}

export function oeffneDatenbank(datei: string, migrationenOrdner: string): Datenbank {
  if (datei !== ':memory:') mkdirSync(dirname(datei), { recursive: true });
  const sqlite = new DatabaseSync(datei);
  // WAL: Lesen blockiert Schreiben nicht. NORMAL reicht bei WAL (ein Absturz verliert höchstens den letzten Commit, beschädigt nichts).
  sqlite.exec('PRAGMA journal_mode = WAL; PRAGMA synchronous = NORMAL; PRAGMA busy_timeout = 5000; PRAGMA foreign_keys = ON;');
  migriere(sqlite, migrationenOrdner);

  const cache = new Map<string, StatementSync>();
  const vorbereitet = (sql: string) => {
    let s = cache.get(sql);
    if (!s) cache.set(sql, (s = sqlite.prepare(sql)));
    return s;
  };
  const stmt = (sql: string, werte: unknown[] = []): D1Stmt => ({
    bind: (...w) => stmt(sql, w),
    first: async <T>() => (vorbereitet(sql).get(...(werte as never[])) as T | undefined) ?? null,
    all: async <T>() => ({ results: vorbereitet(sql).all(...(werte as never[])) as T[] }),
    run: async () => ({ meta: { changes: Number(vorbereitet(sql).run(...(werte as never[])).changes) } }),
  });
  const d1: D1Like = {
    prepare: (sql) => stmt(sql),
    batch: async (liste) => {
      sqlite.exec('BEGIN');
      try {
        for (const s of liste) await s.run();
        sqlite.exec('COMMIT');
      } catch (fehler) {
        sqlite.exec('ROLLBACK');
        throw fehler;
      }
      return [];
    },
  };
  return { sqlite, d1, schliessen: () => sqlite.close() };
}
