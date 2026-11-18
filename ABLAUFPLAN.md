# Ablaufplan: Start am Montag, 23.11.2026

Stand: Mittwoch, 18.11.2026. Das Ziel ist ein Start am Montag mit dem Kern: Server online (Hetzner), Bewerten ohne Konto,
QR-Code zum gemeinsamen Bewerten. Alles andere kommt danach.

## Wer macht was

| Tag | Du (David & Philip) | Ich |
|---|---|---|
| **Mi 18.11** | – | **Erledigt:** Server gehärtet, Melden, Löschen auf Anfrage, QR-Mitbewerten, Preisindex, Impressum und Datenschutz (Entwurf), iPhone-Hinweis, Startcheck, Moderations-Werkzeug. 317 Tests, Zwei-Geräte-Test mit echtem QR-Dekodieren |
| **Do 19.11** | **konsoleH**: SSL aktivieren, FTP-Daten notieren, **GitHub-Secrets** setzen (`hetzner/WEBHOSTING.md`), Deploy starten, AV-Vertrag, **Betreiberangaben** (Name, Anschrift, E-Mail). Entscheiden: Altershinweis ja/nein | PHP-Schnittstelle und Deploy sind fertig und gegen Apache getestet. Beim Einrichten helfen, Startcheck, Betreiberangaben eintragen |
| **Fr 20.11** | **Test mit echten Handys**: iPhone und Android, zwei Geräte. QR scannen, offline erfassen, Homescreen-Installation. Fehler an mich | Fehler beheben, nachtesten |
| **Sa 21.11** | Generalprobe: erst zu zweit am Rechner, wenn möglich an einer echten Bude. Moderation einmal ausprobieren (Meldung auslösen, ausblenden). Datenschutz-Entwurf prüfen lassen | Letzte Korrekturen. Startcheck muss komplett grün sein |
| **So 22.11** | 5 bis 10 Freunde einladen (Soft-Launch). Link nur an sie | Beobachten, Fehler beheben. Danach Änderungsstopp, nur noch Fehlerbehebung |
| **Mo 23.11** | **Start:** Link teilen | Auf Fehler achten |

## Das brauche ich von dir (Reihenfolge nach Dringlichkeit)

0. **Domain gluehlabor.de**: gekauft und im Hetzner Webhosting angelegt.
1. **konsoleH**: SSL (Let's Encrypt) für gluehlabor.de aktivieren, PHP 8.1 oder neuer, FTP-Zugangsdaten notieren.
2. **GitHub-Secrets** setzen (Liste in `hetzner/WEBHOSTING.md`): `FTP_SERVER`, `FTP_USER`, `FTP_PASSWORD`, `ADMIN_TOKEN`, `PRUEFSTELLE_CODE`, `IP_SALT`.
   Die Werte nicht im Chat teilen.
3. **Deploy-Workflow starten** (Actions → „Deploy auf Hetzner Webhosting"). Danach läuft alles von selbst bei jedem Push.
4. **Betreiberangaben** für das Impressum (nach § 5 DDG öffentlich einsehbar): Name, Straße und Hausnummer, PLZ und Ort, E-Mail,
   Hosting-Standort. Tipp: eine eigene Adresse wie `kontakt@gluehlabor.de` statt der privaten (Webhosting hat eine Mailbox).
5. **AV-Vertrag mit Hetzner** in der Konsole abschließen.
6. **Entscheidung Altershinweis:** Es geht um Alkohol. Soll die App „ab 18" ausdrücklich nennen? Ich habe nichts eingebaut.

## Startcheck

`npm run launch-check` meldet jeden offenen Punkt: Betreiberangaben, Server-Adresse, Server erreichbar, Bestandsdaten
hochgeladen, Schreiben nur von der eigenen Seite, Moderation gesperrt, Live-Seite erreichbar. Am Montag muss er
„Alles bereit." melden.

## Betrieb nach dem Start

- **Täglich 5 Minuten Moderation:** `API_URL=… ADMIN_TOKEN=… npm run moderation -- liste`, dann `verstecken`,
  `verwerfen` oder `sperren`. Löschwünsche: `loeschen <geraet-id> name|alles`.
- **Sicherung:** Backup des Webhostings in konsoleH nutzen und `api/daten/gluehlabor.sqlite` gelegentlich per FTP herunterladen.
- **Notbremse:** in konsoleH `api/index.php` umbenennen. Die App arbeitet auf den Handys lokal weiter, nichts geht verloren.

## Bewusst nicht in dieser Woche

Stand-Seiten mit Verteilung, getrennte Ansichten für Prüfstelle und Community, Fotos (brauchen R2), Bot-Schutz
(Turnstile), Paarvergleich, Abzeichen. Sie kommen in Woche 2, wenn echte Nutzung zeigt, was fehlt.

## Risiken

| Risiko | Gegenmaßnahme |
|---|---|
| FTP-Zugang oder SSL kommt nicht rechtzeitig | Ohne Server startet die App trotzdem, nur lokal. Dann wäre es kein Community-Start |
| Datenschutzerklärung nicht rechtlich geprüft | Entwurf beschreibt genau, was die App tut. Vor dem breiten Teilen prüfen lassen |
| iPhone löscht lokale Daten nach 7 Tagen | Hinweis „Zum Home-Bildschirm" ist eingebaut. Auf echten iPhones testen (Freitag) |
| Fake-Bewertungen oder Spam | Limits, Link-Sperre, Melden-Knopf, Moderation. Bot-Schutz folgt bei Bedarf |
| Viele Nutzer hinter einer Mobilfunk-Adresse | Limits großzügig (150 Geräte/Stunde, 240 Schreibzugriffe/Minute je Adresse) |
