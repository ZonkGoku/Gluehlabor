// Profil dieses Geräts: Name, Verbindung zum Community-Server, Prüfstelle.
import { useEffect, useState } from 'preact/hooks';
import { api, ApiFehler } from '../daten/api';
import { HAT_SERVER } from '../daten/config';
import { db, leseEinstellung, schreibeEinstellung, setzeName } from '../daten/db';
import { abonniereSync, mitGeraet, synchronisiere, type SyncInfo } from '../daten/sync';
import { GRENZEN, pruefeName } from '../lib/community';
import { Betreiber } from './bausteine';
import { Gruppe } from './MenueListe';
import { KopfIcon } from './nacht/KopfIcon';
import { PassAbzeichen, PassKopf } from './Pass';
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
  const [nameAendern, setNameAendern] = useState(false);
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
    setNameAendern(false);
    void synchronisiere();
  };

  const schalteFrei = async () => {
    setCodeMeldung(t('Prüfe …'));
    try {
      await mitGeraet((geraet) => api('/api/pruefstelle', { methode: 'POST', geraet, body: { code: code.trim() } }));
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
      <div class="nm" style={{ marginBottom: '20px' }}>
        <PassKopf />
      </div>
      <a href="#/meine" class="nm glas rahmen-licht mb-4 flex min-h-[64px] items-center gap-3 rounded-3xl p-4 text-eis no-underline">
        <span class="min-w-0 flex-1">
          <b class="block text-[17px]">{t('Meine Bewertungen')}</b>
          <span class="block text-sm text-dunst">{t('Deine Rangliste, alle Bewertungen und Ändern')}</span>
        </span>
        <span aria-hidden="true" class="text-xl text-gold-300">→</span>
      </a>
      <div class="raster">
        {gespeicherterName && !nameAendern ? (
          <section class="karte seite" style={{ padding: '14px 18px', display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span style={{ flex: 1, minWidth: 0 }}>
              <small style={{ display: 'block', color: 'var(--text-2)' }}>{t('Dein Name')}</small>
              <b style={{ fontSize: '17px' }}>{gespeicherterName}</b>
            </span>
            <button class="knopf" style={{ minHeight: '44px' }} onClick={() => setNameAendern(true)}>
              {t('Ändern')}
            </button>
          </section>
        ) : (
        <section class="karte seite" style={{ padding: '18px' }}>
          <h2 style={{ margin: 0 }}>
            <KopfIcon name="profil" />
            {t('Dein Name · nötig zum Bewerten')}
          </h2>
          <p style={{ margin: '8px 0 0' }}>
            {t('Öffentlich sichtbar neben deinen Bewertungen.')}
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
        )}

        <div class="nm" style={{ gridColumn: '1 / -1' }}>
          <PassAbzeichen />
        </div>

        <div class="nm" style={{ gridColumn: '1 / -1' }}>
          <Gruppe
            titel="Hilfe und Einstellungen"
            punkte={[
              { href: '#/spickzettel', symbol: 'spickzettel', titel: 'Hilfe & Regeln', text: 'So bewertest du, was die Sterne bedeuten.' },
              { href: '#/einstellungen', symbol: 'einstellungen', titel: 'Einstellungen', text: 'Sprache, Hell oder Dunkel, Sparmodus.' },
              { href: '#/feedback', symbol: 'kamera', titel: 'Was fehlt dir?', text: 'Sag uns, was unklar ist oder fehlt.' },
            ]}
          />
          {pruefstelle && (
            <Gruppe
              titel="Prüfstelle"
              punkte={[
                { href: '#/moderation', symbol: 'pokal', titel: 'Moderation', text: 'Meldungen, Stände pflegen, Bewertungen löschen.' },
                { href: '#/statistik', symbol: 'statistik', titel: 'Statistik' },
              ]}
            />
          )}
        </div>

        <details class="karte seite" style={{ padding: '18px', gridColumn: '1 / -1' }}>
          <summary style={{ cursor: 'pointer', minHeight: '44px', display: 'flex', alignItems: 'center', fontWeight: 600 }}>{t('Technik und Prüfstelle')}</summary>
        <section>
          <h2 style={{ margin: 0 }}>{t('Verbindung')}</h2>
          <p style={{ margin: '6px 0 0', fontSize: '12px', color: 'var(--text-2)', fontFamily: 'var(--mono)' }}>
            {t('Version')} {__BAUZEIT__} · {t('Gerät')} {(geraetId ?? '–').slice(0, 8)}
          </p>
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
            . {t('Zufällig, ohne persönliche Daten.')} <a href="#/datenschutz">{t('Datenschutz')}</a>.
          </p>
        </section>

        <section style={{ marginTop: '18px' }}>
          <h2 style={{ margin: 0 }}>{t('Prüfstelle · nur David & Philip')}</h2>
          {pruefstelle ? (
            <>
              <p style={{ margin: '8px 0 0' }}>{t('Dieses Gerät ist Prüfstelle.')}</p>
              <div class="knopfreihe">
                <a class="knopf" href="#/moderation" style={{ display: 'inline-flex', alignItems: 'center', textDecoration: 'none', color: 'inherit' }}>
                  {t('Moderation öffnen')}
                </a>
              </div>
            </>
          ) : (
            <>
              <p style={{ margin: '8px 0 0' }}>
                {t('Mit Code tragen eure Bewertungen das Siegel „Prüfstelle“.')}
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
        </details>

      </div>
      <Betreiber />
    </>
  );
}
