#!/usr/bin/env bash
# Einmalig auf dem Server: erzeugt .env mit zufälligen Geheimnissen und den Datenordner.
set -euo pipefail
cd "$(dirname "$0")/.."
if [ -f .env ]; then echo ".env gibt es schon, nichts geändert."; exit 0; fi
zufall() { head -c 48 /dev/urandom | base64 | tr -d '/+=\n' | head -c "$1"; }
cat > .env <<ENV
ADMIN_TOKEN=$(zufall 40)
PRUEFSTELLE_CODE=$(zufall 12)
IP_SALT=$(zufall 40)
ERLAUBTE_URSPRUENGE=https://gluehlabor.de,https://www.gluehlabor.de
ENV
chmod 600 .env
mkdir -p daten
chown 1000:1000 daten 2>/dev/null || true
echo ".env angelegt. Notiere ADMIN_TOKEN und PRUEFSTELLE_CODE (z. B. im Passwortmanager):"
grep -E '^(ADMIN_TOKEN|PRUEFSTELLE_CODE)=' .env
