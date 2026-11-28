// „Was fehlt dir?“: freie Rückmeldung an die Betreiber. Anonym (nur die Geräte-Kennung für das Tageslimit); lesen kann sie nur die Prüfstelle.
import { api, ApiFehler } from './api';
import { mitGeraet } from './sync';
import { t } from '../i18n';

export interface Rueckmeldung {
  id: number;
  text: string;
  seite: string | null;
  erstellt_am: number;
  stimmung: number | null;
}

export async function sendeRueckmeldung(text: string, seite: string | null, stimmung: number | null = null): Promise<void> {
  await mitGeraet((geraet) => api('/api/feedback', { methode: 'POST', geraet, body: { text, seite, stimmung } }));
}

export async function ladeRueckmeldungen(): Promise<Rueckmeldung[]> {
  return (await mitGeraet((geraet) => api<{ rueckmeldungen: Rueckmeldung[] }>('/api/admin/feedback', { geraet }))).rueckmeldungen;
}

export function rueckmeldungFehler(err: unknown): string {
  if (err instanceof ApiFehler) return err.status === 401 ? t('Dieses Gerät ist keine Prüfstelle (mehr).') : t(err.message);
  return t('Kein Netz. Bitte später erneut versuchen.');
}
