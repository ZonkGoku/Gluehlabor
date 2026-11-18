#!/usr/bin/env bash
# Neuen Stand holen, bauen, neu starten. Aufruf auf dem Server im Projektordner: ./hetzner/deploy.sh
set -euo pipefail
cd "$(dirname "$0")/.."
git pull --ff-only
docker compose up -d --build
docker image prune -f >/dev/null
for i in $(seq 1 30); do
  if curl -fsS http://127.0.0.1:8787/api/status >/dev/null 2>&1; then echo "Läuft."; exit 0; fi
  sleep 1
done
echo "Server antwortet nicht. Logs: docker compose logs --tail=50" >&2
exit 1
