// Gewichtung, gemeinsamer Datenbestand (Sync), Darstellung. Kein Token, kein Konto.
import { useEffect, useState } from 'preact/hooks';
import { HAT_SERVER } from '../daten/config';
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
  const [theme, setTheme] = useState<Theme>('auto');
  const gewichte = useGewichte();
  const offen = useLive(() => db.eintraege.where('sync').equals('offen').count(), [], 0);

  useEffect(() => {
    void leseEinstellung<Theme>('theme', 'auto').then(setTheme);
  }, []);

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
          <h2 style={{ margin: 0 }}>Gemeinsamer Datenbestand</h2>
          <p style={{ margin: '8px 0 0' }}>
            {HAT_SERVER
              ? 'Jeder darf bewerten, ohne Konto und ohne Anmeldung. Jeder Becher landet automatisch im gemeinsamen Bestand und ist auf allen Geräten zu sehen. Ohne Netz wird lokal weiter erfasst, nichts geht verloren.'
              : 'Diese Version arbeitet nur lokal: Becher bleiben auf diesem Gerät. Den gemeinsamen Bestand gibt es unter gluehlabor.de.'}
          </p>
          <div class="knopfreihe">
            {HAT_SERVER && (
              <button class="knopf" onClick={() => void synchronisiere()}>
                Jetzt synchronisieren ({offen} offen)
              </button>
            )}
            <a class="knopf" href="#/profil">
              Name und Prüfstelle
            </a>
          </div>
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
