#!/usr/bin/env bash
# Kopiert die neueste Sicherung auf einen zweiten Rechner (der Server sichert täglich selbst nach daten/sicherungen).
# Beispiel Cron (täglich 04:30): 30 4 * * * /pfad/zu/gluehlabor/hetzner/offsite-backup.sh user@anderer-rechner:/backups/gluehlabor/
set -euo pipefail
cd "$(dirname "$0")/../daten/sicherungen"
neueste=$(ls -1 gluehlabor-*.sqlite | sort | tail -1)
rsync -a "$neueste" "$1"
