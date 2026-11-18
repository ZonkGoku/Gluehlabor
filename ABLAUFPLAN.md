# Ablaufplan: Start am Montag, 23.11.2026

Stand: Mittwoch, 18.11.2026. Das Ziel ist ein Start am Montag mit dem Kern: Server online, Bewerten ohne Konto,
QR-Code zum gemeinsamen Bewerten. Alles andere kommt danach.

## Wer macht was

| Tag | Du (David & Philip) | Ich |
|---|---|---|
| **Mi 18.11** | – | **Erledigt:** Server gehärtet, Melden, Löschen auf Anfrage, QR-Mitbewerten, Preisindex, Impressum und Datenschutz (Entwurf), iPhone-Hinweis, Startcheck, Moderations-Werkzeug. 317 Tests, Zwei-Geräte-Test mit echtem QR-Dekodieren |
| **Do 19.11** | **Domain becherwerk.de kaufen** und **Cloudflare-Konto + API-Token + Account-ID** (siehe unten). **Betreiberangaben** für das Impressum: Name, Anschrift, E-Mail. Entscheiden: Altershinweis ja/nein | Sobald der Token da ist: Server anlegen, Datenbank migrieren, Geheimnisse setzen, veröffentlichen, 2025er Bestand hochladen, Adresse eintragen, Startcheck. Betreiberangaben eintragen |
| **Fr 20.11** | **Test mit echten Handys**: iPhone und Android, zwei Geräte. QR scannen, offline erfassen, Homescreen-Installation. Fehler an mich | Fehler beheben, nachtesten |
| **Sa 21.11** | Generalprobe: erst zu zweit am Rechner, wenn möglich an einer echten Bude. Moderation einmal ausprobieren (Meldung auslösen, ausblenden). Datenschutz-Entwurf prüfen lassen | Letzte Korrekturen. Startcheck muss komplett grün sein |
| **So 22.11** | 5 bis 10 Freunde einladen (Soft-Launch). Link nur an sie | Beobachten, Fehler beheben. Danach Änderungsstopp, nur noch Fehlerbehebung |
| **Mo 23.11** | **Start:** Link teilen | Auf Fehler achten |

## Das brauche ich von dir (Reihenfolge nach Dringlichkeit)

0. **Domain becherwerk.de kaufen** (ca. 3 bis 6 € im Jahr, günstigster deutscher Anbieter, ein Jahr, automatische Verlängerung an,
   keine Zusatzprodukte). Danach die Domain bei Cloudflare hinzufügen (Free-Tarif) und beim Anbieter dessen zwei Nameserver eintragen.
   Wichtig vor dem Start: Wer die App unter einer anderen Adresse benutzt hat, verliert dort seine lokalen Daten.
1. **Cloudflare-Konto** (kostenlos): dash.cloudflare.com/sign-up.
2. **API-Token**: „My Profile → API Tokens → Create Token", Vorlage „Edit Cloudflare Workers", dazu die Berechtigung „Account → D1 → Edit". Den Token gibst du nicht im Chat, sondern in einem sicheren Formular, das ich öffne.
3. **Account-ID** (Dashboard, rechte Seitenleiste, nicht geheim).
4. **Betreiberangaben** für das Impressum (nach § 5 DDG öffentlich einsehbar): Name, Straße und Hausnummer, PLZ und Ort, E-Mail. Telefon freiwillig.
   Tipp: Mit „Email Routing" bei Cloudflare (kostenlos, nach meinem Kenntnisstand) kann `kontakt@becherwerk.de` an deine private Adresse weiterleiten,
   dann steht deine private Adresse nicht im Impressum.
5. **Entscheidung Altershinweis:** Es geht um Alkohol. Soll die App „ab 18" ausdrücklich nennen? Ich habe nichts eingebaut.

## Startcheck

`npm run launch-check` meldet jeden offenen Punkt: Betreiberangaben, Server-Adresse, Server erreichbar, Bestandsdaten
hochgeladen, Schreiben nur von der eigenen Seite, Moderation gesperrt, Live-Seite erreichbar. Am Montag muss er
„Alles bereit." melden.

## Betrieb nach dem Start

- **Täglich 5 Minuten Moderation:** `API_URL=… ADMIN_TOKEN=… npm run moderation -- liste`, dann `verstecken`,
  `verwerfen` oder `sperren`. Löschwünsche: `loeschen <geraet-id> name|alles`.
- **Auslastung im Blick behalten:** Cloudflare-Dashboard, Workers und D1. Gratis-Grenzen: 100.000 Anfragen und
  100.000 geschriebene Zeilen pro Tag. Bei Dauerlast Workers Paid (ca. 5 $ im Monat).
- **Notbremse:** Läuft etwas aus dem Ruder, `wrangler delete` oder die Server-Adresse in `data/server.json`
  leeren und deployen. Dann arbeitet die App nur lokal weiter, nichts geht verloren.

## Bewusst nicht in dieser Woche

Stand-Seiten mit Verteilung, getrennte Ansichten für Prüfstelle und Community, Fotos (brauchen R2), Bot-Schutz
(Turnstile), Paarvergleich, Abzeichen. Sie kommen in Woche 2, wenn echte Nutzung zeigt, was fehlt.

## Risiken

| Risiko | Gegenmaßnahme |
|---|---|
| Cloudflare-Konto oder Token kommt nicht rechtzeitig | Ohne Server startet die App trotzdem, nur lokal. Dann wäre es kein Community-Start |
| Datenschutzerklärung nicht rechtlich geprüft | Entwurf beschreibt genau, was die App tut. Vor dem breiten Teilen prüfen lassen |
| iPhone löscht lokale Daten nach 7 Tagen | Hinweis „Zum Home-Bildschirm" ist eingebaut. Auf echten iPhones testen (Freitag) |
| Fake-Bewertungen oder Spam | Limits, Link-Sperre, Melden-Knopf, Moderation. Bot-Schutz folgt bei Bedarf |
| Gratis-Limits bei großem Zulauf | Beobachten, notfalls bezahlter Tarif |
