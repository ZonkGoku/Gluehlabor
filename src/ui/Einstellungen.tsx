// Minimal: Schreib-Token hinterlegen und prüfen, Theme wählen.
import { useEffect, useState } from 'preact/hooks';
import { REPO } from '../daten/config';
import { db, leseEinstellung, schreibeEinstellung } from '../daten/db';
import { synchronisiere } from '../daten/sync';
import { Betreiber } from './bausteine';
import { useGewichte } from './daten';
import { GewichteEditor } from './GewichteEditor';
import { useLive } from './hooks';

type Theme = 'auto' | 'hell' | 'dunkel';

export function wendeThemeAn(t: Theme) {
  if (t === 'auto') document.documentElement.removeAttribute('data-theme');
  else document.documentElement.setAttribute('data-theme', t);
}

export function Einstellungen() {
  const [token, setToken] = useState('');
  const [theme, setTheme] = useState<Theme>('auto');
  const [meldung, setMeldung] = useState('');
  const gewichte = useGewichte();
  const offen = useLive(() => db.eintraege.where('sync').equals('offen').count(), [], 0);

  useEffect(() => {
    void leseEinstellung('token', '').then(setToken);
    void leseEinstellung<Theme>('theme', 'auto').then(setTheme);
  }, []);

  const speichern = async () => {
    await schreibeEinstellung('token', token.trim());
    setMeldung('Token gespeichert.');
    void synchronisiere();
  };

  const pruefen = async () => {
    setMeldung('Prüfe …');
    try {
      const res = await fetch(`https://api.github.com/repos/${REPO.owner}/${REPO.name}`, {
        headers: { Authorization: `Bearer ${token.trim()}`, Accept: 'application/vnd.github+json' },
      });
      if (!res.ok) return setMeldung(`Abgelehnt (${res.status}). Token oder Rechte falsch.`);
      const repo = await res.json();
      setMeldung(repo.permissions?.push ? 'Schreibrecht vorhanden.' : 'Token gültig, aber ohne Schreibrecht.');
    } catch {
      setMeldung('Kein Netz.');
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
        <section class="karte">
          <h2>Gewichtung · gilt für alle Ansichten</h2>
          <GewichteEditor gewichte={gewichte} />
        </section>

        <section class="karte seite" style={{ padding: '18px' }}>
          <h2 style={{ margin: 0 }}>Eintragen · nur David &amp; Philip</h2>
          <p style={{ margin: '8px 0 0' }}>
            Lesen kann jeder. Wer eintragen will, hinterlegt einmal pro Gerät einen GitHub-Token. Danach erscheint der
            Knopf zum Erfassen, und jeder Becher landet automatisch im gemeinsamen Datenbestand.
          </p>
          <label for="token">GitHub-Token (fine-grained, nur {REPO.owner}/{REPO.name}, Contents: Read and write)</label>
          <input
            id="token"
            class="feld"
            type="password"
            autocomplete="off"
            value={token}
            onInput={(e) => setToken((e.target as HTMLInputElement).value)}
          />
          <div class="knopfreihe">
            <button class="knopf primaer" onClick={speichern}>
              Speichern
            </button>
            <button class="knopf" onClick={pruefen}>
              Prüfen
            </button>
            <button class="knopf" onClick={() => void synchronisiere()}>
              Jetzt synchronisieren ({offen} offen)
            </button>
          </div>
          {meldung && <div class="meldung">{meldung}</div>}
          <p>Der Token bleibt auf diesem Gerät. Ohne Netz wird lokal weiter erfasst; nichts geht verloren.</p>
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
