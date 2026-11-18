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
- **Eine Bewertung je Gerät, Stand und Abend** (`abendVon`: Datum, sonst Tag der Erfassung). Server: Status `abgelehnt` mit Grund; App prüft vorher mit `schonBewertet`. Ausgeblendete zählen nicht. Anlegen eines Stands = erste Bewertung (keine leeren Stände). „Bewerten" auf der Stand-Seite füllt einen gesperrten Entwurf (wie der QR-Link).
- **Rangliste nach Ständen** (`src/lib/staende.ts`, `baueStaende`): Durchschnitt der Gesamtnoten aller Bewertungen; für die Reihenfolge werden Stände mit wenigen Bewertungen zum Gesamtmittel hingezogen (`VORWERT_GEWICHT` 3), unter `MIN_BEWERTUNGEN` 3 gilt „vorläufig". Angezeigt wird immer der echte Durchschnitt. Umschalter Alle / Prüfstelle / Community (`Quelle`); die Stand-Seite (`#/stand/<id>`, `ui/Stand.tsx`) zeigt beide Wertungen nebeneinander. Die Scoring-Regeln oben bleiben je Bewertung unverändert.
- **Prüfstelle = Super-User** ohne Konto: Gerät mit Prüfstellen-Code (Profil). Solche Geräte dürfen die Admin-Endpunkte auch mit ihrer Geräte-Anmeldung nutzen (`pruefeModeration`), also im Browser: `#/moderation` (`ui/Moderation.tsx`, `daten/moderation.ts`: Meldungen, Ausblenden, Sperren, Löschen auf Anfrage, Zugang entziehen) und auf der Stand-Seite „Stand pflegen" (umbenennen, Stadt/Markt, **zusammenführen**, ganz ausblenden; Endpunkt `POST /api/admin/stand-aendern`). `POST /api/admin/pruefstelle-zuruecksetzen` {behalten} entzieht allen anderen Geräten die Rechte (danach `PRUEFSTELLE_CODE` ändern; Siegel alter Becher bleibt).
- **Löschen für die Prüfstelle:** `POST /api/admin/entfernen` {ids} macht Bewertungen endgültig unkenntlich (Platzhalter bleibt, Meldungen erledigt; anders als „verstecken" nicht umkehrbar). Im Browser: `#/moderation` → „Alle Bewertungen" (suchen, wählen, löschen), auf der Stand-Seite je Bewertung „Löschen" und „Ganzen Stand endgültig löschen" (`entferne` in `daten/moderation.ts`).
- **Preis-Leistung ist berechnet, der Preis Pflicht** (`src/lib/preisleistung.ts`): Beim Speichern rechnet die App die Note `preisLeistung` aus der Glühwein-Note (Geschmack, Geruch, Temperatur) und dem Preis: **− 0,5 Punkte je Euro über dem Referenzpreis** (darunter plus), ganzzahlig 1–10. Referenzpreis = Median der Stadt (nur Alkohol-Glühwein, je 0,2 l umgerechnet), verrechnet mit dem Startwert 5,00 € (`REFERENZ_GEWICHT` 5, Schätzung 2025: ca. 5 €/Tasse). Alkoholfrei und Feuerzangenbowle: keine Preis-Leistung. Die Note bleibt in der Gesamtnote (Gewicht 2) und wird mit dem Eintrag gespeichert (unveränderlich, Server prüft nur 1–10). `preis` ist ohne Pfand und Pflicht (Server: „Der Preis fehlt.", nicht beim Admin-Import der 2025-Daten); `menge` (0,2/0,25/0,3 l, optional, Spalte `menge`, Migration 0003, PHP rüstet ältere Datenbanken selbst nach) rechnet auf 0,2 l um. **Top Deals:** Stände mit Ø-Preis-Leistung ≥ 8 (`TOP_DEAL`) tragen die Marke „Top Deal" (`DealMarke`), eigene Rangfolge (`Stand.deal`), Ansicht „Top Deals" in der Rangliste (`#/rangliste?deals=1`) und Kachel auf der Startseite. Die 14 Becher von 2025 behalten ihre handvergebene Note.
- **QR-Codes statt Strichcode:** Der Abriss-Stummel jeder Karte trägt einen echten QR-Code (`QrStummel` in `ui/nacht/Ticket.tsx`, Matrix aus `ui/nacht/qr.ts`), der den Stand bzw. die Bewertung öffnet; im Story-Bild groß (160 px, schwarz auf weiß, per Test mit jsQR lesbar; `KartenDaten.link`). **Netzdiagramm** (`ui/Netzdiagramm.tsx`, Geometrie `lib/netz.ts`): in der Detailansicht diese Bewertung gegen den Durchschnitt, auf der Stand-Seite Prüfstelle gegen Community (`kriterienMittel`). Fehlende Noten haben keinen Punkt, nie 0.
- **Prüfsiegel:** Ein Stand mit mindestens einer Bewertung der Prüfstelle trägt das goldene Siegel (`ui/nacht/PruefSiegel.tsx`) auf Sammelkarten, in Listenzeilen, auf der Stand-Seite und im Story-Bild (`KartenDaten.geprueft`).
- Nicht gebaut: eine Bewertung am selben Abend nachträglich ändern (man kann sie nur über die Moderation ausblenden lassen).

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

## Scoring-Regeln (verbindlich, siehe Tests in src/lib/scoring.test.ts)

- Noten: Ganzzahl 1..10 oder `null`. **`null` fällt aus Zähler UND Nenner, zählt nie als 0.**
  (Das alte Sheet hatte genau diesen Fehler: AVERAGE(...;) mit leerem Argument.)
- `gesamt = Σ(note × gewicht) / Σ(gewicht)` über alle Nicht-null-Noten
- `gluehwein` = dieselbe Formel über geschmack, geruch, temperatur
- `drumherum` = dieselbe Formel über personal, atmosphaere, preisLeistung, becher
- Default-Gewichte: geschmack 3, geruch 2, temperatur 2, preisLeistung 2, personal 1,
  atmosphaere 1, becher 1. Gewichte sind globaler Zustand (Einstellung `gewichte`), nie Teil des Eintrags.
- Keine Note (oder alle Gewichte 0) → Wert `null`, nicht 0.
- Urteil aus gesamt, verglichen auf **zwei Stellen gerundet** (Anzeige und Urteil stimmen immer überein):
  ≥ 8 Nachschenken · ≥ 6 Richtig gut · ≥ 5 Geht klar · ≥ 4 Einmal reicht · sonst Weggießen
- Rangliste absteigend, Wettkampfplätze 1, 1, 3. Gleichstand = gleicher Wert auf zwei Stellen.
  Einträge ohne Wert ans Ende, ohne Rang.
- Anzeige mit Punkt als Dezimaltrenner (`6.33`), wie im Auftrag. Preise mit Komma (`4,50 €`).
- Abnahme: Nach Import von 2025 teilen sich Chrom (Salzburg) und Ikea Altona Platz 1 (6.33),
  Rathaus Schloss Platz 3 (6.25), letzter ist Max (Traunstein) (3.67, Weggießen).
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

## Startseite (`#/`, Datei `src/ui/Uebersicht.tsx`)

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
