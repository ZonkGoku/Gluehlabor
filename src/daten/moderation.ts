// Moderation im Browser für Prüfstellen-Geräte. Dieselben Endpunkte wie die Kommandozeile (npm run moderation),
// angemeldet mit dem Gerät statt mit dem Admin-Token.
import { api, ApiFehler } from './api';
import { holeGeraet } from './db';
import { holeBecher } from './sync';

export interface Meldung {
  id: string;
  anzahl: number;
  zuletzt: number;
  gruende: string | null;
  stand: string | null;
  markt: string | null;
  name: string | null;
  notiz: string | null;
  versteckt: number | null;
  geraet_id: string | null;
}

async function admin<T>(pfad: string, body?: unknown): Promise<T> {
  const geraet = await holeGeraet();
  return api<T>(`/api/admin/${pfad}`, { methode: body === undefined ? 'GET' : 'POST', geraet, body });
}

/** Wandelt Fehler in lesbaren Text. */
export function fehlerText(err: unknown): string {
  if (err instanceof ApiFehler) return err.status === 401 ? 'Dieses Gerät ist keine Prüfstelle (mehr).' : err.message;
  return 'Kein Netz. Bitte später erneut versuchen.';
}

export const ladeMeldungen = async () => (await admin<{ meldungen: Meldung[] }>('meldungen')).meldungen;

export async function verstecke(ids: string[], versteckt: boolean): Promise<void> {
  for (const id of ids) await admin('verstecken', { id, versteckt });
  await holeBecher();
}

export const verwirfMeldung = (id: string) => admin('meldung-verwerfen', { id });
export const sperreGeraet = async (geraet: string, gesperrt: boolean) => {
  await admin('sperren', { geraet, gesperrt });
  await holeBecher();
};
export const loescheGeraet = async (geraet: string, modus: 'name' | 'alles') => {
  await admin('loeschen', { geraet, modus });
  await holeBecher();
};

/** Benennt Bewertungen um oder führt Stände zusammen. */
export async function aendereStand(ids: string[], stand: string, markt: string, stadt: string): Promise<number> {
  let n = 0;
  for (let i = 0; i < ids.length; i += 200) {
    n += (await admin<{ betroffen: number }>('stand-aendern', { ids: ids.slice(i, i + 200), stand, markt, stadt })).betroffen;
  }
  await holeBecher();
  return n;
}

/** Zugang entziehen: alle anderen Geräte verlieren die Prüfstellen-Rechte. Danach den Code beim Server ändern. */
export async function entzieheZugang(): Promise<number> {
  const geraet = await holeGeraet();
  return (await admin<{ betroffen: number }>('pruefstelle-zuruecksetzen', { behalten: geraet.id })).betroffen;
}
