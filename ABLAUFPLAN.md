# Ablaufplan: Start am Montag, 23.11.2026

Stand: Mittwoch, 18.11.2026. Das Ziel ist ein Start am Montag mit dem Kern: Server online (Hetzner), Bewerten ohne Konto,
QR-Code zum gemeinsamen Bewerten. Alles andere kommt danach.

## Wer macht was

| Tag | Du (David & Philip) | Ich |
|---|---|---|
| **Mi 18.11** | – | **Erledigt:** Server gehärtet, Melden, Löschen auf Anfrage, QR-Mitbewerten, Preisindex, Impressum und Datenschutz (Entwurf), iPhone-Hinweis, Startcheck, Moderations-Werkzeug. 317 Tests, Zwei-Geräte-Test mit echtem QR-Dekodieren |
| **Do 19.11** | **DNS** für gluehlabor.de auf den Hetzner-Server, `hetzner/README.md` durchgehen (oder mir Zugang geben), AV-Vertrag, **Betreiberangaben** (Name, Anschrift, E-Mail). Entscheiden: Altershinweis ja/nein | Serverpaket ist fertig und getestet. Beim Einrichten helfen, Startcheck, Betreiberangaben eintragen |
| **Fr 20.11** | **Test mit echten Handys**: iPhone und Android, zwei Geräte. QR scannen, offline erfassen, Homescreen-Installation. Fehler an mich | Fehler beheben, nachtesten |
| **Sa 21.11** | Generalprobe: erst zu zweit am Rechner, wenn möglich an einer echten Bude. Moderation einmal ausprobieren (Meldung auslösen, ausblenden). Datenschutz-Entwurf prüfen lassen | Letzte Korrekturen. Startcheck muss komplett grün sein |
| **So 22.11** | 5 bis 10 Freunde einladen (Soft-Launch). Link nur an sie | Beobachten, Fehler beheben. Danach Änderungsstopp, nur noch Fehlerbehebung |
| **Mo 23.11** | **Start:** Link teilen | Auf Fehler achten |

## Das brauche ich von dir (Reihenfolge nach Dringlichkeit)

0. **Domain gluehlabor.de**: gekauft. Beim Anbieter die DNS-Einträge `A` (und `AAAA`) für `gluehlabor.de` und `www` auf den Hetzner-Server setzen.
1. **Zugang zum Server**: Betriebssystem, welcher Webserver dort schon läuft (nginx, Apache, Caddy, Plesk), ob Docker installiert ist.
   Wenn du mir SSH nicht geben willst: Anleitung `hetzner/README.md`, sie ist für einen Durchlauf in etwa 30 Minuten geschrieben.
2. **Betreiberangaben** für das Impressum (nach § 5 DDG öffentlich einsehbar): Name, Straße und Hausnummer, PLZ und Ort, E-Mail,
   Hosting-Standort (Hetzner-Rechenzentrum). Tipp: eine eigene Adresse wie `kontakt@gluehlabor.de` statt der privaten.
3. **AV-Vertrag mit Hetzner** in der Konsole abschließen (zwei Klicks).
4. **Entscheidung Altershinweis:** Es geht um Alkohol. Soll die App „ab 18" ausdrücklich nennen? Ich habe nichts eingebaut.

## Startcheck

`npm run launch-check` meldet jeden offenen Punkt: Betreiberangaben, Server-Adresse, Server erreichbar, Bestandsdaten
hochgeladen, Schreiben nur von der eigenen Seite, Moderation gesperrt, Live-Seite erreichbar. Am Montag muss er
„Alles bereit." melden.

## Betrieb nach dem Start

- **Täglich 5 Minuten Moderation:** `API_URL=… ADMIN_TOKEN=… npm run moderation -- liste`, dann `verstecken`,
  `verwerfen` oder `sperren`. Löschwünsche: `loeschen <geraet-id> name|alles`.
- **Auslastung im Blick behalten:** `docker stats` und `docker compose logs`. Eine SQLite-Datei trägt Zehntausende Nutzer problemlos.
- **Sicherung:** täglich automatisch (`daten/sicherungen`), zusätzlich Hetzner-Backup des Servers einschalten.
- **Notbremse:** `docker compose stop`. Die App arbeitet auf den Handys lokal weiter, nichts geht verloren.

## Bewusst nicht in dieser Woche

Stand-Seiten mit Verteilung, getrennte Ansichten für Prüfstelle und Community, Fotos (brauchen R2), Bot-Schutz
(Turnstile), Paarvergleich, Abzeichen. Sie kommen in Woche 2, wenn echte Nutzung zeigt, was fehlt.

## Risiken

| Risiko | Gegenmaßnahme |
|---|---|
| DNS oder Serverzugang kommt nicht rechtzeitig | Ohne Server startet die App trotzdem, nur lokal. Dann wäre es kein Community-Start |
| Datenschutzerklärung nicht rechtlich geprüft | Entwurf beschreibt genau, was die App tut. Vor dem breiten Teilen prüfen lassen |
| iPhone löscht lokale Daten nach 7 Tagen | Hinweis „Zum Home-Bildschirm" ist eingebaut. Auf echten iPhones testen (Freitag) |
| Fake-Bewertungen oder Spam | Limits, Link-Sperre, Melden-Knopf, Moderation. Bot-Schutz folgt bei Bedarf |
| Viele Nutzer hinter einer Mobilfunk-Adresse | Limits großzügig (150 Geräte/Stunde, 240 Schreibzugriffe/Minute je Adresse) |
