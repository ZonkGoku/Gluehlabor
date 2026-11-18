import { useEffect, useState } from 'preact/hooks';
import { db } from '../daten/db';
import { abonniereSync, type SyncInfo } from '../daten/sync';
import { useHatToken } from './daten';
import { useLive } from './hooks';

/** Kleine Statuszeile: wie viele Becher noch nicht im Repo sind und warum. */
export function SyncAnzeige() {
  const [info, setInfo] = useState<SyncInfo>({ zustand: 'bereit' });
  useEffect(() => abonniereSync(setInfo), []);
  const hatToken = useHatToken();
  const offen = useLive(() => db.eintraege.where('sync').equals('offen').count(), [], 0);

  let text: string;
  let art: 'synchron' | 'offen' | 'problem';
  if (!hatToken) {
    // Ohne Token bleibt alles auf diesem Gerät. Das soll man sehen, bevor man sich darauf verlässt.
    text = offen > 0 ? `${offen} nur lokal · kein Token` : 'nur lokal · kein Token';
    art = 'problem';
  } else if (info.zustand === 'token-ungueltig') {
    text = `${offen} lokal · Token ungültig`;
    art = 'problem';
  } else if (info.zustand === 'fehler') {
    text = `${offen} lokal · Sync-Fehler`;
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
