#!/bin/bash
# =============================================================================
#  SPRINT — Nis të gjitha provat.
#  Përdorimi:  bash test/run.sh
#
#  Provat ndahen në tri grupe, se nuk kërkojnë të njëjtën gjë:
#    1. skema      — kundër një PostgreSQL-i të vërtetë (si te Supabase)
#    2. serveri    — kundër serverit lokal, secila mbi bazën e vet
#    3. demo       — faqja pa bazë fare, e shërbyer si skedarë të thjeshtë
#
#  Disa prova e ecin programin nga instalimi i pastër dhe presin bazë të re;
#  prandaj nisen mbi një dosje të vetën, jo mbi një bazë të përdorur më parë.
# =============================================================================
cd "$(dirname "$0")/.."
export NODE_PATH=${NODE_PATH:-/opt/node22/lib/node_modules}

TMP=$(mktemp -d)
PORT_SRV=8787
PORT_DEMO=8899
deshtime=0

fund() {
  for pid in $srv $demo; do [ -n "$pid" ] && kill $pid 2>/dev/null; done
  rm -rf "$TMP"
}
trap fund EXIT

nis_server() {                       # nis_server <dosja>
  mkdir -p "$1"
  SPRINT_DATA="$1" SPRINT_PORT=$PORT_SRV \
  SPRINT_EMAIL=pronar@sprint.local SPRINT_PASS=fjalekalim123 \
    node local/server.js > "$1/server.log" 2>&1 &
  srv=$!
  for i in $(seq 1 40); do
    curl -fsS -o /dev/null "http://127.0.0.1:$PORT_SRV/" 2>/dev/null && return 0
    sleep 0.25
  done
  echo "  serveri nuk u ngrit"; return 1
}
ndal_server() { [ -n "$srv" ] && kill $srv 2>/dev/null; srv=''; sleep 0.5; }

prove() {                            # prove <emri> [dosja e të dhënave]
  SPRINT_DATA="${2:-$TMP/perbashket}" node "test/$1.js" > "$TMP/$1.out" 2>&1
  if [ $? = 0 ]; then printf "  ✓ %s\n" "$1"
  else printf "  ✗ %s   (%s)\n" "$1" "$TMP/$1.out"; deshtime=$((deshtime+1)); fi
}

echo
echo "════ 1. SKEMA KUNDËR POSTGRES ════"
if psql -h /var/tmp/pgtest -p 5433 -U postgres -tAc 'select 1' >/dev/null 2>&1; then
  if bash supabase/test/run.sh 2>&1 | tail -1 | grep -q 'TË GJITHA KALUAN'; then
    echo "  ✓ skema dhe funksionet"
  else
    echo "  ✗ skema — nise vetë: bash supabase/test/run.sh"; deshtime=$((deshtime+1))
  fi
else
  echo "  — kapërcyer: nuk ka PostgreSQL në :5433"
fi

echo
echo "════ 2. KUNDËR SERVERIT LOKAL ════"
nis_server "$TMP/perbashket" || exit 1
for t in stacionet magazina njoftime zonat adresa kodet \
         stacionet-ekrani magazina-ekrani dokumente; do
  prove "$t"
done
ndal_server

# Ecja e plotë nga instalimi i pastër do bazë të paprekur.
echo "  — nga instalimi i pastër —"
nis_server "$TMP/epaster" || exit 1
prove lokal "$TMP/epaster"
ndal_server

echo
echo "════ 3. FAQJA PA BAZË (demo) ════"
[ -f dist/index.html ] || node build.js >/dev/null
( cd dist && python3 -m http.server $PORT_DEMO --bind 127.0.0.1 >/dev/null 2>&1 ) &
demo=$!
for i in $(seq 1 40); do
  curl -fsS -o /dev/null "http://127.0.0.1:$PORT_DEMO/" 2>/dev/null && break
  sleep 0.25
done
for t in biznes staf staf-vetem stafi-fazat porosi-telefoni vendndodhja artifakt-kuti; do
  prove "$t"
done

echo
if [ $deshtime = 0 ]; then echo "  Të gjitha kaluan."; else echo "  $deshtime provë(a) dështuan."; fi
echo
exit $deshtime
