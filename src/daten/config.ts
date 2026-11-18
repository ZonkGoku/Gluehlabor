// Adresse des Community-Servers (Cloudflare Worker, siehe worker/).
// Leer = es gibt keinen Server; die App arbeitet dann nur lokal.
// Für Entwicklung: VITE_API_URL=http://localhost:8787 npm run dev
export const API_URL: string = (
  ((import.meta.env.VITE_API_URL as string | undefined) ?? '') || ''
).replace(/\/+$/, '');
