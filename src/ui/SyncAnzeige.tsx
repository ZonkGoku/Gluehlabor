import { useEffect, useState } from 'preact/hooks';
import { db } from '../daten/db';
import { abonniereSync, type SyncInfo } from '../daten/sync';
import { useLive } from './hooks';
import { t } from '../i18n';

/** Kleine Statuszeile: wie viele Becher noch nicht beim Server sind und warum. */
export function SyncAnzeige() {
  const [info, setInfo] = useState<SyncInfo>({ zustand: 'bereit' });
  useEffect(() => abonniereSync(setInfo), []);
  const offen = useLive(() => db.eintraege.where('sync').equals('offen').count(), [], 0);

  let text: string;
  let art: 'synchron' | 'offen' | 'problem';
  if (info.zustand === 'kein-server') {
    // Es gibt keinen Server: alles bleibt auf diesem Gerät. Das soll man sehen, bevor man sich darauf verlässt.
    text = offen > 0 ? t('{n} nur lokal', { n: offen }) : t('nur lokal');
    art = 'offen';
  } else if (info.zustand === 'gesperrt') {
    text = t('Gerät gesperrt');
    art = 'problem';
  } else if (info.zustand === 'fehler') {
    text = offen > 0 ? t('{n} lokal · Sync-Fehler', { n: offen }) : t('Sync-Fehler');
    art = 'problem';
  } else if (offen === 0) {
    text = info.zustand === 'offline' ? t('offline') : t('synchron');
    art = 'synchron';
  } else if (info.zustand === 'laeuft') {
    text = t('{n} lokal · sendet', { n: offen });
    art = 'offen';
  } else {
    text = info.zustand === 'offline' ? t('{n} lokal · offline', { n: offen }) : t('{n} lokal', { n: offen });
    art = 'offen';
  }

  return (
    <a class="sync" href="#/profil" data-zustand={art} title={info.meldung ? t(info.meldung) : ''}>
      {text}
    </a>
  );
}
