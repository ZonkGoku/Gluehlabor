// Landeseite des QR-Codes: zeigt den Stand, fragt freiwillig nach dem Namen und startet die Bewertung.
import { useState } from 'preact/hooks';
import { setzeName, db } from '../daten/db';
import { entwurfHatInhalt, leseEntwurf, schreibeEntwurf, type Entwurf } from '../daten/entwurf';
import { synchronisiere } from '../daten/sync';
import { leseBesuch } from '../lib/besuch';
import { anzeigeName, pruefeName } from '../lib/community';
import { leereNoten } from '../lib/modell';
import { useName } from './daten';
import { useLive } from './hooks';
import { t } from '../i18n';

export function Mitbewerten() {
  const besuch = leseBesuch(location.hash.split('?')[1] ?? '');
  const gespeicherterName = useName();
  const mitDabei = useLive(async () => (besuch.ok ? db.eintraege.where('besuchId').equals(besuch.besuch.id).toArray() : []), [location.hash], []);
  const [name, setName] = useState('');
  const [fehler, setFehler] = useState('');
  const [verwerfen, setVerwerfen] = useState(false);

  if (!besuch.ok) {
    return (
      <main class="fokus">
        <div class="karte leer">
          <b>{t('Dieser Link funktioniert nicht.')}</b>
          {t(besuch.grund)} {t('Bitte den QR-Code noch einmal scannen oder um einen neuen Link bitten.')}
          <p style={{ margin: '14px 0 0' }}>
            <a class="pillknopf" href="#/">
              {t('Zur Startseite')}
            </a>
          </p>
        </div>
      </main>
    );
  }
  const b = besuch.besuch;
  const frageNachName = !gespeicherterName;

  const starten = async () => {
    if (frageNachName) {
      // Ohne Namen keine Bewertung
      const p = pruefeName(name);
      if (!p.ok) return setFehler(t(p.grund));
      if (!p.name) return setFehler(t('Bitte einen Namen eingeben.'));
      await setzeName(p.name);
      void synchronisiere();
    }
    const entwurf: Entwurf = {
      stand: b.stand,
      markt: b.markt,
      marktFrei: false,
      stadt: b.stadt,
      sorte: b.sorte,
      besuchId: b.id,
      gesperrt: true,
      notiz: '',
      noten: leereNoten(),
    };
    schreibeEntwurf(entwurf);
    location.hash = '#/erfassen';
  };

  const angefangen = leseEntwurf();
  const bestehtInhalt = entwurfHatInhalt(angefangen) && angefangen?.besuchId !== b.id;

  return (
    <main class="fokus">
      <a href="#/" class="mb-2 inline-flex min-h-[44px] items-center gap-1 text-sm font-semibold text-eis no-underline">
        <span aria-hidden="true">‹</span> {t('Zur Startseite')}
      </a>
      <p class="eyebrow">{t('Du wurdest eingeladen')}</p>
      <h1 class="fokus-titel">{b.stand}</h1>
      <p class="fokus-unter">
        {b.markt}
        {b.stadt ? ` · ${b.stadt}` : ''}
      </p>
      <p class="fokus-hinweis">
        {t('Bewerte diesen Glühwein selbst, zusammen mit den anderen am Stand. Sieben Noten, dauert etwa eine halbe Minute. Dafür brauchst du kein Konto.')}
      </p>

      {mitDabei.length > 0 && (
        <p class="fokus-hinweis">
          <b>{t('Schon dabei:')}</b> {mitDabei.map((e) => anzeigeName(e)).join(', ')}
        </p>
      )}

      {frageNachName && (
        <div class="name-karte">
          <label for="name-scan">{t('Wie heißt du? Der Name ist nötig, um zu bewerten.')}</label>
          <input
            id="name-scan"
            class="feld"
            type="text"
            maxLength={24}
            autocomplete="nickname"
            placeholder={t('Name oder Spitzname')}
            value={name}
            onInput={(e) => {
              setName((e.target as HTMLInputElement).value);
              setFehler('');
            }}
          />
          <p class="name-hinweis">
            {t('Der Name steht öffentlich neben deinen Bewertungen. Ein Spitzname reicht, besser kein voller echter Name.')}
            {fehler && <span class="name-fehler"> {fehler}</span>}
          </p>
        </div>
      )}

      {bestehtInhalt && verwerfen ? (
        <div class="karte" style={{ marginBottom: '12px' }}>
          <p style={{ margin: '0 0 10px' }}>
            {t('Du hast gerade eine angefangene Bewertung ({stand}). Sie geht verloren, wenn du jetzt hier mitbewertest.', { stand: angefangen?.stand || t('ohne Stand') })}
          </p>
          <div class="knopfreihe">
            <button class="knopf primaer" onClick={() => void starten()}>
              {t('Verwerfen und mitbewerten')}
            </button>
            <a class="knopf" href="#/erfassen" style={{ display: 'inline-flex', alignItems: 'center', textDecoration: 'none', color: 'inherit' }}>
              {t('Zurück zur Bewertung')}
            </a>
          </div>
        </div>
      ) : (
        <button class="plus-balken" style={{ width: '100%', border: 0, cursor: 'pointer' }} onClick={() => (bestehtInhalt ? setVerwerfen(true) : void starten())}>
          {t('Jetzt bewerten')}
        </button>
      )}
    </main>
  );
}
