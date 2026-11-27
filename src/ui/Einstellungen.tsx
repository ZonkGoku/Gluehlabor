// Gemeinsamer Datenbestand (Sync) und Darstellung. Kein Token, kein Konto. Die Gewichtung der Noten steht nur im Admin-Bereich.
import { HAT_SERVER } from '../daten/config';
import { db } from '../daten/db';
import { synchronisiere } from '../daten/sync';
import { setzeMenue, setzeSparmodus, setzeTheme, useMenue, useSparmodus, useTheme, type Menue, type Sparmodus, type Theme } from '../daten/darstellung';
import { Betreiber } from './bausteine';
import { Chips } from './nacht/Chips';
import { useLive } from './hooks';
import { aktuelleSprache, setzeSprache, t, type Sprache } from '../i18n';

export function Einstellungen() {
  const theme = useTheme();
  const spar = useSparmodus();
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
        <section class="karte seite" style={{ padding: '18px' }}>
          <h2 style={{ margin: 0 }}>{t('Gemeinsamer Datenbestand')}</h2>
          <p style={{ margin: '8px 0 0' }}>
            {HAT_SERVER
              ? t('Jeder darf bewerten, ohne Konto.')
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
            <div>
              <div class="etikett mb-2">{t('Weniger Effekte (Sparmodus)')}</div>
              <Chips<Sparmodus>
                optionen={['auto', 'an', 'aus'] as const}
                wert={spar}
                onWahl={setzeSparmodus}
                beschriftung={t('Weniger Effekte (Sparmodus)')}
                label={(w) => (w === 'auto' ? t('Automatisch') : w === 'an' ? t('An') : t('Aus'))}
              />
              <p class="mt-2 text-sm text-dunst">{t('Ohne Schnee und Unschärfe, das hilft, wenn die App ruckelt oder hängt. Automatisch an auf Android und schwachen Geräten.')}</p>
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
