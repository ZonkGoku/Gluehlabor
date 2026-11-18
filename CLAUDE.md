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
  maerkte.json           gepflegte Marktlisten je Stadt + „Sonstiger" (weitere Städte einfach ergänzen)
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
public/                  icon.svg (PWA-Zeichen), logo.svg (Siegel mit „David & Philip"), PNG-Icons
scripts/launch-check.ts  Startcheck (npm run launch-check)
scripts/icons.mjs        rastert icon.svg zu den PNG-Icons (nutzt Playwright aus der Umgebung)
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
- Abnahme: Nach Import von 2025 teilen sich Salz Chrom und Ikea Altona Platz 1 (6.33),
  Rathaus Schloss Platz 3 (6.25), letzter ist Trauen Max (3.67, Weggießen).

## Datenmodell-Konventionen

- Ein Eintrag = ein getrunkener Becher. Einträge sind unveränderlich; ein zweiter Besuch ist ein neuer Eintrag.
- Importierte IDs sind deterministisch: `import-<saison>-<zeile>-<stand-slug>`; neue IDs sind UUID v4.
- `datum` ist das Abenddatum: bis 5 Uhr zählt der Vortag (`abendDatum`).
- Lokaler Sync-Status: `offen` (noch nicht beim Server), `fertig`, `bestand` (aus CSV), `abgelehnt` (Server hat ihn nicht angenommen, Grund in `syncFehler`).
- Zusatzfelder eines Eintrags: `geraet` (anonyme Kennung), `name`, `pruefstelle` (nur Server), `besuchId` (QR-Besuch, Schritt 2).
- „Heute Abend" und die Becher-Nr. zählen nur die eigenen Becher dieses Geräts (`geraet === eigene Kennung`), nicht die der Community.
- Fotos bleiben vorerst nur lokal (`fotoBlob`); der Server nimmt noch keine an (Schritt 3, R2).
- `stadt` (optional) wird nur gespeichert, wenn sie nicht aus der gepflegten Liste folgt.
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

Immersive, mobile-first Konsumenten-App statt Prüfbericht. **Nur ein Theme: Nacht** (Mitternachtsblau `#070B1A`, Glühwein-Rot `#F0344F`,
Glut-Orange `#FF8A3D`, Gold `#FFC857`, Text `#F4F1FF`/`#A3ACCB`). Es gibt keinen Hell/Dunkel-Schalter mehr.
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
- Umgebaut: Gerüst, Übersicht (Bento), Rangliste. **Noch im alten Stil, aber mit Nacht-Tokens:** Erfassen, Detail, Vergleich, Statistik,
  Spickzettel, Profil, Teilen. Nächste Kandidaten: Erfassen als Ticket, Detail als Sammelkarte.
- Keine Emoji, kein Schnee, keine Tannen. Prüfstellen-Becher tragen den Stempel „Prüfstelle" (`istPruefstelle` in `src/lib/community.ts`,
  schließt lokale Bestandsdaten ein).
- Klassennamen: `styles.css` und `app.css` teilen sich den Namensraum (z. B. `.hinweis`, `.leer`, `.kopf`); neue Bausteine nutzen nur Tailwind-Utilities.

## Stand der Arbeit

Gebaut und getestet (453 Tests, dazu Browser-Tests mit zwei Geräten gegen den lokalen Server, QR-Code mit
echtem Leser dekodiert): Scoring, alle Ansichten, Startseite mit Preisindex, Community-Server mit anonymer
Kennung, Sync, freiwilligem Namen, Prüfstellen-Siegel, Melden, Moderation, Löschen auf Anfrage, QR-Mitbewerten,
Impressum und Datenschutz (Entwurf), iPhone-Hinweis.
**Offen bis zum Start:** Webhosting einrichten (SSL, FTP, GitHub-Secrets, `hetzner/WEBHOSTING.md`), Betreiberangaben
eintragen, Test auf echten Handys, Datenschutz prüfen lassen. Reihenfolge und Termine: `ABLAUFPLAN.md`.
Danach: Stand-Seiten mit Verteilung, Prüfstelle und Community getrennt, Fotos (R2), Bot-Schutz (Turnstile),
Gewichte zwischen Geräten.
