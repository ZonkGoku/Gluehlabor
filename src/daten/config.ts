// Adresse des Community-Servers (Cloudflare Worker, siehe worker/).
// Leer = es gibt keinen Server; die App arbeitet dann nur lokal.
// Für Entwicklung: VITE_API_URL=http://localhost:8787 npm run dev
export const API_URL: string = (
  ((import.meta.env.VITE_API_URL as string | undefined) ?? '') || ''
).replace(/\/+$/, '');

/** Altlast: wird nur noch vom alten GitHub-Token-Formular in ui/Einstellungen.tsx gebraucht. Der Sync läuft über den Community-Server. */
export const REPO = { owner: 'ZonkGoku', name: 'Becherwerk', branch: 'main' } as const;
