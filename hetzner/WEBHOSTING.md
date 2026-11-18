# Glühlabor auf Hetzner Webhosting (gewählter Weg, keine Zusatzkosten)

Läuft im vorhandenen Webhosting S: die App als Dateien, die Schnittstelle als PHP unter `/api/`, die Daten in einer
SQLite-Datei (oder MySQL, falls SQLite dort fehlt). Aufbau und Tests siehe unten. Hochgeladen wird automatisch
von GitHub, du klickst nur.

```
Besucher ──https──> Hetzner Webhosting (Apache)
                      ├─ /            App (statische Dateien, .htaccess mit Sicherheitsköpfen)
                      └─ /api/...     PHP (php/api) ──> api/daten/gluehlabor.sqlite
```

## Einmalig einrichten (ca. 15 Minuten)

**1. In konsoleH (Webhosting der Domain gluehlabor.de)**
- SSL: für `gluehlabor.de` das kostenlose Let's-Encrypt-Zertifikat aktivieren (auch für `www`).
- PHP: Version 8.1 oder neuer wählen (8.3 ist ideal).
- FTP: Zugangsdaten notieren (Server, Benutzer, Passwort). Der Benutzer sieht `public_html`.

**2. In GitHub: Settings → Secrets and variables → Actions → New repository secret**

| Secret | Inhalt |
|---|---|
| `FTP_SERVER` | FTP-Server aus konsoleH |
| `FTP_USER` | FTP-Benutzer |
| `FTP_PASSWORD` | FTP-Passwort |
| `ADMIN_TOKEN` | frei gewählt, mindestens 24 Zeichen, nur du kennst es (für Moderation) |
| `PRUEFSTELLE_CODE` | frei gewählt, nur David und Philip kennen ihn |
| `IP_SALT` | frei gewählt, mindestens 16 Zufallszeichen |

Zufallswerte erzeugt jeder Passwortmanager. Nichts davon in den Chat oder ins Repository schreiben.
Optional `FTP_ORDNER` (Standard `/public_html`), falls das Hauptverzeichnis der Domain anders heißt.

**3. Deploy starten:** GitHub → Actions → „Deploy auf Hetzner Webhosting" → Run workflow. Der Lauf testet, baut, lädt
hoch, spielt die 14 Becher von 2025 ein und macht den Startcheck. Danach läuft jeder Push auf `main` von selbst.

**4. Prüfen:** `https://gluehlabor.de/api/status` muss `{"ok":true,…}` zeigen. Dann `npm run launch-check`.

## Wenn etwas nicht klappt

| Symptom | Ursache und Lösung |
|---|---|
| `/api/status` meldet 500 | SQLite fehlt oder `api/daten/` nicht beschreibbar. In konsoleH eine MySQL-Datenbank anlegen und die Secrets `DB_NAME`, `DB_USER`, `DB_PASSWORD`, `DB_HOST` (meist `localhost`) setzen, Deploy neu starten |
| `/api/status` meldet 503 | `api/privat/config.php` fehlt: die Secrets `ADMIN_TOKEN`, `PRUEFSTELLE_CODE`, `IP_SALT` fehlen, Deploy wiederholen |
| Geräte können sich nicht anmelden (401) | Hoster verwirft den Authorization-Header. Die App sendet ihn zusätzlich als `X-Auth`, das fängt es ab. Bleibt es, im Startcheck nachsehen |
| 404 unter `/api/...` | `.htaccess` wird nicht ausgewertet (mod_rewrite aus). Beim Hetzner-Support nachfragen |
| Startcheck: „Besucheradresse kommt nicht an" | Der Hoster stellt einen Proxy davor. Dann `REMOTE_ADDR` ist dessen Adresse und das Limit gilt für alle zusammen. Bescheid geben, dann lese ich `X-Forwarded-For` |
| FTP-Upload scheitert | Zugangsdaten und `FTP_ORDNER` prüfen; Explizites FTPS (Port 21) muss erlaubt sein |

## Betrieb

- **Moderation (täglich 5 Minuten):** `API_URL=https://gluehlabor.de ADMIN_TOKEN=… npm run moderation -- liste`,
  dann `verstecken`, `verwerfen`, `sperren`; Löschwunsch: `loeschen <geraet-id> name|alles`.
- **Sicherung:** konsoleH → Backup/Snapshot des Webhostings nutzen, zusätzlich gelegentlich `api/daten/gluehlabor.sqlite`
  per FTP herunterladen. Die Datei ist die komplette Datenbank.
- **Notbremse:** in konsoleH `api/index.php` umbenennen. Die App arbeitet auf den Handys lokal weiter, nichts geht verloren.

## Technik

- `php/api/` ist eine 1:1-Übertragung von `worker/src/app.ts` und `src/lib/community.ts`. `API_ZIEL=php-sqlite npx vitest run
  worker/test/app.test.ts` lässt dieselben 80 Server-Tests gegen die PHP-Fassung laufen (auch `php-mysql`), `php/test/regeln.test.ts`
  vergleicht Regeln und Adress-Hash mit der TypeScript-Fassung. **Ändert sich die Logik in TypeScript, muss PHP mitziehen.**
- Sync-Nummern werden in einer Transaktion vergeben, die eine Zählerzeile sperrt. So werden sie in Reihenfolge sichtbar.
- `.htaccess` (aus `php/htaccess.txt`): https und ohne www erzwingen, Sicherheitsköpfe inkl. CSP, Cache-Regeln, Authorization
  durchreichen. In `api/lib`, `api/privat`, `api/daten` ist der Zugriff von außen gesperrt.
- Lokal prüfen: `npm run build:webhosting` baut `out/webhosting`.
