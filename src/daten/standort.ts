// Stadt automatisch aus dem Standort: bleibt auf dem Gerät (es wird nur die nächste Stadt aus data/orte.json gesucht, nichts gesendet).
// Gefragt wird höchstens einmal von selbst (nur wer noch keine Stadt hat); wer den Standort schon erlaubt hat, bekommt die Stadt still.
import { naechsteOrte } from '../lib/ortssuche';
import { ladeOrte } from './orte';

const MERKER = 'gluehlabor.standortGefragt';
const MAX_KM = 15;

export type StandortStatus = 'granted' | 'prompt' | 'denied' | 'unbekannt';

export async function standortStatus(): Promise<StandortStatus> {
  try {
    if (!navigator.geolocation || !navigator.permissions) return 'unbekannt';
    return (await navigator.permissions.query({ name: 'geolocation' })).state as StandortStatus;
  } catch {
    return 'unbekannt';
  }
}

export function schonGefragt(): boolean {
  try {
    return localStorage.getItem(MERKER) === '1';
  } catch {
    return true;
  }
}

export function merkeGefragt(): void {
  try {
    localStorage.setItem(MERKER, '1');
  } catch {
    /* egal */
  }
}

/** Nächste Stadt (höchstens 15 km entfernt) oder null, wenn der Standort fehlt, abgelehnt wird oder nichts in der Nähe liegt. */
export function holeNaechsteStadt(): Promise<string | null> {
  return new Promise((ok) => {
    if (!navigator.geolocation) return ok(null);
    navigator.geolocation.getCurrentPosition(
      async (p) => {
        try {
          const n = naechsteOrte(await ladeOrte(), p.coords.latitude, p.coords.longitude, 1)[0];
          ok(n && n.km <= MAX_KM ? n.name : null);
        } catch {
          ok(null);
        }
      },
      () => ok(null),
      { enableHighAccuracy: false, timeout: 8_000, maximumAge: 5 * 60_000 },
    );
  });
}

/**
 * Entscheidet, ob und wie die Stadt von selbst gesetzt wird. Ergebnis: Stadt oder null (nichts tun).
 * `hatStadt`: es gibt schon eine gemerkte Stadt (dann wird nur still nachgesehen, nie gefragt).
 */
export async function automatischeStadt(hatStadt: boolean): Promise<string | null> {
  const status = await standortStatus();
  if (status === 'granted') return holeNaechsteStadt();
  if (status === 'prompt' && !hatStadt && !schonGefragt()) {
    merkeGefragt();
    return holeNaechsteStadt();
  }
  return null;
}
