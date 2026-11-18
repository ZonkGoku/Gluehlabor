// Liefert die gebaute App (dist/) aus. Klein gehalten: Dateien lesen, Typ und Zwischenspeicher setzen, Pfade absichern.
import { readFile, stat } from 'node:fs/promises';
import { resolve, sep, extname } from 'node:path';

const TYPEN: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.webmanifest': 'application/manifest+json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
  '.woff': 'font/woff',
  '.txt': 'text/plain; charset=utf-8',
  '.map': 'application/json; charset=utf-8',
};

export const CSP = [
  "default-src 'self'",
  "script-src 'self'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "font-src 'self'",
  "connect-src 'self'",
  "worker-src 'self'",
  "manifest-src 'self'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  "object-src 'none'",
].join('; ');

export const SICHERHEITSKOEPFE: Record<string, string> = {
  'X-Robots-Tag': 'noindex, nofollow, noarchive, nosnippet, noimageindex',
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'no-referrer',
  'X-Frame-Options': 'DENY',
  'Cross-Origin-Opener-Policy': 'same-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=(self), payment=()',
};

export interface Datei {
  status: number;
  kopf: Record<string, string>;
  inhalt: Buffer | null;
}

/** Diese Dateien dürfen nie veraltet aus dem Zwischenspeicher kommen: sonst bleiben Updates der installierten App hängen. */
const IMMER_PRUEFEN = /^\/(index\.html|sw\.js|registerSW\.js|manifest\.webmanifest)$/;

function cache(pfad: string): string {
  if (pfad === '/' || IMMER_PRUEFEN.test(pfad)) return 'no-cache';
  if (pfad.startsWith('/assets/') || /^\/workbox-[\w-]+\.js$/.test(pfad)) return 'public, max-age=31536000, immutable';
  return 'public, max-age=86400';
}

/** Löst eine URL zu einer Datei unterhalb von `wurzel` auf. null = nicht erlaubt oder nicht gefunden. */
export async function ladeDatei(wurzel: string, urlPfad: string, ifNoneMatch?: string): Promise<Datei> {
  const w = resolve(wurzel);
  let pfad: string;
  try {
    pfad = decodeURIComponent(urlPfad);
  } catch {
    return { status: 400, kopf: {}, inhalt: null };
  }
  if (pfad.includes('\0') || pfad.includes('\\')) return { status: 400, kopf: {}, inhalt: null };
  if (!pfad.startsWith('/')) pfad = '/' + pfad;
  const logisch = pfad === '/' ? '/index.html' : pfad;
  const voll = resolve(w, '.' + logisch);
  if (voll !== w && !voll.startsWith(w + sep)) return { status: 404, kopf: {}, inhalt: null };

  try {
    const st = await stat(voll);
    if (!st.isFile()) return { status: 404, kopf: {}, inhalt: null };
    const etag = `W/"${st.size.toString(16)}-${Math.floor(st.mtimeMs).toString(16)}"`;
    const kopf: Record<string, string> = {
      'Content-Type': TYPEN[extname(voll).toLowerCase()] ?? 'application/octet-stream',
      'Cache-Control': cache(pfad),
      ETag: etag,
      'Content-Length': String(st.size),
    };
    if (extname(voll).toLowerCase() === '.html') kopf['Content-Security-Policy'] = CSP;
    if (ifNoneMatch && ifNoneMatch === etag) {
      delete kopf['Content-Length'];
      return { status: 304, kopf, inhalt: null };
    }
    return { status: 200, kopf, inhalt: await readFile(voll) };
  } catch {
    return { status: 404, kopf: {}, inhalt: null };
  }
}
