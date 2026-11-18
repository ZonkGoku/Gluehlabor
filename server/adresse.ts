// Woher kommt eine Anfrage? Hinter einem Reverse-Proxy sieht der Server nur den Proxy.
// Der Proxy meldet die echte Adresse im Header X-Real-IP. Dem Header wird nur vertraut,
// wenn die Verbindung aus dem eigenen Rechner oder Docker-Netz kommt (private Adresse):
// wer direkt aus dem Internet verbindet, kann ihn nicht fälschen.

const PRIVAT = [/^127\./, /^10\./, /^192\.168\./, /^172\.(1[6-9]|2\d|3[01])\./, /^::1$/, /^f[cd][0-9a-f]{2}:/i, /^fe80:/i];

export const normalisiere = (ip: string): string => ip.trim().replace(/^::ffff:/i, '');
export const istPrivat = (ip: string): boolean => PRIVAT.some((r) => r.test(normalisiere(ip)));

/** Echte Adresse des Absenders oder null, wenn sie sich nicht sicher bestimmen lässt. */
export function ermittleAdresse(socketAdresse: string | undefined, realIp: string | string[] | undefined): string | null {
  if (socketAdresse && !istPrivat(socketAdresse)) return normalisiere(socketAdresse);
  const kopf = Array.isArray(realIp) ? realIp[0] : realIp;
  if (kopf && /^[0-9a-f:.]{3,45}$/i.test(kopf.trim())) return normalisiere(kopf);
  return null;
}
