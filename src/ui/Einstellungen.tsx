// Gewichtung, gemeinsamer Datenbestand (Sync) und Darstellung. Kein Token, kein Konto.
import { HAT_SERVER } from '../daten/config';
import { db } from '../daten/db';
import { synchronisiere } from '../daten/sync';
import { setzeMenue, setzeTheme, useMenue, useTheme, type Menue, type Theme } from '../daten/darstellung';
import { Betreiber } from './bausteine';
import { Chips } from './nacht/Chips';
import { useGewichte } from './daten';
import { GewichteEditor } from './GewichteEditor';
import { useLive } from './hooks';
import { aktuelleSprache, setzeSprache, t, type Sprache } from '../i18n';

export function Einstellungen() {
  const gewichte = useGewichte();
  const theme = useTheme();
  const menue = useMenue();
  const offen = useLive(() => db.eintraege.where('sync').equals('offen').count(), [], 0);

  return (
    <>
      <div class="seitenkopf">
        <div>
          <p class="eyebrow">{t('Dieses Gerät')}</p>
          <h1>{t('Einstellungen')}</h1>
        </div>
      </div>
      <div class="raster">
        <section class="karte">
          <h2>{t('Gewichtung · gilt für alle Ansichten')}</h2>
          <GewichteEditor gewichte={gewichte} />
        </section>

        <section class="karte seite" style={{ padding: '18px' }}>
          <h2 style={{ margin: 0 }}>{t('Gemeinsamer Datenbestand')}</h2>
          <p style={{ margin: '8px 0 0' }}>
            {HAT_SERVER
              ? t('Jeder darf bewerten, ohne Konto und ohne Anmeldung. Jeder Becher landet automatisch im gemeinsamen Bestand und ist auf allen Geräten zu sehen. Ohne Netz wird lokal weiter erfasst, nichts geht verloren.')
              : t('Diese Version arbeitet nur lokal: Becher bleiben auf diesem Gerät. Den gemeinsamen Bestand gibt es unter gluehlabor.de.')}
          </p>
          <div class="knopfreihe">
            {HAT_SERVER && (
              <button class="knopf" onClick={() => void synchronisiere()}>
                {t('Jetzt synchronisieren ({n} offen)', { n: offen })}
              </button>
            )}
            <a class="knopf" href="#/profil">
              {t('Name und Prüfstelle')}
            </a>
          </div>
        </section>


        <section class="nm karte seite" style={{ padding: '18px' }}>
          <h2 style={{ margin: 0 }}>{t('Darstellung')}</h2>
          <p class="mt-2 text-sm text-dunst">{t('Gilt nur auf diesem Gerät.')}</p>
          <div class="mt-3 space-y-4">
            <div>
              <div class="etikett mb-2">{t('Farbschema')}</div>
              <Chips<Theme>
                optionen={['auto', 'hell', 'dunkel'] as const}
                wert={theme}
                onWahl={setzeTheme}
                beschriftung={t('Farbschema')}
                label={(w) => (w === 'auto' ? t('Wie System') : w === 'hell' ? t('Hell') : t('Dunkel'))}
              />
            </div>
            <div>
              <div class="etikett mb-2">{t('Sprache')}</div>
              <Chips<Sprache> optionen={['de', 'en'] as const} wert={aktuelleSprache()} onWahl={setzeSprache} beschriftung={t('Sprache')} label={(s) => (s === 'de' ? 'Deutsch' : 'English')} />
            </div>
            <div class="hidden min-[900px]:block">
              <div class="etikett mb-2">{t('Menü am Rechner')}</div>
              <Chips<Menue>
                optionen={['seitenleiste', 'schwebend'] as const}
                wert={menue}
                onWahl={setzeMenue}
                beschriftung={t('Menü am Rechner')}
                label={(m) => (m === 'seitenleiste' ? t('Seitenleiste') : t('Schwebende Leiste'))}
              />
            </div>
          </div>
        </section>
      </div>
      <Betreiber />
    </>
  );
}
