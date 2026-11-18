// Wo der Community-Server erreichbar ist.
//
// Quelle: Build-Variable VITE_API_URL, sonst data/server.json (apiUrl).
//   leer            kein Server, die App arbeitet nur lokal
//   "/"             derselbe Ursprung wie die Seite (Betrieb auf dem eigenen Server: /api/…)
//   "https://…"     ein Server unter anderer Adresse
// Für Entwicklung: VITE_API_URL=http://localhost:8787 npm run dev
import server from '../../data/server.json';

const roh = ((((import.meta.env.VITE_API_URL as string | undefined) ?? '') || server.apiUrl || '') as string).trim();

/** Gibt es einen Community-Server? */
export const HAT_SERVER: boolean = roh !== '';

/** Vorsatz für alle Aufrufe. Leer bei "/", dann gehen sie an denselben Ursprung. */
export const API_BASIS: string = roh === '/' ? '' : roh.replace(/\/+$/, '');

/** Altlast: wird nur noch vom alten GitHub-Token-Formular in ui/Einstellungen.tsx gebraucht. Der Sync läuft über den Community-Server. */
export const REPO = { owner: 'ZonkGoku', name: 'Becherwerk', branch: 'main' } as const;
