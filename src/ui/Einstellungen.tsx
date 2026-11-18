// Einstellungen dieses Geräts: Name, Prüfstelle, Verbindung, Gewichtung, Darstellung.
import { useEffect, useState } from 'preact/hooks';
import { api, ApiFehler } from '../daten/api';
import { API_URL } from '../daten/config';
import { db, holeGeraet, leseEinstellung, schreibeEinstellung, setzeName } from '../daten/db';
import { abonniereSync, synchronisiere, type SyncInfo } from '../daten/sync';
import { GRENZEN, pruefeName } from '../lib/community';
import { Betreiber } from './bausteine';
import { useGeraetId, useGewichte, useName } from './daten';
import { GewichteEditor } from './GewichteEditor';
import { useLive } from './hooks';

type Theme = 'auto' | 'hell' | 'dunkel';

export function wendeThemeAn(t: Theme) {
  if (t === 'auto') document.documentElement.removeAttribute('data-theme');
  else document.documentElement.setAttribute('data-theme', t);
}

const VERBINDUNG: Record<SyncInfo['zustand'], string> = {
  bereit: 'Verbunden. Neue Becher gehen automatisch zum Server.',
  laeuft: 'Synchronisiere …',
  offline: 'Gerade kein Netz. Becher bleiben auf dem Gerät und gehen später zum Server.',
  'kein-server': 'Kein Community-Server eingerichtet. Alles bleibt auf diesem Gerät.',
  fehler: 'Der Server hat einen Fehler gemeldet.',
  gesperrt: 'Dieses Gerät wurde gesperrt.',
};

export function Einstellungen() {
  const gewichte = useGewichte();
  const gespeicherterName = useName();
  const geraetId = useGeraetId();
  const [name, setName] = useState('');
  const [nameMeldung, setNameMeldung] = useState('');
  const [theme, setTheme] = useState<Theme>('auto');
  const [info, setInfo] = useState<SyncInfo>({ zustand: 'bereit' });
  const [code, setCode] = useState('');
  const [codeMeldung, setCodeMeldung] = useState('');
  const offen = useLive(() => db.eintraege.where('sync').equals('offen').count(), [], 0);
  const abgelehnt = useLive(() => db.eintraege.where('sync').equals('abgelehnt').count(), [], 0);
  const pruefstelle = useLive(() => leseEinstellung<boolean>('pruefstelle', false), [], false);
  const nameFehler = useLive(() => leseEinstellung<string>('nameFehler', ''), [], '');

  useEffect(() => abonniereSync(setInfo), []);
  useEffect(() => {
    void leseEinstellung<Theme>('theme', 'auto').then(setTheme);
  }, []);
  useEffect(() => setName(gespeicherterName), [gespeicherterName]);

  const speichereName = async () => {
    const p = pruefeName(name);
    if (!p.ok) return setNameMeldung(p.grund);
    await setzeName(p.name ?? '');
    await schreibeEinstellung('nameFehler', '');
    await schreibeEinstellung('nameAbgelehnt', true); // die Frage auf der Startseite entfällt
    setNameMeldung(p.name ? `Gespeichert: ${p.name}` : 'Du bist jetzt anonym.');
    void synchronisiere();
  };

  const schalteFrei = async () => {
    setCodeMeldung('Prüfe …');
    try {
      await api('/api/pruefstelle', { methode: 'POST', geraet: await holeGeraet(), body: { code: code.trim() } });
      setCode('');
      setCodeMeldung('Dieses Gerät ist jetzt Prüfstelle.');
      void synchronisiere();
    } catch (err) {
      if (err instanceof ApiFehler) setCodeMeldung(err.message);
      else setCodeMeldung('Kein Netz. Bitte später erneut versuchen.');
    }
  };

  const waehleTheme = async (t: Theme) => {
    setTheme(t);
    wendeThemeAn(t);
    await schreibeEinstellung('theme', t);
  };

  return (
    <>
      <div class="seitenkopf">
        <div>
          <p class="eyebrow">Dieses Gerät</p>
          <h1>Einstellungen</h1>
        </div>
      </div>
      <div class="raster">
        <section class="karte seite" style={{ padding: '18px' }}>
          <h2 style={{ margin: 0 }}>Dein Name · freiwillig</h2>
          <p style={{ margin: '8px 0 0' }}>
            Er steht öffentlich neben deinen Bewertungen. Wenn du dir zum ersten Mal einen Namen gibst, gilt er auch für Becher,
            die du schon abgegeben hast. Ohne Namen erscheinst du als „Anonym". Besser kein voller echter Name. Ein Konto
            brauchst du nicht.
          </p>
          <label for="name">Name oder Spitzname</label>
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
              Speichern
            </button>
          </div>
          {(nameMeldung || nameFehler) && <div class="meldung">{nameMeldung || `Der Server hat den Namen abgelehnt: ${nameFehler}`}</div>}
        </section>

        <section class="karte seite" style={{ padding: '18px' }}>
          <h2 style={{ margin: 0 }}>Verbindung</h2>
          <p style={{ margin: '8px 0 0' }}>{VERBINDUNG[info.zustand]}</p>
          {info.meldung && <div class="meldung">{info.meldung}</div>}
          <div class="knopfreihe">
            <button class="knopf" disabled={!API_URL} onClick={() => void synchronisiere()}>
              Jetzt synchronisieren ({offen} offen)
            </button>
          </div>
          {abgelehnt > 0 && (
            <p class="meldung" style={{ color: 'var(--warnung)' }}>
              {abgelehnt} {abgelehnt === 1 ? 'Becher wurde' : 'Becher wurden'} vom Server abgelehnt und bleiben nur auf diesem Gerät.
            </p>
          )}
          <p style={{ fontSize: '12.5px' }}>
            Geräte-Kennung: <span class="mono">{geraetId ? geraetId.slice(0, 8) : 'wird beim ersten Becher angelegt'}</span>. Sie ist
            anonym und enthält keine persönlichen Daten.
          </p>
        </section>

        <section class="karte seite" style={{ padding: '18px' }}>
          <h2 style={{ margin: 0 }}>Prüfstelle · nur David &amp; Philip</h2>
          {pruefstelle ? (
            <p style={{ margin: '8px 0 0' }}>Dieses Gerät ist als Prüfstelle freigeschaltet. Eure Bewertungen tragen das Siegel „Prüfstelle".</p>
          ) : (
            <>
              <p style={{ margin: '8px 0 0' }}>
                Mit dem Prüfstellen-Code tragen eure Bewertungen das Siegel „Prüfstelle". Alle anderen erscheinen als Community.
              </p>
              <label for="code">Prüfstellen-Code</label>
              <input
                id="code"
                class="feld"
                type="password"
                autocomplete="off"
                disabled={!API_URL}
                value={code}
                onInput={(e) => setCode((e.target as HTMLInputElement).value)}
              />
              <div class="knopfreihe">
                <button class="knopf" disabled={!API_URL || !code.trim()} onClick={() => void schalteFrei()}>
                  Freischalten
                </button>
              </div>
              {codeMeldung && <div class="meldung">{codeMeldung}</div>}
            </>
          )}
        </section>

        <section class="karte" style={{ padding: '18px' }}>
          <h2>Gewichtung · gilt für alle Ansichten</h2>
          <GewichteEditor gewichte={gewichte} />
        </section>

        <section class="karte seite" style={{ padding: '18px' }}>
          <h2 style={{ margin: 0 }}>Darstellung</h2>
          <div class="knopfreihe">
            {(['auto', 'hell', 'dunkel'] as Theme[]).map((t) => (
              <button class={theme === t ? 'knopf primaer' : 'knopf'} onClick={() => waehleTheme(t)}>
                {t === 'auto' ? 'Wie System' : t === 'hell' ? 'Hell' : 'Dunkel'}
              </button>
            ))}
          </div>
        </section>
      </div>
      <Betreiber />
    </>
  );
}
