# Glühlabor (früher Becherwerk) – Hinweise für spätere Sitzungen

Glühwein-Prüfstelle von David & Philip. Der vollständige Auftrag steht in `BRIEF.md`. Vor größeren Änderungen lesen.

## Produkt

**Ausrichtung seit 18.11.2026: Community-Produkt.** Viele Leute sollen bewerten können, ohne
Registrierung. Ein Bewertender legt an der Bude einen Eintrag an und teilt ihn als QR-Code, die anderen
scannen und bewerten selbst (Schritt 2, noch offen). Dafür gelten die Ausschlüsse aus `BRIEF.md`
(„Keine Nutzerkonten für Fremde", „keine Social-Features") nicht mehr; frei bleiben Push,
Gamification und Teilen-auf-Social. Bewertungen von David & Philip laufen weiter als **„Prüfstelle"**
(Siegel, getrennt von der Community-Wertung).

- Betrieben von **David (lebt in Bayern) und Philip (aus Hamburg)**. Bewertet wird auf
  Weihnachtsmärkten **in ganz Deutschland**, nicht nur in Hamburg. Texte, Logo und Datenmodell
  müssen das tragen (keine „Hamburger Weihnachtsmärkte").
- Vorlage für die Ansichten war das alte Google Sheet „Dalip 2025 Christmas" mit den Tabs
  Rangliste (Gewichte + Saison-Schalter), Verkostung, Vergleich (Wiederholungstäter, „Wo wart ihr
  noch nie?"), Spickzettel, Statistik. Die App bildet alle Tabs ab.

**Ablaufplan für den Start (Mo 23.11.2026): `ABLAUFPLAN.md`.** `npm run launch-check` zeigt, was noch fehlt.

## Sprachen (Deutsch, Englisch)

`src/i18n/`: **der deutsche Text ist der Schlüssel**: `t('Rangliste')`, `t('Alle {n}', { n })`, `tn(n, '{n} Bewertung', '{n} Bewertungen')`. Englisch steht in `src/i18n/en.ts` (Schlüssel = deutscher Text; fehlt er, erscheint Deutsch). Neue Texte also deutsch schreiben **und** in `en.ts` ergänzen; `src/i18n/i18n.test.ts` schlägt fehl, wenn ein `t('…')` im Code keine Übersetzung hat oder Platzhalter abweichen. Gleiche deutsche Form für Ein-/Mehrzahl (z. B. „{n} Becher"): englische Einzahl als Schlüssel `„{n} Becher|1"`. Kriterien-Namen über `kriteriumLabel` (Becher = „Mug"). Die Sprache wird pro Gerät gemerkt (`gluehlabor.sprache`), ohne Wahl gilt die Browsersprache (de → Deutsch, sonst Englisch); Umschalter in Einstellungen, Seitenleiste und Kopfzeile am Rechner. Ein Wechsel zeichnet alles neu (`useSprache` in `App.tsx`). Auch Texte aus `data/anker.json` und `data/regeln.json`, Meldungen des Servers (`t(err.message)`) und die Befund-Sätze der Statistik laufen durch `t`. Der Server liefert weiter deutsche Meldungen, die App übersetzt sie. Impressum und Datenschutz haben eine englische Arbeitsübersetzung mit Hinweis, dass die deutsche Fassung maßgeblich ist. Zahlen: Punkt als Dezimaltrenner in beiden Sprachen, Preise `€4.50` (en) bzw. `4,50 €` (de).

## Stände und Bewertungen (seit 18.11.2026)

Ein Eintrag (Becher) ist **eine Bewertung einer Person**; ein **Stand** ist die Gruppe aller Bewertungen mit gleichem Namen (Kern: Groß/Klein, Satzzeichen, Emoji egal) **in derselben Stadt**; der Markt zählt nicht (`standIdent` in `src/lib/community.ts`, 1:1 in PHP). Angezeigt wird der häufigste echte Markt.
- **Name ist Pflicht** zum Bewerten (2–24 Zeichen, nicht eindeutig). Der Server antwortet ohne Namen mit `name-fehlt`, der Becher bleibt in der App `offen`. Die App fragt über `ui/nacht/NameBlatt.tsx` beim ersten Speichern, `Mitbewerten` verlangt ihn ebenfalls.
- **Mehrere Bewertungen desselben Stands am selben Abend sind erlaubt** (seit 26.11.2026, so gewollt: jeder Becher ist eine Bewertung, Gamification; vorher „eine je Gerät, Stand und Abend“, `schonBewertet` ist entfernt). Es bleibt das Tageslimit (100 je Gerät). **Durchschnitt je Person:** Wer einen Stand mehrfach bewertet, zählt im Durchschnitt nur einmal (`personVon` = Gerät; erst je Person mitteln, dann über die Personen; gilt für Gesamt-, Glühwein- und Drumherum-Note, Preis-Leistung und `kriterienMittel`; Bestandsdaten `import-*` und Einträge ohne Kennung zählen einzeln). `Gruppenwert.anzahl` = Zahl der Bewertungen (Becher, so steht es in den Listen), `Gruppenwert.personen` = Zahl der Bewertenden: danach richten sich „wenige Bewertungen“ (`MIN_BEWERTUNGEN` 3) und der Gleichstand in der Rangliste. **„Nochmal wie eben“** (`daten/wiederholen.ts`, Knopf im Ticket und auf der Stand-Seite): ein Tipp wiederholt die letzte Bewertung (Stand, Ort, Preis, Größe, Sorte, Noten, ohne Foto und Notiz) als neue, echte Bewertung; zählt im Rennen. `abendVon` (Datum, sonst Tag der Erfassung) gibt es weiter. Ausgeblendete zählen nicht. Anlegen eines Stands = erste Bewertung (keine leeren Stände). „Bewerten" auf der Stand-Seite füllt einen gesperrten Entwurf (wie der QR-Link).
- **Rangliste nach Ständen** (`src/lib/staende.ts`, `baueStaende`): Durchschnitt der Gesamtnoten aller Bewertungen. **Die Reihenfolge ist genau die angezeigte Zahl** (auf zwei Stellen), bei Gleichstand steht der Stand mit mehr Bewertungen vorn, dann nach Name; gleiche Zahl bei gleicher Bewertungsanzahl teilt den Platz (1, 1, 3). Seit 25.11.2026 keine versteckte Gewichtung mehr (vorher wurden Stände mit wenigen Bewertungen zum Gesamtmittel hingezogen, das hat niemand verstanden: 7.33 stand unter 6.89). Unter `MIN_BEWERTUNGEN` 3 steht nur der Hinweis „wenige Bewertungen“. Top Deals sortieren ebenso nach der angezeigten Preis-Leistung. Umschalter Alle / Prüfstelle / Community (`Quelle`, unter „Mehr Filter“); **die Gewichtung der Noten ist nur noch im Admin-Bereich sichtbar** (Moderation → Mehr, gilt nur auf dem Gerät des Admins; öffentlich nirgends mehr, auch nicht als „×3“); die Rangliste zeigt standardmäßig die laufende Saison 2026 (ältere unter „Mehr Filter“; der Merk-Schlüssel heißt seit 25.11. `gluehlabor.saison2`, damit alte „Alle“-Wahlen nicht greifen); **eine einzige Liste ohne Podest-Karten**, Zeilen: Rang, Name, Stadt, Note, Zahl der Bewertungen, Siegel und „Top Deal“ als kleine Marke, ohne Balken. Am Rechner ist die schwebende Leiste der Standard (Seitenleiste nur noch per Einstellung). Die Stand-Seite (`#/stand/<id>`, `ui/Stand.tsx`) zeigt beide Wertungen nebeneinander. Die Scoring-Regeln oben bleiben je Bewertung unverändert.
- **Prüfstelle = Super-User** ohne Konto: Gerät mit Prüfstellen-Code (Profil). Solche Geräte dürfen die Admin-Endpunkte auch mit ihrer Geräte-Anmeldung nutzen (`pruefeModeration`), also im Browser: `#/moderation` (`ui/Moderation.tsx`, `daten/moderation.ts`: Meldungen, Ausblenden, Sperren, Löschen auf Anfrage, Zugang entziehen) und auf der Stand-Seite „Stand pflegen" (umbenennen, Stadt/Markt, **zusammenführen**, ganz ausblenden; Endpunkt `POST /api/admin/stand-aendern`). `POST /api/admin/pruefstelle-zuruecksetzen` {behalten} entzieht allen anderen Geräten die Rechte (danach `PRUEFSTELLE_CODE` ändern; Siegel alter Becher bleibt).
- **Löschen für die Prüfstelle:** `POST /api/admin/entfernen` {ids} macht Bewertungen endgültig unkenntlich (Platzhalter bleibt, Meldungen erledigt; anders als „verstecken" nicht umkehrbar). Im Browser: `#/moderation` → „Alle Bewertungen" (suchen, wählen, löschen), auf der Stand-Seite je Bewertung „Löschen" und „Ganzen Stand endgültig löschen" (`entferne` in `daten/moderation.ts`).
- **Preis-Leistung ist berechnet, der Preis Pflicht** (`src/lib/preisleistung.ts`): Beim Speichern rechnet die App die Note `preisLeistung` aus der Glühwein-Note (Geschmack, Geruch, Temperatur) und dem Preis: **− 0,5 Punkte je Euro über dem Referenzpreis** (darunter plus), ganzzahlig 1–10. Referenzpreis = Median der Stadt (nur Alkohol-Glühwein, je 0,2 l umgerechnet), verrechnet mit dem Startwert 5,00 € (`REFERENZ_GEWICHT` 5, Schätzung 2025: ca. 5 €/Tasse). Alkoholfrei und Feuerzangenbowle: keine Preis-Leistung. Die Note bleibt in der Gesamtnote (Gewicht 2) und wird mit dem Eintrag gespeichert (unveränderlich, Server prüft nur 1–10). `preis` ist ohne Pfand und Pflicht (Server: „Der Preis fehlt.", nicht beim Admin-Import der 2025-Daten); `menge` (0,2/0,25/0,3 l, optional, Spalte `menge`, Migration 0003, PHP rüstet ältere Datenbanken selbst nach) rechnet auf 0,2 l um. **Top Deals:** Stände mit Ø-Preis-Leistung ≥ 8 (`TOP_DEAL`) tragen die Marke „Top Deal" (`DealMarke`), eigene Rangfolge (`Stand.deal`), Ansicht „Top Deals" in der Rangliste (`#/rangliste?deals=1`) und Kachel auf der Startseite. Die 14 Becher von 2025 behalten ihre handvergebene Note.
- **QR-Codes statt Strichcode:** Der Abriss-Stummel jeder Karte trägt einen echten QR-Code (`QrStummel` in `ui/nacht/Ticket.tsx`, Matrix aus `ui/nacht/qr.ts`), der den Stand bzw. die Bewertung öffnet; im Story-Bild groß (160 px, schwarz auf weiß, per Test mit jsQR lesbar; `KartenDaten.link`). **Netzdiagramm** (`ui/Netzdiagramm.tsx`, Geometrie `lib/netz.ts`): in der Detailansicht diese Bewertung gegen den Durchschnitt, auf der Stand-Seite Prüfstelle gegen Community (`kriterienMittel`). Fehlende Noten haben keinen Punkt, nie 0.
- **Prüfsiegel:** Ein Stand mit mindestens einer Bewertung der Prüfstelle trägt das goldene Siegel (`ui/nacht/PruefSiegel.tsx`) auf Sammelkarten, in Listenzeilen, auf der Stand-Seite und im Story-Bild (`KartenDaten.geprueft`).
- **Admin „Aufräumen“ (seit 25.11.2026)**, `#/moderation`: Reiter Stände · Doppelte · Meldungen · Bewertungen · Mehr. **Stände** (`ui/AdminStaende.tsx`): alle Stände in einer Liste, mehrere antippen, unten Leiste mit Name/Stadt/Markt und „Zusammenführen“ (mehrere) bzw. „Speichern“ (einer), „Ausblenden“, „Löschen“. Zusammenführen ändert nur Stand/Markt/Stadt der Bewertungen, der Name der Bewertenden bleibt an jeder Bewertung. **Doppelte** (`lib/dubletten.ts`): gleiche Stadt, ähnlicher Name (Tippfehler oder Name enthalten), Zusammenführen zu einem der Namen oder unter eigenem Namen.
- **Erfassen in zwei Schritten (seit 25.11.2026):** Schritt „Wo?“ (Stadt per Blatt ohne Marktschritt `OrtBlatt ohneMarkt`, Stand antippen aus der Liste der Stadt oder eintippen, Markt freiwillig als Chips), dann „Bewerten“ (Preis, Foto, Noten; Sorte/Nr./Notiz unter „Mehr Angaben“). QR-Zeile „Seid ihr zu mehreren?“ öffnet ein QR-Blatt (`nacht/QrBlatt.tsx`) schon vor dem Speichern; nach dem Speichern zeigt das Ticket den QR groß (`TeilenBlock`). Foto ohne `capture` (kein erzwungener Blitz), sichtbar im Ticket, groß im Detail (`foto-hero`) und als Streifen auf der Stand-Seite; Fotos liegen bisher nur auf dem Gerät, das sie gemacht hat.
- Nachträglich ändern geht seit 27.11.2026 (siehe „Eigene Bewertungen, Ändern, Fehlerhinweise“).

## Bedienung und Verständlichkeit (Audit vom 18.11.2026)

Leitlinie: **Ein Fremder muss in fünf Sekunden verstehen, was die App ist und was er tun soll.** Die Hauptnavigation hat nur Start · Rangliste · **+ Bewerten** · Mehr · Ich (`ui/nacht/Navigation.tsx`); Vergleich, Statistik, Hilfe & Regeln (Spickzettel), Einstellungen, Impressum, Datenschutz und Moderation hängen unter `#/mehr` (`ui/Mehr.tsx`), in der Seitenleiste als eigene Gruppe. Startseite (`ui/Uebersicht.tsx`): für Besucher ohne eigenen Becher der Willkommens-Block (ein Satz, drei Schritte, „Jetzt bewerten" / „Rangliste ansehen", Hinweis ab 18), darunter Auswahl „Die Besten in <Stadt>" (merkt sich die Stadt, `gluehlabor.startstadt`) und Saison; „Selbstkontrolle" gehört nur noch in die Statistik. Erfassung: der **Preis** ist ein eigener großer Bereich (`.preis-block`, mit Schnellwahl 4 bis 6 €, Größe daneben) direkt unter Stand und Ort; alle sieben Kriterien bleiben sichtbar und optional (keine Schnellbewertung, bewusst); je Kriterium fünf große Knöpfe 2/4/6/8/10 (`ui/NotenZeile.tsx`), zweites Antippen löscht, −/+ zum Feinstellen; Preis-Leistung nur Anzeige (auto). Preis-Schnellwahl: letzter Preis der Stadt zuerst (`daten/zuletzt.ts`). Die Seite scrollt, Messwert und Speichern sind unten fest. Ein Knopf heißt überall „Bewerten“ (en: „Rate“). Freie Stadteingabe wird geprüft (`istOrtsname`, TS + PHP). Rangliste: sichtbar nur Stadt, Saison, Ansicht (Gesamt/Top Deals); Wertung (Alle/Prüfstelle/Community), Markt und Gewichtung hinter „Mehr Filter“. Rahmen von Bedienelementen (`select.glas`, `button.glas`, Chips) nutzen `--nm-bedienung` (≥ 3:1). Noten werden zuerst als sortierte Balken gezeigt (`NotenBalken` in `ui/Netzdiagramm.tsx`, Stand-Seite: Prüfstelle gegen Community), das Netzdiagramm steht aufklappbar dahinter (Stand-Seite und Detail). Podest-Karten der Rangliste sind kompakt (`klein`, ca. 350 px statt 440 px hoch). Begriffe: Kriterium „Becher" heißt jetzt „Tasse" (Zählwort bleibt Becher), „Anker" heißt „?" („Was bedeutet …?"), die Gewichte (×3) stehen nur in den Einstellungen, „vorläufig" heißt „wenige Bewertungen", das Siegel „Von David & Philip getestet". Kleine „?" (`ui/nacht/HilfePunkt.tsx`) erklären Siegel und Preis-Leistung. **Mindestmaße:** Tippziele mindestens 44 px, Fließtext mindestens 12 px, Großbuchstaben-Etiketten mindestens 11 px (nur die Logo-Zeile hat 10 px).

## Stack

- **Vite 6 + Preact 10 + TypeScript**, Hash-Router (`#/erfassen`, `#/einstellungen`, …)
- **IndexedDB über Dexie**: lokaler Speicher ist die Wahrheit (`src/daten/db.ts`)
- **Community-Server** (`worker/`): Cloudflare Worker + D1 (SQLite), kein Konto, keine E-Mail.
  Jedes Gerät erzeugt selbst eine anonyme Kennung und einen Schlüssel (`holeGeraet`), der Server
  speichert nur den Hash. Lokaler Speicher bleibt die Wahrheit, der Server ist der gemeinsame Bestand.
  Endpunkte: `POST /api/geraete`, `GET|PUT /api/ich` (Name), `POST /api/pruefstelle` (Code),
  `POST|GET /api/becher` (GET öffentlich, Sync über aufsteigende `seq`), `POST /api/admin/{verstecken,sperren,import}`.
  Ausgeblendete Becher kommen als Platzhalter `{id, versteckt:true}`, damit Geräte sie löschen.
- **Gemeinsam bewerten per QR-Code** (`src/lib/besuch.ts`, `ui/Teilen.tsx`, `ui/Mitbewerten.tsx`): Jeder Becher
  bekommt eine Besuchs-Nr. (`besuchId`). Der QR-Code trägt nur Stand, Markt, Stadt, Sorte und diese Nr. als Link
  `…/#/mitbewerten?b=…&s=…&m=…&c=…&t=…` (reines ASCII, ca. 120 Zeichen, funktioniert ohne Netz). Wer scannt, sieht den
  Stand, wird freiwillig nach dem Namen gefragt und bewertet selbst; Stand und Markt sind dann gesperrt
  (`Entwurf.gesperrt`, „Anderer Stand" löst es). Alles aus dem Link wird wie eine Einreichung geprüft (`leseBesuch`)
  und nie als HTML eingesetzt. Die Teilen-Seite fragt alle 10 s nach, damit „Mit dabei" schnell aktuell ist.
  QR immer schwarz auf weiß, auch im dunklen Theme (`ui/Qr.tsx`, Bibliothek `qrcode-generator`).
- **Melden / Moderation**: `POST /api/melden` (Grund + Text, 20 je Gerät und Tag), Admin: `GET /api/admin/meldungen`,
  `verstecken`, `meldung-verwerfen`, `sperren`, `loeschen` (Löschen auf Anfrage: Name oder alles). Kommandozeile:
  `npm run moderation -- liste` (siehe Kopf von `worker/scripts/moderation.ts`).
- **Datenschutz im Server**: Adressen werden nie im Klartext gespeichert, nur gehasht mit Salz (`IP_SALT`) und Tag,
  nur Schreibzugriffe werden gezählt, ein täglicher Lauf löscht abgelaufene Zähler. Die öffentliche Liste wird am
  Rand 5 s zwischengespeichert, vom Browser nie (`cache: 'no-store'` in `api.ts`).
- **Sync** (`src/daten/sync.ts`): anmelden → Name senden → offene Becher senden → neue holen. Ein Becher
  bleibt lokal `offen`, bis der Server ihn angenommen hat. `API_URL` (aus `data/server.json`, überschreibbar mit der Build-Variable `VITE_API_URL`) leer = kein Server, die App arbeitet nur lokal und sagt das („nur lokal").
- **Regeln für Fremde** stehen in `src/lib/community.ts` und gelten in App UND Server (derselbe Code):
  Name 1–24 Zeichen, keine Links, reservierte Namen (David, Philip, Prüfstelle, Admin …) nur für die
  Prüfstelle; Becher werden streng geprüft und bereinigt, Name/Kennung/Siegel setzt nur der Server.
  Das Siegel „Prüfstelle" hängt am Code (Einstellungen → Prüfstelle), nie am Namen.
  Limits: 100 Becher je Gerät und Tag, 150 neue Geräte je Adresse und Stunde, 240 Schreibzugriffe je Adresse und Minute (viele Besucher teilen sich eine Mobilfunk-Adresse).
- Der Name steht als Momentaufnahme an jeder Bewertung. Gibt sich ein Gerät zum ersten Mal einen Namen,
  bekommen seine bisher anonymen Becher ihn rückwirkend; schon benannte bleiben unverändert.
- **PWA** über `vite-plugin-pwa` (generateSW, `registerType: 'prompt'`). `src/daten/update.ts` spielt
  neue Versionen sofort ein, nur nicht auf `#/erfassen` (dort wartet das Update, bis man die
  Erfassung verlässt). Startadresse der installierten App ist die Startseite (`start_url: './#/'`),
  nicht die Erfassung. Entwurf und lokale Becher überstehen jedes Neuladen.
- **Vitest** für alle reinen Funktionen. `npm test`, `npm run typecheck`, `npm run build`.
- **Server lokal**: `npm run worker:migrate` (einmal), `npm run worker:dev` (Port 8787, Geheimnisse
  in `worker/.dev.vars`, nicht im Repo), `npm run worker:seed` mit `API_URL` und `ADMIN_TOKEN` lädt die CSV
  als Prüfstellen-Becher. App gegen den lokalen Server: `VITE_API_URL=http://localhost:8787 npm run dev`.
- **Hosting (gewählt): Hetzner Webhosting S** (Shared Hosting, Apache, PHP, kein Root, kein Node/Docker). `php/api/` (index.php, lib/regeln.php, lib/db.php, lib/app.php) ist die PHP-Fassung des Servers, SQLite in `api/daten/` oder MySQL (config). **Sie ist eine 1:1-Übertragung von `worker/src/app.ts` und `src/lib/community.ts`: Änderungen dort müssen in PHP nachgezogen werden.** Gesichert durch: dieselben Server-Tests gegen PHP (`API_ZIEL=php-sqlite|php-mysql npx vitest run worker/test/app.test.ts`, Ziele in `worker/test/ziel.ts`), `php/test/regeln.test.ts` (Regeln und Adress-Hash gegen TypeScript) und einen Browser-Test gegen echtes Apache + mod_php (nur manuell). Build: `npm run build:webhosting` (`scripts/webhosting.mjs`, `VITE_API_URL=/`, erzeugt `out/webhosting` mit `.htaccess` aus `php/htaccess.txt`). Deploy: `.github/workflows/hetzner.yml` (FTPS per lftp, Secrets siehe `hetzner/WEBHOSTING.md`). Authorization wird zusätzlich als `X-Auth` gesendet (manche Hoster entfernen es). Sync-Nummern entstehen in einer Transaktion mit gesperrter Zählerzeile (`zaehler`). Domain gluehlabor.de, Marke in `src/marke.ts`. GitHub Pages bleibt ohne Server (nur lokal).
- **Nicht bei Suchmaschinen:** Meta `robots noindex` in `index.html`, Header `X-Robots-Tag` (`php/htaccess.txt`, `php/api/index.php`, `server/static.ts`), `public/robots.txt` sperrt bewusst nichts (sonst sieht Google das noindex nicht). `launch-check` prüft alle drei.
- **Impressum:** privates Spaßprojekt, Betreiber Philip Behrend, Hamburg (bewusst ohne Straße, `hinweise()` in `src/lib/betreiber.ts`); E-Mail ist Pflicht für den Start und noch offen.
- **Sicherung:** `php/api/lib/sicherung.php` (nur CLI, per Cronjob Manager täglich), SQLite-Kopie bzw. JSON.gz bei MySQL, 14 bleiben.
- **Alternativen, nicht der Plan:** `server/` + `Dockerfile` + `hetzner/README.md` (Node-Server für einen Cloud-Server mit Root, getestet) und `worker/` (Cloudflare).
- **Server bei Cloudflare veröffentlichen** (Alternative, braucht Konto): `wrangler d1 create gluehlabor`, `database_id` in
  `worker/wrangler.toml` eintragen, `wrangler d1 migrations apply gluehlabor --remote`,
  `wrangler secret put ADMIN_TOKEN`, `PRUEFSTELLE_CODE` und `IP_SALT`, `wrangler deploy --config worker/wrangler.toml`,
  danach die Worker-Adresse in `data/server.json` eintragen, `worker:seed` ausführen und `npm run launch-check` laufen lassen.
- **Deploy**: `.github/workflows/deploy.yml` veröffentlicht bei jedem Push auf `main` den Stand von `main`. Solange `main` nicht Standard-Branch ist, läuft der Deploy über einen workflow_dispatch auf dem Standard-Branch (Pages-Umgebung erlaubt nur den Standard-Branch). Die Seite liegt
  unter https://zonkgoku.github.io/Gluehlabor/ . Pages → Source = „GitHub Actions" (ist gesetzt).
- `base: './'` (relativ) plus Hash-Router: kein Repo-Name im Build, keine weiße Seite
  durch falsche Unterpfade.

## Verzeichnisse

```
data/                    Daten, nicht Code
  gluehwein-2025.csv     Bestandsdaten: beim ersten Start lokal importiert UND per worker:seed als Prüfstelle auf den Server
  anker.json             Ankerdefinitionen je Kriterium (werden sich ändern)
  staedte.json           Koordinaten je Stadt für die Deutschlandkarte (fehlt eine Stadt, steht sie nur in der Liste)
  betreiber.json         Name, Anschrift, E-Mail für Impressum und Datenschutz (Pflicht vor dem Start)
  server.json            Adresse des Community-Servers (leer = nur lokal)
  maerkte.json           gepflegte Marktlisten je Stadt (36 Städte, Namen eindeutig, siehe maerkte.test.ts) + „Sonstiger"
  regeln.json            Regeln des Spickzettels
worker/                  Community-Server: src/app.ts (alle Endpunkte), migrations/, test/, scripts/seed.ts
src/lib/                 REINE Funktionen ohne UI/DOM, alle getestet
  modell.ts              Typen, Kriterien, Default-Gewichte
  scoring.ts             Wertung, Urteil, Rangliste  ← Kern
  csvImport.ts           CSV → Einträge
  auswertung.ts          Filter, Rangliste mit Wertung, Urteilsverteilung, Jahresvergleich, Markt-Checkliste
  statistik.ts           Kennzahlen, Korrelationen, Pegel, Befunde als Sätze
  community.ts           Namen- und Einreichungsprüfung (App + Server), Anzeigename
  besuch.ts              QR-Link bauen und lesen (gemeinsamer Besuch)
  preisindex.ts          Glühwein-Preisindex je Stadt (Median, ab 5 Meldungen)
  betreiber.ts           Prüfung der Betreiberangaben
  installhinweis.ts      „Zum Home-Bildschirm"-Hinweis für iPhone im Browser
  orte.ts                Märkte ↔ Städte, freie Eingabe „Markt, Stadt"
  startseite.ts          Standard-Saison, Saison-Tag, Abend, Saisonverlauf, neueste Becher, Kennzahlen
  karte.ts               Projektion und Umriss der Deutschlandkarte, Kartenpunkte
  ortssuche.ts           Ortssuche (Umlaute, ß, Rang nach Einwohnern), nächste Orte, beliebte Städte, Märkte je Stadt
  standvorschlag.ts      Vorschläge beim Erfassen (Stand existiert schon?), Schreibweise vereinheitlichen
  anker.ts, abend.ts, format.ts, veroeffentlichung.ts
src/daten/               Speicher und Netz: db.ts (inkl. Gerätekennung), api.ts, sync.ts, update.ts, entwurf.ts, foto.ts, config.ts
src/ui/                  Preact-Komponenten. KEINE Rechenlogik hier (auch keine Schwellenwerte).
  Geruest.tsx            Tab-Leiste (Telefon) / Seitenleiste (Rechner)
  Uebersicht (= Startseite), Rangliste, Detail, Vergleich, Statistik, Spickzettel, Einstellungen, Erfassen
  Deutschlandkarte.tsx, Saisonverlauf.tsx  Bausteine der Startseite
  Profil.tsx             Name, Verbindung zum Server, Prüfstellen-Code (Community-Einstellungen)
  Teilen.tsx, Mitbewerten.tsx, Qr.tsx      QR-Code zeigen / Einladung annehmen
  Rechtliches.tsx        Impressum und Datenschutz (Text = Entwurf, nicht rechtlich geprüft)
  Einstellungen.tsx      Gewichtung, gemeinsamer Datenbestand (Sync-Knopf), Darstellung. Kein Token (das GitHub-Token-Formular ist am 18.11. auf Wunsch entfernt)
  daten.ts               Live-Hooks (Einträge, Gewichte, Saison-Auswahl)
src/styles.css           Tokens beider Themes + Erfassungsscreen
src/app.css              Gerüst und Auswertungsansichten
data/orte.json          ca. 4.100 Orte in Deutschland und Österreich (GeoNames, CC BY 4.0, erzeugt von scripts/orte.mjs; Quelle im Impressum nennen). Wird nachgeladen (eigener Chunk, 49 KB gzip)
public/                  logo.png, logo-klein.png (Linien verstärkt für kleine Größen; das richtige Logo: zwei Köpfe mit Mützen, Kolben mit Tasse, „GLÜHLABOR"), favicon.png, App-Symbole (icon-*.png, apple-touch-icon.png), og.jpg (Link-Vorschau). Alles erzeugt aus assets/logo-original.jpeg mit scripts/logo.mjs bzw. scripts/og.mjs
scripts/launch-check.ts  Startcheck (npm run launch-check)
scripts/logo.mjs         erzeugt alle Logo- und Icon-Dateien aus assets/logo-original.jpeg (Playwright aus der Umgebung)
```

## Anzeige in Sternen (seit 25.11.2026)

**Eingabe und Anzeige sind Sterne von 0 bis 5**, gespeichert und gerechnet wird weiter 1 bis 10 (ein Stern = 2 Punkte). Die Eingabe sind fünf große Knöpfe 1 bis 5 (Wert 2, 4, 6, 8, 10), −/+ rückt um einen halben Stern. Angezeigt wird immer `sterneText(punkte)` bzw. `halbSterne(note)` aus `src/lib/format.ts` (eine Stelle, Punkt als Trenner) im Google/Amazon-Stil (`ui/nacht/SterneWert.tsx`): `SterneZeile` = Zahl, fünf Sterne mit anteiliger Füllung, Anzahl in Klammern (Listen), `SterneGross` (Stand-Seite), `Sterne` (nur die Sterne, auch auf der Sammelkarte, im Erfassungsfuß und im Story-Bild), `Stern` (einzeln; die Eingabe in `NotenZeile` besteht aus fünf antippbaren Sternen), `SterneWert` (Zahl mit kleinem Stern, Admin). Farben `--nm-stern` und `--nm-stern-leer` in `nacht.css`. Zum Ausprobieren gibt es unter Moderation → Mehr einen Umschalter für das Symbol (Stern, Schneeflocke, Glühweinbecher; `setzeSymbol`, nur auf dem eigenen Gerät, Standard Stern). Beurteilung am 25.11.: Stern ist am besten lesbar, die Flocke wird bei 16 px zum Klecks und halbe Füllung sieht unsauber aus, der Becher füllt wie Glühwein von unten, kollidiert aber mit dem Kriterium „Tasse“. `sterne1(punkte)` in `scoring.ts` = `round(punkte × 5) / 10`. **Rangliste, Plätze und Urteil richten sich nach diesem angezeigten Wert** (Urteil: `sterne1(gesamt) × 2` gegen 8/6/5/4, also 4.0 Sterne = „Nachschenken“, 3.0 = „Richtig gut“, 2.5 = „Geht klar“, 2.0 = „Einmal reicht“). Gleiche Sternzahl: mehr Bewertungen zuerst. **Öffentlich gibt es keine 1–10-Zahlen mehr** (Detail, Stand-Seite, Spickzettel-Regeln, Hilfetexte: alles Sterne, ¼ Stern je Euro bei Preis-Leistung). Einzige Ausnahmen sind Admin-Seiten: Statistik (Selbstkontrolle der 1–10-Skala, nur für Prüfstellen-Geräte, aus Mehr und Seitenleiste entfernt) und der Gewichtungs-Editor.

## Abzeichen, Stufen und Glühwein-Pass (seit 25.11.2026, „Phase 1“)

Gamification **ohne Anmeldung**: `src/lib/abzeichen.ts` rechnet alles aus den Bewertungen dieses Geräts (`meine` = `geraet === eigene Kennung`, ohne Bestandsdaten), nichts wird gespeichert. 10 Abzeichen (Erster Schluck, Stammgast 10, Städtereise 3 Städte, Marktforscher 5 Märkte, Treue 3 Abende, Nachtschwärmer nach 22 Uhr, Fotograf 5, Schreiberling 3 Notizen, Gruppenführer = eigener QR-Besuch mit 2 weiteren Geräten, Top-Deal-Jäger), Stufen Neuling/Probierer 1/Lehrling 3/Kenner 10/Glühwein-Meister 25/Legende 50, Stempel je Stadt. Oberfläche: `ui/Pass.tsx` oben im Profil (`#/profil`, Reiter „Ich“); nach dem Speichern zeigt das Ticket ein Banner „Neues Abzeichen“ (`neueAbzeichen`). Texte sind deutsche Schlüssel in der Lib, die UI übersetzt sie mit `t(name)`: **neue Abzeichen brauchen Einträge in `en.ts`** (der Test findet dynamische Schlüssel nicht). Grenzen: Abzeichen hängen am Gerät (neues Handy = leer, bis es ein Konto gibt, „Phase 2“); sie werden live berechnet, Top-Deal-Jäger kann also wieder verschwinden, wenn der Stand kein Top Deal mehr ist. Geplant als Phase 2: optionales Konto per E-Mail-Link (Geräte zu einem Profil verbinden), siehe Gespräch vom 25.11.

## Schlittenfahren (Beta, seit 26.11.2026; zuerst Kamelrennen, dann Schlittenrennen)

Eigenes Spiel unter „Mehr“ (`#/schlittenfahren`, `#/schlittenfahren/<id>`, alte Links `#/schlittenrennen…` und `#/kamelrennen…` gehen weiter; `ui/Schlittenfahren.tsx`, Zeichnungen und Texte `ui/schlitten/Bahn.tsx`, Laden `ui/schlitten/laden.ts`, meine Rennen `ui/schlitten/meine.ts`, Leiste und Startseiten-Karte `ui/schlitten/RennenLeiste.tsx`, Rückmeldung im Ticket `ui/schlitten/Fortschritt.tsx`, Siegerbild `ui/nacht/rennenBild.ts`, Rechnung `src/lib/rennen.ts`, Zugriff `daten/rennen.ts`). **Bewusst neutral** (keine religiösen Motive; Schlitten statt Kamel/Rentier/Becher). **Ein Schritt = eine Bewertung dieses Geräts, egal an welchem Stand und auch mehrere am selben Stand** (Gamification, so gewollt) nach dem Beitritt und vor dem Ende; vom Server abgelehnte (`sync === 'abgelehnt'`) und Bestandsdaten (`import-*`) zählen nicht. Hinweis „Ab 18, trink verantwortungsvoll“ steht auf der Seite, keine Preise.
- **Nur eigene Rennen mit Freunden** (ein offenes „Wochenrennen für alle“ gab es kurz, Tester haben es nicht verstanden, am 27.11. wieder entfernt, auch im Server): **Name, Fahrzeug, Farbe und Fahrer-Foto stehen direkt auf der Seite** (28.11., Tester: „kann keinen Namen und keine Farbe wählen“; vorher steckte die Wahl hinter einem kleinen Link), darunter ein Knopf startet „Rennen von <Name>“ mit 5 Schritten; beim Beitreten ebenso direkt sichtbar; „Name und Länge des Rennens ändern“ öffnet die volle Eingabe (früher `schnellRennen`/`trittMitStandardBei`, entfernt), die volle Eingabe: (Name, **Länge 2 bis 50 Schritte**, Schnellwahl 3/5/10/20 und −/+, Name und Farbe des Schlittens, eine von 8). Einladen per QR/Link/Code (8 Zeichen); 14 Tage Laufzeit, höchstens 12 Teilnehmer, Beitreten ohne Konto über die Gerätekennung; Verlassen (jeder) und Löschen (nur Ersteller) mit Rückfrage.
- **Sichtbar, dass man fährt (Tester-Feedback 27.11.):** schmale **Leiste unter der Kopfzeile auf jeder Seite** („Rennen: Feierabend · Platz 1 · 3/5“ mit Balken, `RennenLeiste`, nicht auf den Rennseiten), **Karte auf der Startseite** (`RennenKarte`: dein Rennen mit Platz, sonst Einladung zum Starten), im Ticket je Rennen ein Streifen mit Satz zur Lage.
- **Spannung:** `lage()` liefert „Du führst: 2 Schritte vor Ben“ / „Du bist 1 Schritt hinter …“ / „Gleichauf …“ + „Noch n bis ins Ziel“ (`lageText`), Marke „vorn“, bei vielen Fahrern zeigt die Bahn die Besten und dich (`sichtbareBahnen`). **Nach dem Bewerten** rückt der Schlitten im Ticket vor (`MiniBahn`). **Ende:** Sieger = wer zuerst im Ziel ist, sonst bei Zeitablauf wer die meisten Schritte hat (mindestens einen); Siegerpodest, Konfetti (CSS, bei „Bewegung reduzieren“ aus), „Ergebnis teilen“ als Story-Bild.
- **Server** (TS `worker/src/app.ts` UND PHP `php/api/lib/app.php`, Tabellen `rennen`, `rennen_teilnehmer`, Migration `0004_rennen.sql`, PHP legt/rüstet sie selbst nach): `POST /api/rennen` (anlegen, 5 je Gerät und Tag, Ziel 2–50), `POST /api/rennen/beitreten`, `POST /api/rennen/verlassen`, `POST /api/rennen/loeschen`, `GET /api/rennen/<id>` (öffentlich, liefert `rennen.ersteller`). Der Server speichert **keine Schritte**: jede App rechnet sie aus den öffentlichen Bewertungen. Im Feld und in der Datenbank heißt der Schlitten weiter `kamel`. Tests: `src/lib/rennen.test.ts`, „Schlittenfahren“ in `worker/test/app.test.ts` (läuft gegen TS, php-sqlite, php-mysql).
- **Offen:** Sieger-Chronik, Schlitten tauschen, Namen der Fahrer sind öffentlich und nur wie Namen sonst geprüft (keine Moderation einzelner Schlitten).

## Eigene Bewertungen, Ändern, Fehlerhinweise (seit 27.11.2026, Tester-Feedback)

- **Meine Bewertungen** (`#/meine`, `ui/MeineBewertungen.tsx`, Karte oben auf „Ich“ und **Symbol im Kopf, sobald man selbst bewertet hat**; am Telefon ersetzt es dort das Hilfe-Symbol, am Rechner stehen beide; unter 400 px Breite entfällt der Sync-Punkt im Kopf, damit alles passt, geprüft bei 320 bis 412 px): eigene Rangliste (je Stand mein Durchschnitt, beste zuerst) und alle eigenen Bewertungen mit Ändern; abgelehnte zeigen den Grund mit „Nochmal senden“ und „Löschen“.
- **Bewertung nachträglich ändern** (`#/aendern/<id>`, `ui/Aendern.tsx`, Knopf auch in der Detailansicht): Sterne, Preis, Größe, Notiz; Stand, Ort und Zeitpunkt bleiben. Server `POST /api/becher/aendern` (TS und PHP, nur eigene, nicht ausgeblendete Bewertung; dieselbe Prüfung wie beim Einreichen; fehlende `menge`/`sorte`/`notiz` werden gelöscht; neue Sync-Nummer, damit alle Geräte die Änderung holen). App: `LokalerEintrag.aenderung` markiert „Änderung noch nicht gesendet“ (`sendeAenderungen` in `sync.ts`, vor `holeBecher`; 404 = Bewertung weg, 422 = Grund in `syncFehler`); noch nicht gesendete oder abgelehnte Bewertungen gehen als ganze Bewertung erneut. `holeBecher` überschreibt lokale Einträge mit offener Änderung nicht.
- **Probleme sichtbar** (`ui/SyncProblem.tsx`, in `Geruest`): roter Hinweis oben, wenn der Server den Namen ablehnt (mit Eingabefeld für einen anderen) oder Bewertungen nicht annimmt (Grund, Tippen führt zu `#/meine`). Beim Speichern in `Erfassen` fängt `speichern` Fehler ab und zeigt sie am Knopf.
- **Sparmodus** (`gluehlabor.sparmodus` = auto | an | aus, Einstellungen → Darstellung; `data-lite` am `<html>`, gesetzt in `public/theme-init.js` vor dem ersten Zeichnen und in `daten/darstellung.ts`): ohne `backdrop-filter`, Schnee, Leuchten, Dauerbewegung. **Automatisch an auf Android und bei ≤ 4 GB Speicher oder ≤ 4 Kernen** (Tester: App friert auf Android ein; gemessen mit 6-fach gebremster CPU: Erfassung 28 → 58 Bilder/s). Ursache nicht auf echtem Gerät bestätigt.
- **Schwebende Leiste unten** (`data-schwebende-leiste`): verschwindet, solange ein Eingabefeld Fokus hat (`data-tastatur`, sonst sprang sie mit der Android-Tastatur mitten auf den Bildschirm); `touch-action: manipulation` gegen Doppeltipp-Zoom.
- **Erfassen für Neulinge:** zuerst nur das Kriterium „Geschmack“, die übrigen sechs hinter „Weitere Sterne vergeben“ (Wahl pro Gerät in `gluehlabor.alleSterne`, offen, sobald schon weitere Sterne gesetzt sind).

## Fahrzeuge, Fotos, Galerie, Fahrer-Foto (seit 27.11.2026, Tester-Wunsch)

- **Fahrzeug wählen** (Schlitten, Rennwagen, Rentier, Tasse; `src/lib/fahrzeuge.ts` beschreibt sie einmal, SVG `ui/schlitten/FahrzeugBild.tsx` und Canvas `ui/nacht/rennenBild.ts` zeichnen daraus). Feld `fahrzeug` an `rennen_teilnehmer` (Migration `0005_fahrzeug.sql`, PHP rüstet nach), Feld heißt weiter `kamel` für den Namen.
- **Fotos für alle sichtbar** (Migration `0006_fotos.sql`, Tabelle `fotos`, Base64 als Text, damit D1/SQLite/MySQL/PHP gleich laufen): beim Erfassen Kästchen „Foto für alle sichtbar“ (**ausdrückliche Einwilligung je Foto**, Server verlangt `einwilligung: true`; Wahl pro Gerät in `gluehlabor.fotoOeffentlich`). Die App erzeugt Groß (≤ 1024 px, ≤ 390 KB) und Klein (240 px) im Canvas, das entfernt EXIF/Ort. Endpunkte `POST /api/foto`, `GET /api/foto/<id>?g=klein` (öffentlich), Löschen/„privat machen“ durch den Besitzer, Admin „Foto ausblenden“ (`versteckeFoto`). Limits in `LIMITS` (30 je Gerät und Tag, Gesamtdeckel `fotosGesamtMaxBytes` 1,5 GB, **Hetzner-Speicher noch nicht geklärt**). Bewertungen tragen `foto` (URL) aus dem Listen-Query. Sync lädt hoch in `sendeFotos`.
- **Galerie** `#/fotos` (`ui/Fotos.tsx`, Streifen `FotoLeiste` auf der Startseite, Eintrag unter „Mehr“), Vorschaubilder in Rangliste/Stand-Zeilen (`RangZeile bild`), Stand-Seite `FotoStreifen`. Datenschutz-Text (`Rechtliches.tsx`) nennt Fotos; **Entwurf, nicht geprüft**.
- **Fahrer-Foto nur lokal** (`daten/gesicht.ts`, Einstellung `gesicht`, 160-px-Quadrat): erscheint nur auf dem **eigenen** Fahrzeug im Rennen (Bahn, MiniBahn, Leiste), wird **nie hochgeladen**; andere sehen nur das Fahrzeug. Ein Upload von Gesichtern auf den Server ist bewusst nicht gebaut (erst Datenschutzprüfung, Einwilligung, Moderation).

## Übersicht und Menüs entrümpelt (28.11.2026, UI/UX-Audit nach Tester-Feedback „schwer zurechtzufinden“)

- **Gesamtübersicht** `ui/Gesamt.tsx` oben auf der Startseite (und als Kennzahlen auf `#/entdecken`): Stände · Märkte · Städte · Bewertungen, alle Saisons, ohne Ausgeblendete. Rechnung `gesamtZahlen` in `lib/startseite.ts` (Stand = `standIdent` mit Stadt; Märkte zählen je Stadt, „Sonstiger“ ist kein Markt).
- **Kopfzeile am Telefon:** nur Logo, Sprache, Hilfe (bzw. „Meine Bewertungen“, sobald man bewertet hat) und Sync-Punkt; der Hell/Dunkel-Schalter ist nur noch am Rechner im Kopf, am Telefon unter Einstellungen.
- **Mehr** ist eine kompakte, gruppierte Liste (Entdecken · Hilfe und Einstellungen · Prüfstelle nur für Prüfstellen-Geräte) statt acht großer Karten; „Vergleich“ hängt nur noch an der Karte auf `#/entdecken`; der alte Text vom „Wochenrennen für alle“ ist weg.

### Umfassendes Audit am 28.11.2026 (Telefon 390 und 320 px, Rechner 1280 px, de/en, mit Beispieldaten)

Messung per Playwright (Tippflächen < 44 px, Schrift < 11 px, Seitenüberlauf), dazu Sichtprüfung aller Hauptseiten und des Bewerten-Ablaufs. Behoben: Preise in „Glühwein-Preise“ umbrachen („5,50 / €“); Einstellungen: Link „Name und Prüfstelle“ als kaputte Box; „Zurück“-Link, „Diesen Eintrag melden“, Impressum/Datenschutz jetzt ≥ 44 px; **Erfassen: Reihenfolge Preis → Sterne → Foto → Mehr Angaben → QR („Seid ihr zu mehreren?“)**, vorher stand der QR-Block vor den Sternen; „Mehr Angaben“ hat einen Pfeil; Fußzeile „Tippe oben auf die Sterne“ statt „0 von 6 bewertet“; Stand-Seite: Bewerten-Knopf am Telefon oben statt erst nach ca. 1000 px; Zählungen heißen überall „Bewertungen“ (nicht „Becher“: Karte, Saisonverlauf, Ortsblatt, Vergleich, Ticket); lange Standnamen in Listen gehen über zwei Zeilen statt abgeschnitten; englisch heißt „Rangliste“ jetzt „Ranking“ (passt in die Tab-Leiste bei 320 px). **Bewusst offen:** Balken im Saisonverlauf (13 px breit, Diagramm); Vergleich-Tabelle muss seitlich gewischt werden und ist mit 5000 px sehr lang (Randansicht aus dem alten Sheet, nur über „Alle Märkte“ auf Entdecken erreichbar); „Platz 1 von 48“ im Detail zählt Einzelbewertungen, die Rangliste aber Stände; „Ich“-Seite lang (Abzeichen); Startseite hat sechs Blöcke. Nicht geprüft: echtes Gerät, Seitenleiste am Rechner, Hell/Dunkel-Kontraste per Messung.

## Rückmeldung, Bayern-Fokus, Platz-Angabe (28.11.2026)

- **„Was fehlt dir?“** (`#/feedback`, `ui/Feedback.tsx`, unter „Mehr“): freier Text (3–1000 Zeichen), anonym. Server `POST /api/feedback` (TS und PHP, Tabelle `rueckmeldungen`, Migration `0007_rueckmeldungen.sql`, PHP legt sie selbst an, 10 je Gerät und Tag), Prüfstelle liest `GET /api/admin/feedback` (auf derselben Seite sichtbar, `daten/rueckmeldung.ts`). Tests „Rückmeldungen“ in `worker/test/app.test.ts`.
- **Platz im Detail und im Ticket** ist der Platz des **Stands** („Stand: Platz 1 von 12“), nicht der Rang der einzelnen Bewertung. Ich-Seite: Abzeichen sind eingeklappt, solange noch keines erreicht ist; Startseite: Rennen-Karte erst nach der ersten eigenen Bewertung.
- **Bayern zuerst (Wunsch von Philip):** Märkte-Import (`scripts/maerkte-osm.mjs`, Workflow „Märkte aktualisieren“): **Overpass antwortet vom GitHub-Runner aus nicht (alle Abfragen Zeitüberschreitung, Läufe vom 28.11.)**, deshalb lädt der Workflow standardmäßig den Geofabrik-Auszug `germany/bayern` (Eingabe `extrakt`, z. B. `austria`), filtert mit osmium auf Markt-Tags (`GEOJSONSEQ` für das Skript) und das Skript ordnet über den nächsten Ort zu; ohne `extrakt` bleibt der Overpass-Weg (`REGION=bayern|alle`). Der Geofabrik-Weg läuft (Lauf vom 28.11.: 2221 Objekte), **aber OpenStreetMap liefert für Bayern kaum echte Weihnachtsmärkte** (Weihnachtsmärkte sind dort fast nicht eingetragen; der erste Treffer-Satz bestand aus Wildschutzgebieten, Skiliften u. Ä., Pull Request #1 wurde zurückgenommen, `data/maerkte-osm.json` ist wieder leer). Das Skript filtert solche Namen jetzt aus, taugt aber kaum für die Marktliste: **die Märkte besser von Hand pflegen (`data/maerkte.json`)**. In `data/maerkte.json` stehen jetzt auch Rosenheim, Traunstein, Bad Reichenhall, Berchtesgaden, Garmisch-Partenkirchen, Passau, Ingolstadt, Landshut, Freising, Erding, Wasserburg, Bad Tölz, Prien, Miesbach mit **allgemeinen Marktnamen** („Christkindlmarkt Rosenheim“): aus dem Gedächtnis, nicht geprüft, bitte durch echte Namen ersetzen. Test auf echten Handys: `TESTPLAN.md`.

## Figuren auf dem Schlitten (28.11.2026, Tester-Idee „vorgefertigte Gesichter“)

Zehn gezeichnete Figuren (Bär, Fuchs, Pinguin, Schneemann, Eule, Hase, Katze, Roboter, Außerirdischer, Mütze; `src/lib/avatare.ts`, wie die Fahrzeuge als Teile-Liste für SVG `FahrzeugBild`/`AvatarBild` und Canvas `rennenBild.ts`). **Alle im Rennen sehen sie** (anders als das Fahrer-Foto, das nur lokal bleibt und auf dem eigenen Gerät vor der Figur steht). Server: Feld `avatar` an `rennen_teilnehmer` (-1 = keine, 0–9; Migration `0008_avatar.sql`, PHP rüstet nach, Test „Figur“), Auswahl in `KamelWahl` beim Starten und Beitreten. Rein Zeichnungen: nichts Persönliches, keine Moderation nötig.

### Menüführung vereinfacht (28.11.2026, nach Best Practices: höchstens 5 Ziele, kein „Mehr“ als Sammelbecken, Apple HIG warnt vor Überlauf-Reitern)

- **Untere Leiste: Start · Rangliste · + Bewerten · Rennen · Ich.** Den Reiter „Mehr“ und die Seite `Mehr.tsx` gibt es nicht mehr (`#/mehr` leitet auf `#/profil`). Verteilt nach Absicht: Schlittenfahren = eigener Reiter „Rennen“; **Hilfe & Regeln, Einstellungen, „Was fehlt dir?“ und (nur Prüfstelle) Moderation/Statistik stehen auf „Ich“** (Gruppe „Hilfe und Einstellungen“, `ui/MenueListe.tsx`); **Karte und Zahlen (`#/entdecken`) und Fotos** sind von Start (Zahlenleiste, Fotostreifen, „Mehr entdecken“) und von der Rangliste (Links unter der Überschrift) erreichbar und markieren „Start“ in der Leiste (`platz()` in `Navigation.tsx`: `UNTER_ICH`, `UNTER_START`). Seitenleiste am Rechner: dieselben Ziele plus offene Gruppen „Entdecken“ und „Hilfe“.
- **Erfassen hat nur noch „Zurück“** (der „Menü“-Knopf mit zweitem Hauptmenü ist weg; `MenueBlatt.tsx` gelöscht). Der Entwurf bleibt gespeichert.
- **Becher-Nr. zählt das System:** Anzahl der **eigenen** Bewertungen dieses Geräts am Abend + 1, höchstens 7 (Server), nicht auswählbar (`naechsteBecherNr` in `lib/abend.ts`; vorher zählte „Nochmal wie eben“ und die Erfassung versehentlich alle Bewertungen der Community mit).
- **Sorte als Bilder statt Text:** sieben Glühweintassen in Weinfarbe mit Merkmal (`ui/nacht/SorteIcon.tsx`, Reihe `.sorten` direkt unter dem Preis, Name nur als `aria-label`/Tooltip); erneut antippen löscht. Leitlinie: **weniger Text, mehr Bild** (Wunsch von Philip), bei neuen Bausteinen zuerst ein Symbol erwägen.

## Scoring-Regeln (verbindlich, siehe Tests in src/lib/scoring.test.ts)

- Noten: Ganzzahl 1..10 oder `null`. **`null` fällt aus Zähler UND Nenner, zählt nie als 0.**
  (Das alte Sheet hatte genau diesen Fehler: AVERAGE(...;) mit leerem Argument.)
- `gesamt = Σ(note × gewicht) / Σ(gewicht)` über alle Nicht-null-Noten
- `gluehwein` = dieselbe Formel über geschmack, geruch, temperatur
- `drumherum` = dieselbe Formel über personal, atmosphaere, preisLeistung, becher
- Default-Gewichte: geschmack 3, geruch 2, temperatur 2, preisLeistung 2, personal 1,
  atmosphaere 1, becher 1. Gewichte sind globaler Zustand (Einstellung `gewichte`), nie Teil des Eintrags.
- Keine Note (oder alle Gewichte 0) → Wert `null`, nicht 0.
- Urteil aus gesamt, verglichen auf den **angezeigten Wert** (seit 25.11.2026 Sterne auf eine Stelle, siehe „Anzeige in Sternen“; vorher zwei Stellen). Anzeige und Urteil stimmen immer überein:
  ≥ 8 Nachschenken · ≥ 6 Richtig gut · ≥ 5 Geht klar · ≥ 4 Einmal reicht · sonst Weggießen
- Rangliste absteigend, Wettkampfplätze 1, 1, 3. Gleichstand = gleicher Wert auf zwei Stellen.
  Einträge ohne Wert ans Ende, ohne Rang.
- Anzeige mit Punkt als Dezimaltrenner (`6.33`), wie im Auftrag. Preise mit Komma (`4,50 €`).
- Abnahme: Nach Import von 2025 teilen sich Chrom (Salzburg) und Ikea Altona Platz 1 (6.33),
  Elbschlösschen (Hamburg, Rathausmarkt; in der Ur-CSV „Rathaus Schloss“, am 25.11.2026 umbenannt) Platz 3 (6.25), letzter ist Max (Traunstein) (3.67, Weggießen).
  „Salz Chrom", „Trauen Max" und „Otten Schleenwurm" hießen in der Ur-CSV so, weil „Salz" (Salzburg), „Trauen" (Traunstein) und „Otten" (Ottensen) den Ort meinten (Salzburg: diverse Märkte, daher Markt „Sonstiger"); die CSV hat jetzt
  die Spalten `id` (hält die alten IDs stabil) und `stadt`. Der Server korrigiert Bestandsbecher über `POST /api/admin/import`
  (gleiche ID, anderer Inhalt → Update mit neuer Sync-Nummer, Antwort `aktualisiert`); der Deploy-Workflow spielt die CSV bei jedem Lauf ein.

## Datenmodell-Konventionen

- Ein Eintrag = ein getrunkener Becher. Einträge sind unveränderlich; ein zweiter Besuch ist ein neuer Eintrag.
- Importierte IDs sind deterministisch: `import-<saison>-<zeile>-<stand-slug>`; neue IDs sind UUID v4.
- `datum` ist das Abenddatum: bis 5 Uhr zählt der Vortag (`abendDatum`).
- Lokaler Sync-Status: `offen` (noch nicht beim Server), `fertig`, `bestand` (aus CSV), `abgelehnt` (Server hat ihn nicht angenommen, Grund in `syncFehler`).
- Zusatzfelder eines Eintrags: `geraet` (anonyme Kennung), `name`, `pruefstelle` (nur Server), `besuchId` (QR-Besuch, Schritt 2).
- „Heute Abend" und die Becher-Nr. zählen nur die eigenen Becher dieses Geräts (`geraet === eigene Kennung`), nicht die der Community.
- Fotos bleiben vorerst nur lokal (`fotoBlob`); der Server nimmt noch keine an (Schritt 3, R2).
- `stadt` (optional) wird nur gespeichert, wenn sie nicht aus der gepflegten Liste folgt. **Die Erfassung ist stadt-zuerst:** Der Ort-Knopf öffnet `ui/nacht/OrtBlatt.tsx` (Stadt suchen mit Vorschlägen, „In meiner Nähe" per Geolocation nur auf dem Gerät, zuletzt gewählt, schon bewertet; danach optional der Markt, gepflegte und von Nutzern eingetragene). Ohne Stadt wird nicht gespeichert; `stadt` steht jetzt bei jedem neuen Becher, Markt „Sonstiger" heißt „kein bestimmter Markt". Alte Entwürfe werden mit `migriere()` umgestellt. Anzeige immer über `ortText`/`ortTeile` (src/lib/orte.ts): „Sonstiger" erscheint nie als Ort.
  Die Stadt eines Eintrags immer über `stadtVon(MARKTLISTE, e)` holen. Freie Eingabe im
  Erfassungsscreen: „Markt, Stadt" (`zerlegeFreienMarkt`).
- Statistik-Schwellen wie im alten Sheet: Spanne (max − min) unter 5 = Skala zu eng,
  Korrelation mit Geschmack über 0,6 = misst nichts Eigenes, Streuung unter 1 = kaum Streuung.
  Markt-Checkliste: 0 Becher noch nie da, unter 3 kaum erkundet, ab 3 abgedeckt.
- Erfassen kann jedes Gerät, der Knopf ist überall sichtbar (Startseite, Tab-Leiste, Seitenleiste).
  Kein Konto, kein Token. Ohne Netz oder ohne Server bleibt der Becher lokal und geht später hoch.

## Startseite (`#/`, Datei `src/ui/Uebersicht.tsx`), seit 25.11.2026 stark gekürzt

Nur noch: Einstieg (neu: Überschrift, ein Satz, „Jetzt bewerten“; wer heute schon bewertet hat: „Heute Abend“ mit „Nächsten Glühwein bewerten“ und QR für die Gruppe), „Die Besten in <Stadt>“ (drei Zeilen, Stadt = zuletzt gewählte, sonst die mit den meisten Bewertungen), „Gerade bewertet“ (3 echte Bewertungen), Link „Mehr entdecken“, Installationshinweis. Kennzahlen, Karte, Top Deals, Preise und Saisonverlauf liegen auf `#/entdecken` (`ui/Entdecken.tsx`, unter „Mehr“). Gemessen: von 3708 auf ca. 1130 px Höhe und von 316 auf ca. 100 Wörter.

(Älterer Text, teils überholt:)

Reihenfolge: Bühne (Spitzenreiter, oder nach dem ersten eigenen Becher des Abends
„Heute Abend"), Plus-Balken „Nächster Becher Nr. N" (immer, auch am Rechner), vier Kennzahlen,
Rangliste Top 5, Deutschlandkarte, neueste Becher, Saisonverlauf, wichtigster Befund.
- Ohne eigene Wahl zeigt jede Ansicht die Standard-Saison: laufendes Jahr, sobald es dort Becher
  gibt, sonst die letzte (`standardSaison`). Die Saison beginnt mit dem ersten Becher des Jahres
  („Tag 1"). Gewählte Saison wird pro Gerät gemerkt.
- Der Abend-Modus („Heute Abend") erscheint, sobald dieses Gerät heute einen Becher erfasst hat.
  Nach dem ersten eigenen Becher fragt eine Karte freiwillig nach dem Namen.
- Die 14 Becher aus 2025 haben kein Datum; der Saisonverlauf sagt das, statt zu raten.

## Gestaltung („Night Market", seit 18.11.2026)

Immersive, mobile-first Konsumenten-App statt Prüfbericht. **Hell und Dunkel** (Dunkel: Mitternachtsblau `#070B1A`, Glühwein-Rot `#F0344F`, Glut-Orange `#FF8A3D`, Gold `#FFC857`; Hell: warmer Morgenhimmel, tiefes Indigo als Text).
Alle themenabhängigen Farben stehen einmal als `--nm-*` mit `light-dark()` in `src/nacht.css`; `color-scheme` entscheidet (Auto = System, `data-theme="hell"|"dunkel"` erzwingt).
Auswahl in `src/daten/darstellung.ts` (localStorage, `public/theme-init.js` setzt es vor dem ersten Zeichnen). **Menü am Rechner umschaltbar:** Seitenleiste (Standard) oder schwebende Leiste, am Telefon immer die schwebende Leiste.
- **Design-System in `src/nacht.css`**: Tailwind v4 **ohne Preflight** (nur Theme und Utilities), damit die noch nicht umgebauten Ansichten
  nicht verändert werden. Eigene Utilities: `glas`, `glas-stark` (Milchglas), `licht-text` (Zahlen im Lichtverlauf), `rahmen-licht`
  (Verlaufsrahmen, Farben über `--rahmen`), `ticket-kerbe`, `etikett`. Die alten Tokens (`--bg`, `--karte`, `--zahl` …) sind dort auf Nachtfarben
  gesetzt (Selektor `html:root:root`), `.karte` bekommt Milchglas. Mini-Reset nur für Bausteine mit Klasse `.nm` (Spezifität 0).
  **Stolperstein:** `backdrop-filter` nur unpräfixiert schreiben, sonst verwirft der Minifier die unpräfixierte Zeile.
- Schrift: Anton (Überschriften, Zahlen, nur Großbuchstaben bei Titeln), IBM Plex Sans (Text), IBM Plex Mono (Etiketten, `etikett`).
- Bausteine in `src/ui/nacht/`: `Hintergrund` (Nachthimmel, Lichterkette), `Navigation` (schwebende Pille, Blase wandert per Feder),
  `Ticket` (`TicketRahmen`, `TopKarte`: Sammelkarte mit Verlaufsrahmen nach Platz Gold/Silber/Kupfer, Kerben, Strichcode, Teilen),
  `Kachel`/`Kennzahl` (Bento), `Chips`, `RangZeile` (leicht, ohne Glasfilter wegen langer Listen), `bewegung.ts`, `teilen.ts`.
- Bewegung mit **Motion** (`motion`, die Engine von Framer Motion ohne React, läuft mit Preact; ca. 28 KB gzip): gestaffeltes Einblenden
  (`useEinblenden`, Kinder mit `data-ein`), Neigung zur Maus und Einfedern (`useNeigung`), Zahl zählt hoch (`useZaehler`). Alles respektiert
  „Bewegung reduzieren". Hover-Leuchten und Schimmer sind reines CSS.
- Umgebaut: Gerüst, Übersicht (Bento), Rangliste, Detail (große Sammelkarte), Erfassung (Ticket-Look per CSS, nach dem Speichern „Dein Ticket" in `nacht/TicketBlatt.tsx`).
  **Bild-Export:** `nacht/karteBild.ts` zeichnet die Karte auf eine Canvas (1080×1920, immer Nachtlook) und teilt sie per Share-Dialog bzw. lädt sie am Rechner herunter.
  **Noch im alten Stil, aber mit den neuen Tokens:** Vergleich, Statistik, Spickzettel, Profil, Teilen.
- Weihnachtsmarkt-Stimmung (seit 18.11.): leise fallender Schnee, funkelnde Sterne (nur nachts), flackerndes Budenlicht am unteren Rand, die Lichterkette, eine Lichterkette (`Lichterkette.tsx`) am festen Milchglas-Header (ohne Header fest am oberen Rand) und eine Schneehaube auf den Karten (`TicketRahmen`), alles in `ui/nacht/Hintergrund.tsx`, reine CSS-Animation (`schnee`, `flackern`), mit „Bewegung reduzieren" aus. Keine Emoji, keine Tannen. Prüfstellen-Becher tragen den Stempel „Prüfstelle" (`istPruefstelle` in `src/lib/community.ts`,
  schließt lokale Bestandsdaten ein).
- Klassennamen: `styles.css` und `app.css` teilen sich den Namensraum (z. B. `.hinweis`, `.leer`, `.kopf`); neue Bausteine nutzen nur Tailwind-Utilities.

## Stand der Arbeit

Gebaut und getestet (ca. 530 Tests, dazu Browser-Tests mit zwei Geräten gegen den lokalen Server, QR-Code mit
echtem Leser dekodiert): Scoring, alle Ansichten, Startseite mit Preisindex, Community-Server mit anonymer
Kennung, Sync, freiwilligem Namen, Prüfstellen-Siegel, Melden, Moderation, Löschen auf Anfrage, QR-Mitbewerten,
Impressum und Datenschutz (Entwurf), iPhone-Hinweis.
**Offen bis zum Start:** Webhosting einrichten (SSL, FTP, GitHub-Secrets, `hetzner/WEBHOSTING.md`), Betreiberangaben
eintragen, Test auf echten Handys, Datenschutz prüfen lassen. Reihenfolge und Termine: `ABLAUFPLAN.md`.
Danach: Stand-Seiten mit Verteilung, Prüfstelle und Community getrennt, Fotos (R2), Bot-Schutz (Turnstile),
Gewichte zwischen Geräten.
