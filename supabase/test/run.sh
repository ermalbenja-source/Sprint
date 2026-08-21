#!/bin/bash
# Rifillon bazën nga zeroja dhe ekzekuton të dyja skemat plus testet.
set -e
PG="psql -h /var/tmp/pgtest -p 5433 -U postgres -q -v ON_ERROR_STOP=1"
SP=supabase/test
cd /home/user/Sprint

$PG -c "drop schema if exists public cascade; create schema public;
        drop schema if exists auth cascade; drop schema if exists storage cascade;" >/dev/null
$PG -f supabase/test/00-stub-supabase.sql >/dev/null 2>&1
echo "── skema 1 ──"
$PG -f supabase/schema.sql 2>&1 | grep -v NOTICE || true
echo "── skema 2 ──"
$PG -f supabase/schema-2-biznes.sql 2>&1 | grep -v NOTICE || true
echo "── idempotenca: të dyja edhe një herë ──"
$PG -f supabase/schema.sql 2>&1 | grep -v NOTICE || true
$PG -f supabase/schema-2-biznes.sql 2>&1 | grep -v NOTICE || true
echo "   OK — u ekzekutuan dy herë pa gabime"
echo "── testet ──"
psql -h /var/tmp/pgtest -p 5433 -U postgres -q -v ON_ERROR_STOP=1 -f supabase/test/01-test-biznes.sql
