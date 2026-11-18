// Gewichtung und gemeinsamer Datenbestand (Sync). Kein Token, kein Konto. Es gibt nur das Nacht-Theme.
import { HAT_SERVER } from '../daten/config';
import { db } from '../daten/db';
import { synchronisiere } from '../daten/sync';
import { Betreiber } from './bausteine';
import { useGewichte } from './daten';
import { GewichteEditor } from './GewichteEditor';
import { useLive } from './hooks';

export function Einstellungen() {
  const gewichte = useGewichte();
  const offen = useLive(() => db.eintraege.where('sync').equals('offen').count(), [], 0);

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

      </div>
      <Betreiber />
    </>
  );
}
