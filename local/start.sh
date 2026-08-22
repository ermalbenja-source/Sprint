#!/bin/bash
# =============================================================================
#  SPRINT — Nis programin e dyqanit mbi këtë kompjuter.
#  Përdorimi:  bash local/start.sh
# =============================================================================
cd "$(dirname "$0")/.."

if ! command -v node >/dev/null 2>&1; then
  echo
  echo "  Nuk u gjet Node.js."
  echo "  Instaloje nga https://nodejs.org (versioni 22 ose më i ri)"
  echo
  exit 1
fi

ver=$(node -e 'console.log(process.versions.node.split(".")[0])')
if [ "$ver" -lt 22 ]; then
  echo
  echo "  Node.js $ver është shumë i vjetër. Duhet 22 ose më i ri,"
  echo "  sepse baza SQLite vjen brenda tij."
  echo
  exit 1
fi

[ -f dist/index.html ] || { echo "  Po përgatitet faqja..."; node build.js; }

exec node local/server.js
