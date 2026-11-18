// Zuletzt gewählte Orte dieses Geräts (Stadt, optional Markt), die neuesten zuerst. Bleibt auf dem Gerät.
export interface ZuletztOrt {
  stadt: string;
  markt?: string;
}

const KEY = 'gluehlabor.zuletzt';
const MAX = 6;

export function leseZuletzt(): ZuletztOrt[] {
  try {
    const x = JSON.parse(localStorage.getItem(KEY) ?? '[]');
    return Array.isArray(x) ? x.filter((o): o is ZuletztOrt => typeof o?.stadt === 'string' && o.stadt !== '').slice(0, MAX) : [];
  } catch {
    return [];
  }
}

export function merkeOrt(stadt: string, markt?: string): void {
  const m = markt?.trim() || undefined;
  const neu = [{ stadt, ...(m ? { markt: m } : {}) }, ...leseZuletzt().filter((o) => !(o.stadt === stadt && (o.markt ?? '') === (m ?? '')))].slice(0, MAX);
  try {
    localStorage.setItem(KEY, JSON.stringify(neu));
  } catch {
    /* privater Modus: dann gilt es nur bis zum Neuladen nicht */
  }
}
