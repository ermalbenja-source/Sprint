#!/bin/bash
# =============================================================================
#  SPRINT — Nis programin e dyqanit mbi këtë kompjuter.
#  Përdorimi:  bash local/start.sh
# =============================================================================
cd "$(dirname "$0")/.."

# --- Ndihmë sipas sistemit -------------------------------------------------
udhezim() {
  case "$(uname -s)" in
    Darwin)
      echo "  Në Mac:"
      echo "    1. Hap  https://nodejs.org  në Safari"
      echo "    2. Shkarko  macOS Installer (.pkg)  versionin LTS"
      echo "    3. Kliko dy herë mbi skedarin e shkarkuar dhe ndiq instalimin"
      echo "    4. MBYLL këtë Terminal dhe hape sërish"
      echo "    5. Kthehu këtu dhe shkruaj:  bash local/start.sh"
      echo
      echo "  (Nëse ke Homebrew:  brew install node@22)"
      ;;
    Linux)
      echo "  Në Linux:  https://nodejs.org/en/download  ose paketa e shpërndarjes sate."
      ;;
    *)
      echo "  Shkarkoje nga  https://nodejs.org  (versioni 22 ose më i ri)"
      ;;
  esac
}

if ! command -v node >/dev/null 2>&1; then
  echo
  echo "  Nuk u gjet Node.js — programi nuk niset dot pa të."
  echo
  udhezim
  echo
  exit 1
fi

ver=$(node -e 'console.log(process.versions.node.split(".")[0])')
if [ "$ver" -lt 22 ]; then
  echo
  echo "  Node.js $ver është shumë i vjetër. Duhet 22 ose më i ri,"
  echo "  sepse baza SQLite vjen brenda tij."
  echo
  udhezim
  echo
  exit 1
fi

[ -f dist/index.html ] || { echo "  Po përgatitet faqja..."; node build.js; }

exec node local/server.js
