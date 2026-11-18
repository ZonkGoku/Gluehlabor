// Testhilfe: eine D1-ähnliche Datenbank auf node:sqlite, mit dem echten Schema (gleicher Code wie der Hetzner-Server).
import { resolve } from 'node:path';
import { oeffneDatenbank } from '../../server/sqlite-d1';
import type { D1Like } from '../src/db';

export function neueDb(): D1Like {
  return oeffneDatenbank(':memory:', resolve(process.cwd(), 'worker/migrations')).d1;
}
