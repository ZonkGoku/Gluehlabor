// Impressum und Datenschutzerklärung. Die Angaben zum Betreiber stehen in data/betreiber.json.
// Hinweis für Pflege: Der Text der Datenschutzerklärung beschreibt, was die App und der Server
// tatsächlich tun (siehe CLAUDE.md). Ändert sich dort etwas, muss er mitziehen. Er ist ein Entwurf und
// nicht rechtlich geprüft.
import betreiberJson from '../../data/betreiber.json';
import { MARKE } from '../marke';
import { fehlendeAngaben, type Betreiber } from '../lib/betreiber';
import { Betreiber as Fuss } from './bausteine';
import { useGeraetId } from './daten';

const B = betreiberJson as unknown as Betreiber;
const fehlt = fehlendeAngaben(B);

/** Erinnerung nur beim Entwickeln. Öffentlich soll kein Hinweis auf fehlende Angaben stehen; das prüft `npm run launch-check`. */
function Fehlt() {
  if (!import.meta.env.DEV || fehlt.length === 0) return null;
  return (
    <div class="karte" style={{ borderColor: 'var(--warnung)', marginBottom: '14px' }}>
      <b>Die Betreiberangaben sind noch nicht vollständig.</b>
      <p style={{ margin: '6px 0 0' }}>Es fehlen: {fehlt.join(', ')}. Eintragen in data/betreiber.json.</p>
    </div>
  );
}

/** Name, Straße (falls angegeben) und Ort. */
const anschrift = [B.name, B.strasse, B.ort].map((x) => (x ?? '').trim()).filter(Boolean);

export function Impressum() {
  return (
    <>
      <div class="seitenkopf">
        <div>
          <p class="eyebrow">Rechtliches</p>
          <h1>Impressum</h1>
        </div>
      </div>
      <Fehlt />
      <section class="karte text-seite">
        <h2>Privates Projekt</h2>
        <p>
          {MARKE.name} ist ein <b>rein privates Spaßprojekt</b> von {B.name || 'Philip'} (Hamburg) und David (Bayern). Es ist nicht
          kommerziell: keine Werbung, keine Einnahmen, kein Angebot gegen Entgelt.
        </p>
        <h2>Verantwortlich</h2>
        <p>
          {anschrift.map((z, i) => (
            <>
              {i > 0 && <br />}
              {z}
            </>
          ))}
        </p>
        <h2>Kontakt</h2>
        <p>
          {B.email ? <>E-Mail: {B.email}</> : 'Kontakt über die Meldefunktion in der App.'}
          {B.telefon ? (
            <>
              <br />
              Telefon: {B.telefon}
            </>
          ) : null}
        </p>
        <h2>Inhalte von Nutzern</h2>
        <p>
          Bewertungen, Notizen und Namen stammen von den Nutzern. Wer einen Eintrag für unpassend hält, kann ihn in der
          Detailansicht über „Diesen Eintrag melden" melden oder uns per E-Mail schreiben. Gemeldete Einträge prüfen wir und
          blenden sie bei Verstößen aus.
        </p>
        <h2>Haftung für Links</h2>
        <p>
          Für Inhalte externer Seiten, auf die verlinkt wird, sind deren Betreiber verantwortlich.
        </p>
      </section>
      <Fuss />
    </>
  );
}

export function Datenschutz() {
  const geraet = useGeraetId();
  return (
    <>
      <div class="seitenkopf">
        <div>
          <p class="eyebrow">Rechtliches</p>
          <h1>Datenschutz</h1>
          <p class="unterzeile">Kurz: kein Konto, keine Werbung, kein Tracking. Hier steht genau, was gespeichert wird.</p>
        </div>
      </div>
      <Fehlt />
      <section class="karte text-seite">
        <h2>1. Wer verantwortlich ist</h2>
        <p>
          {anschrift.join(', ')}.{B.email ? ` E-Mail: ${B.email}.` : ' Kontakt über die Meldefunktion in der App.'} Es handelt sich um ein privates, nicht
          kommerzielles Projekt.
        </p>

        <h2>2. Auf deinem Gerät</h2>
        <p>
          Die App speichert in deinem Browser: deine Bewertungen, eine angefangene Bewertung, deine Einstellungen (Name,
          Saison, Gewichtung, Darstellung) sowie eine zufällige Geräte-Kennung mit Schlüssel. Außerdem legt die installierbare
          Web-App Dateien zwischen, damit sie ohne Netz funktioniert. Es gibt keine Cookies, keine Werbung und keine
          Analyse- oder Tracking-Dienste. Du kannst alles jederzeit über die Browser-Einstellungen („Websitedaten löschen")
          entfernen.
        </p>

        <h2>3. Auf dem Server (Community)</h2>
        <p>
          Wenn du Bewertungen abgibst, speichert unser Server: die zufällige Geräte-Kennung, einen Hash deines
          Geräteschlüssels (nicht den Schlüssel selbst), deinen freiwilligen Namen sowie zu jeder Bewertung Stand, Markt,
          Stadt, Datum, Sorte, Becher-Nr., Preis, Noten, Notiz, die Besuchs-Nr. und Zeitpunkte. Es gibt kein Konto, keine
          E-Mail-Adresse und keine Telefonnummer.
        </p>
        <p>
          <b>Öffentlich:</b> Bewertungen mit deinem Namen (oder „Anonym") und der Geräte-Kennung kann jeder abrufen, auch ohne
          die App. Wer mehrere Bewertungen derselben Kennung sieht, erkennt, dass sie vom selben Gerät stammen. Schreib deshalb
          keine persönlichen Daten in Namen oder Notizen.
        </p>
        <p>
          Meldest du einen Eintrag, speichern wir deine Geräte-Kennung, den Grund und deinen optionalen Text, bis wir die
          Meldung bearbeitet haben.
        </p>

        <h2>4. Rechtsgrundlagen</h2>
        <p>
          Bereitstellung der Bewertungsfunktion: Art. 6 Abs. 1 lit. b DSGVO. Dein Name: deine Einwilligung, Art. 6 Abs. 1
          lit. a DSGVO, freiwillig und jederzeit widerruflich. Schutz vor Missbrauch und Sicherheit des Dienstes: berechtigtes
          Interesse, Art. 6 Abs. 1 lit. f DSGVO.
        </p>

        <h2>5. Adressen und Missbrauchsschutz</h2>
        <p>
          Beim Aufruf sieht der Server technisch deine IP-Adresse. In der Datenbank der App speichern wir keine
          IP-Adressen im Klartext. Zum Schutz vor Missbrauch zählen wir Anfragen und neue Geräte je Adresse. Dafür speichern wir nur einen
          Hashwert, der mit einem geheimen Salz und dem Tag gebildet wird und sich täglich ändert. Er wird innerhalb von zwei
          Tagen gelöscht.
        </p>

        <h2>6. Hosting</h2>
        <p>
          Website, Schnittstelle und Datenbank laufen bei der Hetzner Online GmbH, Industriestr. 25, 91710 Gunzenhausen
          (Deutschland){B.hostingStandort ? `, Standort: ${B.hostingStandort}` : ''}. Mit Hetzner besteht ein Vertrag zur
          Auftragsverarbeitung. Es werden keine Dienste von Drittanbietern nachgeladen (keine Schriftarten-, Analyse- oder
          Werbedienste).
        </p>
        <p>
          Der Webserver des Hosters protokolliert beim Aufruf technisch bedingt Zugriffe (IP-Adresse, Zeitpunkt, aufgerufene
          Adresse, Browserkennung). Das dient dem sicheren Betrieb (Art. 6 Abs. 1 lit. f DSGVO). Die Dauer richtet sich nach
          den Einstellungen des Hosters. Wir werten diese Protokolle nicht aus und verknüpfen sie nicht mit Bewertungen.
        </p>

        <h2>7. Wie lange wir speichern</h2>
        <p>
          Bewertungen bleiben, bis du ihre Löschung verlangst. Der Name steht, bis du ihn entfernen lässt. Abgelaufene
          Zähler für den Missbrauchsschutz löschen wir täglich.
        </p>

        <h2>8. Deine Rechte</h2>
        <p>
          Du hast das Recht auf Auskunft, Berichtigung, Löschung, Einschränkung der Verarbeitung, Datenübertragbarkeit und
          Widerspruch sowie auf Widerruf einer Einwilligung. Du kannst dich bei einer Datenschutz-Aufsichtsbehörde beschweren.
        </p>
        <p>
          <b>Löschen oder Namen entfernen:</b> {B.email ? `Schreib an ${B.email}` : 'Melde dich über die Kontaktangabe im Impressum'} und nenne deine Geräte-Kennung. Wir entfernen auf
          Wunsch nur deinen Namen von allen deinen Bewertungen oder alle Bewertungen dieses Geräts. Deine Kennung:{' '}
          <span class="mono" style={{ wordBreak: 'break-all', userSelect: 'all' }}>
            {geraet ?? 'wird beim ersten Bewerten angelegt'}
          </span>
        </p>

        <h2>9. Keine automatisierten Entscheidungen</h2>
        <p>Es findet keine automatisierte Entscheidungsfindung oder Profilbildung statt.</p>
      </section>
      <Fuss />
    </>
  );
}
