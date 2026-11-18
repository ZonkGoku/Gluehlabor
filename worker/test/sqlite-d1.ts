// Testhilfe: eine D1-ähnliche Datenbank auf node:sqlite, mit dem echten Schema.
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import type { D1Like, D1Stmt } from '../src/db';

export function neueDb(): D1Like {
  const db = new DatabaseSync(':memory:');
  db.exec(readFileSync(resolve(process.cwd(), 'worker/migrations/0001_init.sql'), 'utf8'));
  const stmt = (sql: string, werte: unknown[] = []): D1Stmt => ({
    bind: (...w) => stmt(sql, w),
    first: async <T>() => ((db.prepare(sql).get(...(werte as never[])) as T | undefined) ?? null),
    all: async <T>() => ({ results: db.prepare(sql).all(...(werte as never[])) as T[] }),
    run: async () => {
      const r = db.prepare(sql).run(...(werte as never[]));
      return { meta: { changes: Number(r.changes) } };
    },
  });
  return {
    prepare: (sql) => stmt(sql),
    batch: async (s) => {
      for (const x of s) await x.run();
      return [];
    },
  };
}
