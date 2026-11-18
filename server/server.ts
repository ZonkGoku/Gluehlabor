// HTTP-Server: liefert die App (dist/) und die API (worker/src/app.ts) aus einem Prozess, same-origin.
import { createServer, type IncomingMessage, type Server, type ServerResponse } from 'node:http';
import { existsSync, mkdirSync, readdirSync, rmSync } from 'node:fs';
import { resolve } from 'node:path';
import { handle, raeumeAuf, type Env } from '../worker/src/app';
import { ermittleAdresse } from './adresse';
import { ladeDatei, SICHERHEITSKOEPFE } from './static';
import type { Datenbank } from './sqlite-d1';

export interface Einstellungen {
  db: Datenbank;
  dist: string;
  env: Omit<Env, 'DB'>;
  /** Öffentliche Adresse (z. B. https://gluehlabor.de), nur für erlaubte Ursprünge. */
  maxBody?: number;
}

const MAX_BODY = 70_000;

async function lies(req: IncomingMessage, max: number): Promise<Buffer | null> {
  const teile: Buffer[] = [];
  let n = 0;
  for await (const t of req) {
    n += (t as Buffer).length;
    if (n > max) return null;
    teile.push(t as Buffer);
  }
  return Buffer.concat(teile);
}

export function baueServer(e: Einstellungen): Server {
  const env: Env = { ...e.env, DB: e.db.d1 };
  return createServer(async (req: IncomingMessage, res: ServerResponse) => {
    try {
      const host = req.headers.host ?? 'localhost';
      const url = new URL(req.url ?? '/', `http://${host}`);
      const ip = ermittleAdresse(req.socket.remoteAddress, req.headers['x-real-ip']);
      const https = req.headers['x-forwarded-proto'] === 'https';
      const kopf: Record<string, string> = { ...SICHERHEITSKOEPFE };
      if (https) kopf['Strict-Transport-Security'] = 'max-age=31536000';

      if (url.pathname.startsWith('/api/')) {
        const headers = new Headers();
        for (const [k, v] of Object.entries(req.headers)) if (typeof v === 'string' && k !== 'x-real-ip' && k !== 'cf-connecting-ip') headers.set(k, v);
        headers.set('CF-Connecting-IP', ip ?? 'unbekannt');
        const hatBody = !['GET', 'HEAD', 'OPTIONS'].includes(req.method ?? 'GET');
        const body = hatBody ? await lies(req, e.maxBody ?? MAX_BODY) : undefined;
        if (body === null) {
          res.writeHead(413, { ...kopf, 'Content-Type': 'application/json' }).end('{"fehler":"Anfrage zu groß."}');
          return;
        }
        // Gleicher Ursprung (Origin passt zum Host) ist immer erlaubt; weitere Ursprünge stehen in ERLAUBTE_URSPRUENGE.
        const ursprung = req.headers.origin;
        const gleich = ursprung && /^https?:\/\//.test(ursprung) && new URL(ursprung).host === host;
        const anfrageEnv = gleich ? { ...env, ERLAUBTE_URSPRUENGE: `${env.ERLAUBTE_URSPRUENGE ?? ''},${ursprung}` } : env;
        const antwort = await handle(
          new Request(url, { method: req.method, headers, body: hatBody ? new Uint8Array(body!) : undefined }),
          anfrageEnv,
        );
        const aus: Record<string, string> = { ...kopf };
        antwort.headers.forEach((v, k) => (aus[k] = v));
        if (url.pathname === '/api/status') aus['X-Adresse-Erkannt'] = ip ? 'ja' : 'nein';
        if (url.pathname === '/api/becher' && req.method === 'GET') aus['cache-control'] = 'no-store';
        res.writeHead(antwort.status, aus).end(Buffer.from(await antwort.arrayBuffer()));
        return;
      }

      if (req.method !== 'GET' && req.method !== 'HEAD') {
        res.writeHead(405, { ...kopf, Allow: 'GET, HEAD' }).end();
        return;
      }
      const datei = await ladeDatei(e.dist, url.pathname, req.headers['if-none-match']);
      res.writeHead(datei.status, { ...kopf, ...datei.kopf });
      res.end(req.method === 'HEAD' ? undefined : (datei.inhalt ?? undefined));
    } catch (fehler) {
      console.error('Fehler:', fehler instanceof Error ? fehler.message : fehler);
      if (!res.headersSent) res.writeHead(500, { 'Content-Type': 'text/plain' });
      res.end('Interner Fehler.');
    }
  });
}

/** Sichert die Datenbank konsistent (auch während des Betriebs) und behält die letzten `behalten` Sicherungen. */
export function sichere(db: Datenbank, ordner: string, jetzt = new Date(), behalten = 14): string {
  mkdirSync(ordner, { recursive: true });
  const name = `gluehlabor-${jetzt.toISOString().slice(0, 10)}.sqlite`;
  const ziel = resolve(ordner, name);
  if (existsSync(ziel)) rmSync(ziel);
  db.sqlite.exec(`VACUUM INTO '${ziel.replace(/'/g, "''")}'`);
  const alle = readdirSync(ordner).filter((f) => /^gluehlabor-\d{4}-\d{2}-\d{2}\.sqlite$/.test(f)).sort();
  for (const alt of alle.slice(0, Math.max(0, alle.length - behalten))) rmSync(resolve(ordner, alt));
  return ziel;
}

export async function taeglich(db: Datenbank, sicherungen: string): Promise<void> {
  await raeumeAuf(db.d1, Date.now());
  sichere(db, sicherungen);
}
