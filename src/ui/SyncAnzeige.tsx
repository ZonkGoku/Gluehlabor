import { useEffect, useState } from 'preact/hooks';
import { db } from '../daten/db';
import { abonniereSync, type SyncInfo } from '../daten/sync';
import { useLive } from './hooks';

/** Kleine Statuszeile: wie viele Becher noch nicht beim Server sind und warum. */
export function SyncAnzeige() {
  const [info, setInfo] = useState<SyncInfo>({ zustand: 'bereit' });
  useEffect(() => abonniereSync(setInfo), []);
  const offen = useLive(() => db.eintraege.where('sync').equals('offen').count(), [], 0);

  let text: string;
  let art: 'synchron' | 'offen' | 'problem';
  if (info.zustand === 'kein-server') {
    // Es gibt keinen Server: alles bleibt auf diesem Gerät. Das soll man sehen, bevor man sich darauf verlässt.
    text = offen > 0 ? `${offen} nur lokal` : 'nur lokal';
    art = 'offen';
  } else if (info.zustand === 'gesperrt') {
    text = 'Gerät gesperrt';
    art = 'problem';
  } else if (info.zustand === 'fehler') {
    text = offen > 0 ? `${offen} lokal · Sync-Fehler` : 'Sync-Fehler';
    art = 'problem';
  } else if (offen === 0) {
    text = info.zustand === 'offline' ? 'offline' : 'synchron';
    art = 'synchron';
  } else if (info.zustand === 'laeuft') {
    text = `${offen} lokal · sendet`;
    art = 'offen';
  } else {
    text = info.zustand === 'offline' ? `${offen} lokal · offline` : `${offen} lokal`;
    art = 'offen';
  }

  return (
    <a class="sync" href="#/einstellungen" data-zustand={art} title={info.meldung ?? ''}>
      {text}
    </a>
  );
}
