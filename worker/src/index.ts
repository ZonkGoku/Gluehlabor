import { handle, raeumeAuf, type Env } from './app';

interface Kontext {
  waitUntil(p: Promise<unknown>): void;
}
interface Zwischenspeicher {
  match(r: Request): Promise<Response | undefined>;
  put(r: Request, res: Response): Promise<void>;
}

export default {
  async fetch(request: Request, env: Env, ctx: Kontext): Promise<Response> {
    // Die öffentliche Liste wird am Rand zwischengespeichert (5 s). Das schont die Datenbank,
    // wenn viele Geräte gleichzeitig synchronisieren.
    const cache = (globalThis as { caches?: { default?: Zwischenspeicher } }).caches?.default;
    const url = new URL(request.url);
    const cachebar = request.method === 'GET' && url.pathname === '/api/becher' && cache;
    if (cachebar) {
      const treffer = await cache.match(request);
      if (treffer) return treffer;
    }
    const antwort = await handle(request, env);
    if (cachebar && antwort.status === 200) ctx.waitUntil(cache.put(request, antwort.clone()));
    return antwort;
  },

  /** Täglicher Aufräumlauf (Zeitplan in wrangler.toml): löscht abgelaufene Zähler. */
  async scheduled(_ereignis: unknown, env: Env): Promise<void> {
    await raeumeAuf(env.DB, Date.now());
  },
};
