# Provat e skemës

Skema e bazës nuk ngarkohet me shpresë — provohet kundrejt një PostgreSQL-i të vërtetë
para se të shkojë te Supabase.

## Çfarë provohet

- **Të dyja skemat ekzekutohen dy herë** rresht pa gabime, që të jesh i sigurt se mund
  t'i ngjitësh sërish mbi një bazë që punon prej muajsh, pa humbur të dhëna.
- **Hyrja e stafit me kod:** kodi i saktë hyn, kodi i gabuar refuzohet, tokeni i rremë
  refuzohet, dhe dy veta nuk mund të kenë të njëjtin kod.
- **Kodi ruhet i hash-uar** — kurrë i hapur në bazë.
- **Libri i adresave:** e njëjta adresë nuk krijon dublikatë, dhe numri gjendet edhe kur
  shkruhet me hapësira ose pa zero në fillim.
- **Magazina dhe recetat:** porosia zbret lëndën e parë saktë, dhe nuk e zbret dy herë.
- **Statistikat e klientit** rriten vetëm kur porosia mbyllet.
- **Fleta e ditës së motorristit:** dorëzimet, arka, koha në rrugë dhe koha e pritjes.

## Si ekzekutohen

Duhet PostgreSQL 16 i instaluar lokalisht. Fillimisht ngri një bazë prove:

```bash
sudo mkdir -p /var/tmp/pgtest && sudo chown postgres /var/tmp/pgtest
sudo -u postgres /usr/lib/postgresql/16/bin/initdb -D /var/tmp/pgtest/data -U postgres -A trust
sudo -u postgres /usr/lib/postgresql/16/bin/pg_ctl -D /var/tmp/pgtest/data \
     -o '-p 5433 -k /var/tmp/pgtest' -l /var/tmp/pgtest/log start
```

Pastaj:

```bash
bash supabase/test/run.sh
```

Në fund duhet të shkruajë `=== TË GJITHA KALUAN ===`.

## Skedarët

| Skedari | Çfarë bën |
|---|---|
| `00-stub-supabase.sql` | Imiton sa duhet nga Supabase — rolet `anon`/`authenticated`, `auth.uid()`, skemën `storage` — që skema reale të ekzekutohet lokalisht. |
| `01-test-biznes.sql` | Provat e mësipërme. |
| `run.sh` | Rifillon bazën nga zeroja dhe ekzekuton gjithçka. |
