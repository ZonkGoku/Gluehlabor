# Glühlabor auf dem eigenen Hetzner-Server

Ein Container liefert die App **und** die API aus (Node 22, SQLite-Datei). Der vorhandene Webserver bleibt vorne
(Reverse-Proxy, Zertifikat) und leitet `gluehlabor.de` an `127.0.0.1:8787` weiter. Die bestehende Website läuft unverändert weiter.

```
Besucher ──https──> nginx/Caddy/Apache (Port 443) ──> Container (127.0.0.1:8787) ──> daten/gluehlabor.sqlite
```

## Einmalig einrichten

1. **DNS** (beim Domain-Anbieter): `A`-Eintrag `gluehlabor.de` und `www` auf die IPv4 des Servers, bei IPv6 zusätzlich `AAAA`.
2. **Docker** auf dem Server (falls nicht vorhanden): `curl -fsSL https://get.docker.com | sh`
3. **Code holen**: `git clone <repo> /srv/gluehlabor && cd /srv/gluehlabor`
4. **Geheimnisse erzeugen**: `./hetzner/setup.sh` (legt `.env` an, zeigt `ADMIN_TOKEN` und `PRUEFSTELLE_CODE`; beides sicher notieren)
5. **Starten**: `./hetzner/deploy.sh` (baut, startet, wartet auf den Status)
6. **Proxy**: eine der Dateien in `hetzner/` an den vorhandenen Webserver anpassen (`nginx.conf`, `Caddyfile`, `apache.conf`),
   Zertifikat holen (certbot oder Caddy), Server neu laden. Wichtig: **Zugriffsprotokoll aus** (`access_log off`) und der Header `X-Real-IP`.
7. **Prüfen**: `npm run launch-check` (auf dem eigenen Rechner, mit `data/betreiber.json` ausgefüllt).

## Was der Server tut

- Beim Start: Datenbank anlegen und migrieren, die 14 Becher von 2025 als „Prüfstelle" einspielen (mehrfach gefahrlos).
- Täglich: abgelaufene Zähler löschen und eine Sicherung nach `daten/sicherungen/` schreiben (die letzten 14 bleiben).
- Immer: Sicherheitsköpfe (CSP, nosniff, kein Framing, HSTS hinter HTTPS), Anfragen über 70 KB abgelehnt, Zugriffsprotokoll gibt es nicht.
- Die echte Besucheradresse kommt aus `X-Real-IP`, aber nur, wenn die Verbindung vom Proxy (privates Netz/localhost) kommt.
  Sie wird nur gehasht mit Salz und Tag gezählt (Missbrauchsschutz).

## Betrieb

| Aufgabe | Befehl |
|---|---|
| Neuer Stand | `./hetzner/deploy.sh` |
| Logs | `docker compose logs --tail=100 -f` |
| Neustart | `docker compose restart` |
| Moderation (täglich) | `API_URL=https://gluehlabor.de ADMIN_TOKEN=… npm run moderation -- liste` |
| Löschwunsch | `… npm run moderation -- loeschen <geraet-id> name` (oder `alles`) |
| Sicherung wiederherstellen | `docker compose stop`, Datei `daten/sicherungen/gluehlabor-JJJJ-MM-TT.sqlite` nach `daten/gluehlabor.sqlite` kopieren, `-wal`/`-shm` löschen, `docker compose start` |
| Sicherung außer Haus | `hetzner/offsite-backup.sh` per Cron, oder Hetzner-Snapshot/Backup des Servers einschalten |

## Sicherheit und Recht (Checkliste)

- Firewall: nur 22, 80, 443 offen (`ufw allow 22,80,443/tcp && ufw enable`). Port 8787 ist nur lokal gebunden.
- SSH nur mit Schlüssel, `unattended-upgrades` und `fail2ban` aktiv.
- **AV-Vertrag mit Hetzner** abschließen (Konsole → Sicherheit → „Auftragsverarbeitung"). Ohne den ist die Datenschutzerklärung nicht wahr.
- Betreiberdaten in `data/betreiber.json` (Name, Anschrift, E-Mail; `hostingStandort` z. B. „Nürnberg" oder „Falkenstein").
- Datenschutzerklärung und Impressum sind ein Entwurf: vor dem breiten Teilen prüfen lassen.
- Der Prüfstellen-Code gehört nur David und Philip. Wurde er verraten: in `.env` ändern, `docker compose up -d`.

## Notbremse

`docker compose stop`: Die App läuft auf den Handys weiter, nur lokal, nichts geht verloren; gesendet wird nach dem Neustart.
