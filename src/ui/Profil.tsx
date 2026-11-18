// Profil dieses Geräts: Name, Verbindung zum Community-Server, Prüfstelle.
import { useEffect, useState } from 'preact/hooks';
import { api, ApiFehler } from '../daten/api';
import { HAT_SERVER } from '../daten/config';
import { db, holeGeraet, leseEinstellung, schreibeEinstellung, setzeName } from '../daten/db';
import { abonniereSync, synchronisiere, type SyncInfo } from '../daten/sync';
import { GRENZEN, pruefeName } from '../lib/community';
import { Betreiber } from './bausteine';
import { useGeraetId, useName } from './daten';
import { useLive } from './hooks';
import { t, tn } from '../i18n';

const VERBINDUNG: Record<SyncInfo['zustand'], string> = {
  bereit: 'Verbunden. Neue Becher gehen automatisch zum Server.',
  laeuft: 'Synchronisiere …',
  offline: 'Gerade kein Netz. Becher bleiben auf dem Gerät und gehen später zum Server.',
  'kein-server': 'Kein Community-Server eingerichtet. Alles bleibt auf diesem Gerät.',
  fehler: 'Der Server hat einen Fehler gemeldet.',
  gesperrt: 'Dieses Gerät wurde gesperrt.',
};

export function Profil() {
  const gespeicherterName = useName();
  const geraetId = useGeraetId();
  const [name, setName] = useState('');
  const [nameMeldung, setNameMeldung] = useState('');
  const [info, setInfo] = useState<SyncInfo>({ zustand: 'bereit' });
  const [code, setCode] = useState('');
  const [codeMeldung, setCodeMeldung] = useState('');
  const offen = useLive(() => db.eintraege.where('sync').equals('offen').count(), [], 0);
  const abgelehnt = useLive(() => db.eintraege.where('sync').equals('abgelehnt').count(), [], 0);
  const pruefstelle = useLive(() => leseEinstellung<boolean>('pruefstelle', false), [], false);
  const nameFehler = useLive(() => leseEinstellung<string>('nameFehler', ''), [], '');

  useEffect(() => abonniereSync(setInfo), []);
  useEffect(() => setName(gespeicherterName), [gespeicherterName]);

  const speichereName = async () => {
    const p = pruefeName(name);
    if (!p.ok) return setNameMeldung(t(p.grund));
    if (!p.name) return setNameMeldung(t('Bitte einen Namen eingeben.'));
    await setzeName(p.name);
    await schreibeEinstellung('nameFehler', '');
    setNameMeldung(t('Gespeichert: {name}', { name: p.name }));
    void synchronisiere();
  };

  const schalteFrei = async () => {
    setCodeMeldung(t('Prüfe …'));
    try {
      await api('/api/pruefstelle', { methode: 'POST', geraet: await holeGeraet(), body: { code: code.trim() } });
      await schreibeEinstellung('pruefstelle', true);
      setCode('');
      setCodeMeldung(t('Dieses Gerät ist jetzt Prüfstelle.'));
      void synchronisiere();
    } catch (err) {
      if (err instanceof ApiFehler) setCodeMeldung(t(err.message));
      else setCodeMeldung(t('Kein Netz. Bitte später erneut versuchen.'));
    }
  };

  return (
    <>
      <div class="seitenkopf">
        <div>
          <p class="eyebrow">{t('Anonym, ohne Konto')}</p>
          <h1>{t('Profil')}</h1>
        </div>
      </div>
      <div class="raster">
        <section class="karte seite" style={{ padding: '18px' }}>
          <h2 style={{ margin: 0 }}>{t('Dein Name · nötig zum Bewerten')}</h2>
          <p style={{ margin: '8px 0 0' }}>
            {t('Er steht öffentlich neben deinen Bewertungen. Wenn du dir zum ersten Mal einen Namen gibst, gilt er auch für Becher, die du schon abgegeben hast. Ohne Namen kannst du nicht bewerten. Ein Spitzname reicht, besser kein voller echter Name. Ein Konto brauchst du nicht.')}
          </p>
          <label for="name">{t('Name oder Spitzname')}</label>
          <input
            id="name"
            class="feld"
            type="text"
            maxLength={GRENZEN.name}
            autocomplete="nickname"
            value={name}
            onInput={(e) => {
              setName((e.target as HTMLInputElement).value);
              setNameMeldung('');
            }}
            onKeyDown={(e) => e.key === 'Enter' && void speichereName()}
          />
          <div class="knopfreihe">
            <button class="knopf primaer" onClick={() => void speichereName()}>
              {t('Speichern')}
            </button>
          </div>
          {(nameMeldung || nameFehler) && <div class="meldung">{nameMeldung || t('Der Server hat den Namen abgelehnt: {grund}', { grund: t(nameFehler) })}</div>}
        </section>

        <section class="karte seite" style={{ padding: '18px' }}>
          <h2 style={{ margin: 0 }}>{t('Verbindung')}</h2>
          <p style={{ margin: '8px 0 0' }}>{t(VERBINDUNG[info.zustand])}</p>
          {info.meldung && <div class="meldung">{t(info.meldung)}</div>}
          <div class="knopfreihe">
            <button class="knopf" disabled={!HAT_SERVER} onClick={() => void synchronisiere()}>
              {t('Jetzt synchronisieren ({n} offen)', { n: offen })}
            </button>
          </div>
          {abgelehnt > 0 && (
            <p class="meldung" style={{ color: 'var(--warnung)' }}>
              {tn(abgelehnt, '{n} Becher wurde vom Server abgelehnt und bleibt nur auf diesem Gerät.', '{n} Becher wurden vom Server abgelehnt und bleiben nur auf diesem Gerät.')}
            </p>
          )}
          <p style={{ fontSize: '12.5px' }}>
            {t('Geräte-Kennung:')}{' '}
            <span class="mono" style={{ wordBreak: 'break-all', userSelect: 'all' }}>
              {geraetId ?? t('wird beim ersten Becher angelegt')}
            </span>
            . {t('Sie ist zufällig und enthält keine persönlichen Daten. Mit ihr können wir auf Wunsch deinen Namen oder deine Bewertungen löschen, siehe')} <a href="#/datenschutz">{t('Datenschutz')}</a>.
          </p>
        </section>

        <section class="karte seite" style={{ padding: '18px' }}>
          <h2 style={{ margin: 0 }}>{t('Prüfstelle · nur David & Philip')}</h2>
          {pruefstelle ? (
            <>
              <p style={{ margin: '8px 0 0' }}>{t('Dieses Gerät ist als Prüfstelle freigeschaltet. Eure Bewertungen tragen das Siegel „Prüfstelle" und zählen in der Wertung der Prüfstelle.')}</p>
              <div class="knopfreihe">
                <a class="knopf" href="#/moderation" style={{ display: 'inline-flex', alignItems: 'center', textDecoration: 'none', color: 'inherit' }}>
                  {t('Moderation öffnen')}
                </a>
              </div>
            </>
          ) : (
            <>
              <p style={{ margin: '8px 0 0' }}>
                {t('Mit dem Prüfstellen-Code tragen eure Bewertungen das Siegel „Prüfstelle". Alle anderen erscheinen als Community.')}
              </p>
              <label for="code">{t('Prüfstellen-Code')}</label>
              <input
                id="code"
                class="feld"
                type="password"
                autocomplete="off"
                disabled={!HAT_SERVER}
                value={code}
                onInput={(e) => setCode((e.target as HTMLInputElement).value)}
              />
              <div class="knopfreihe">
                <button class="knopf" disabled={!HAT_SERVER || !code.trim()} onClick={() => void schalteFrei()}>
                  {t('Freischalten')}
                </button>
              </div>
              {codeMeldung && <div class="meldung">{codeMeldung}</div>}
            </>
          )}
        </section>

      </div>
      <Betreiber />
    </>
  );
}
