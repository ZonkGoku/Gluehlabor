# Becherwerk – Hinweise für spätere Sitzungen

Glühwein-Prüfstelle von David & Philip. Der vollständige Auftrag steht in `BRIEF.md`. Vor größeren Änderungen lesen.

## Produkt

- Betrieben von **David (lebt in Bayern) und Philip (aus Hamburg)**. Bewertet wird auf
  Weihnachtsmärkten **in ganz Deutschland**, nicht nur in Hamburg. Texte, Logo und Datenmodell
  müssen das tragen (keine „Hamburger Weihnachtsmärkte").
- Vorlage für die Ansichten war das alte Google Sheet „Dalip 2025 Christmas" mit den Tabs
  Rangliste (Gewichte + Saison-Schalter), Verkostung, Vergleich (Wiederholungstäter, „Wo wart ihr
  noch nie?"), Spickzettel, Statistik. Die App bildet alle Tabs ab.

## Stack

- **Vite 6 + Preact 10 + TypeScript**, Hash-Router (`#/erfassen`, `#/einstellungen`, …)
- **IndexedDB über Dexie**: lokaler Speicher ist die Wahrheit (`src/daten/db.ts`)
- **Sync ohne Backend**: offene Einträge werden per GitHub-Contents-API als
  `data/eintraege/<id>.json` direkt auf `main` geschrieben (Fotos nach `data/fotos/`).
  Schreiben braucht einen fine-grained Token (nur dieses Repo, Contents: read/write),
  der pro Gerät in den Einstellungen liegt. Lesen ist öffentlich: Der Build erzeugt
  `daten/eintraege.json` aus `data/eintraege/` (Vite-Plugin in `vite.config.ts`).
- **PWA** über `vite-plugin-pwa` (generateSW, `registerType: 'prompt'`: Updates
  warten, bis die App geschlossen ist, damit keine Erfassung durch Neuladen verloren geht).
- **Vitest** für alle reinen Funktionen. `npm test`, `npm run typecheck`, `npm run build`.
- **Deploy**: `.github/workflows/deploy.yml` veröffentlicht bei jedem Push auf `main` den Stand von `main`. Solange `main` nicht Standard-Branch ist, läuft der Deploy über einen workflow_dispatch auf dem Standard-Branch (Pages-Umgebung erlaubt nur den Standard-Branch). Die Seite liegt
  unter https://zonkgoku.github.io/Becherwerk/ . Pages → Source = „GitHub Actions" (ist gesetzt).
- `base: './'` (relativ) plus Hash-Router: kein Repo-Name im Build, keine weiße Seite
  durch falsche Unterpfade.

## Verzeichnisse

```
data/                    Daten, nicht Code
  gluehwein-2025.csv     Bestandsdaten, beim ersten Start importiert (nie in den Quelltext kopieren)
  anker.json             Ankerdefinitionen je Kriterium (werden sich ändern)
  maerkte.json           gepflegte Marktlisten je Stadt + „Sonstiger" (weitere Städte einfach ergänzen)
  regeln.json            Regeln des Spickzettels
  eintraege/<id>.json    synchronisierte Becher (schreibt die App)
  fotos/<id>.jpg         Fotos (schreibt die App)
src/lib/                 REINE Funktionen ohne UI/DOM, alle getestet
  modell.ts              Typen, Kriterien, Default-Gewichte
  scoring.ts             Wertung, Urteil, Rangliste  ← Kern
  csvImport.ts           CSV → Einträge
  auswertung.ts          Filter, Rangliste mit Wertung, Urteilsverteilung, Jahresvergleich, Markt-Checkliste
  statistik.ts           Kennzahlen, Korrelationen, Pegel, Befunde als Sätze
  orte.ts                Märkte ↔ Städte, freie Eingabe „Markt, Stadt"
  anker.ts, abend.ts, format.ts, veroeffentlichung.ts
src/daten/               Speicher und Netz: db.ts, sync.ts, entwurf.ts, foto.ts, config.ts
src/ui/                  Preact-Komponenten. KEINE Rechenlogik hier (auch keine Schwellenwerte).
  Geruest.tsx            Tab-Leiste (Telefon) / Seitenleiste (Rechner)
  Uebersicht, Rangliste, Detail, Vergleich, Statistik, Spickzettel, Einstellungen, Erfassen
  daten.ts               Live-Hooks (Einträge, Gewichte, Saison-Auswahl)
src/styles.css           Tokens beider Themes + Erfassungsscreen
src/app.css              Gerüst und Auswertungsansichten
public/                  icon.svg (PWA-Zeichen), logo.svg (Siegel mit „David & Philip"), PNG-Icons
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
- Lokaler Sync-Status: `offen` (noch nicht im Repo), `fertig`, `bestand` (aus CSV).
- `stadt` (optional) wird nur gespeichert, wenn sie nicht aus der gepflegten Liste folgt.
  Die Stadt eines Eintrags immer über `stadtVon(MARKTLISTE, e)` holen. Freie Eingabe im
  Erfassungsscreen: „Markt, Stadt" (`zerlegeFreienMarkt`).
- Statistik-Schwellen wie im alten Sheet: Spanne (max − min) unter 5 = Skala zu eng,
  Korrelation mit Geschmack über 0,6 = misst nichts Eigenes, Streuung unter 1 = kaum Streuung.
  Markt-Checkliste: 0 Becher noch nie da, unter 3 kaum erkundet, ab 3 abgedeckt.
- Wer eintragen darf: Geräte mit Token (oder mit lokal offenen Einträgen). Öffentliche
  Besucher sehen keinen Erfassen-Knopf.

## Gestaltung

Prüfbericht, nicht Weihnachtsmarkt. Farben `--accent #7B1E2B`, `--gold #D9A640`,
`--bg-hell #FBF7F6`, `--bg-dunkel #17100F`. Zahlen in IBM Plex Mono, Text in IBM Plex Sans
(beide lokal über @fontsource, damit offline). Hell und Dunkel sind getrennt abgestimmt
(`src/styles.css`). Keine Emoji, kein Schnee, keine Tannen. Modern (Karten, Tab-Leiste,
große Monospace-Zahlen), aber nüchtern. Urteilsfarben `--u1..u5` folgen den Farben des alten Sheets.
Achtung bei Klassennamen: `styles.css` und `app.css` teilen sich den Namensraum
(z. B. sind `.hinweis`, `.leer`, `.kopf` schon belegt).

## Stand der Arbeit

1–5 erledigt: Stack, Scoring + Tests, Erfassungsscreen (offline, PWA, Sync), alle Ansichten
des alten Sheets, Deutschland-weite Orte. Noch nicht gegen das echte Repo getestet: der
Upload per Token (erst möglich, wenn ein Token auf einem Gerät hinterlegt ist).
Mögliche nächste Schritte: Gewichte zwischen beiden Geräten synchronisieren (derzeit pro Gerät),
weitere gepflegte Marktlisten (z. B. für Davids Region in Bayern).
