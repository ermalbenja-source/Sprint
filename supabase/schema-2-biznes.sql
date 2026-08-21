-- ============================================================================
-- SPRINT — Programi i biznesit
-- Pjesa e dytë e skemës: fazat, klientët, stafi, motorristët, magazina,
-- furnitorët, recetat dhe dokumentet e brendshme.
--
-- SI PËRDORET
--   1. Ekzekuto së pari supabase/schema.sql.
--   2. Pastaj ngjit KREJT këtë skedar te SQL Editor → Run.
--   Të dy skedarët mund të ekzekutohen sa herë të duash — nuk prishin të dhëna.
--
-- SHËNIM I RËNDËSISHËM PËR FATURAT
--   Dokumentet që nxjerr ky program janë DOKUMENTE TË BRENDSHME: fletë porosie,
--   fletë dorëzimi, urdhërblerje. Ato NUK janë fatura tatimore dhe nuk kalojnë
--   përmes fiskalizimit. Fatura zyrtare lëshohet nga programi i certifikuar.
--   Çdo dokument printohet i shënuar qartë, që të mos ngatërrohet me faturën.
-- ============================================================================


-- ═══════════════════════ 1. FAZAT E POROSISË ═══════════════════════
-- Çelësat janë saktësisht vlerat e `orders.status`, që të mos ketë përkthim
-- midis dy fjalorëve. Skeleti është i fiksuar sepse kuzhina, motorristi, faqja e klientit
-- dhe statistikat varen prej tij. Ti ndryshon emrin, ngjyrën, radhën, kohën e
-- synuar dhe çfarë sheh klienti — dhe fik ato që nuk i përdor.

create table if not exists public.order_phases (
  key               text primary key,
  sort              integer     not null default 0,
  label_sq          text        not null,
  label_en          text        not null default '',
  customer_label_sq text,
  customer_label_en text,
  icon              text        not null default '',
  color             text        not null default '',
  enabled           boolean     not null default true,
  customer_visible  boolean     not null default true,
  target_minutes    integer,
  is_core           boolean     not null default false,
  updated_at        timestamptz not null default now(),

  constraint order_phases_key_ok check (key in
    ('new','accepted','preparing','ready','delivering','done','cancelled')),
  constraint order_phases_label_ok check (char_length(label_sq) between 1 and 40),
  constraint order_phases_target_ok check (target_minutes is null or target_minutes between 1 and 480)
);

comment on table public.order_phases is
  'Fazat e porosisë. Çelësi është i fiksuar; emri dhe pamja janë të tuat.';

-- Vetë-shërim për bazat që u ngritën me një grup të mëparshëm çelësash:
-- hiqet kufizimi, fshihen rreshtat e vjetër, dhe vihet kufizimi i saktë.
alter table public.order_phases drop constraint if exists order_phases_key_ok;
delete from public.order_phases
 where key not in ('new','accepted','preparing','ready','delivering','done','cancelled');
alter table public.order_phases add constraint order_phases_key_ok check (key in
  ('new','accepted','preparing','ready','delivering','done','cancelled'));

insert into public.order_phases
  (key, sort, label_sq, label_en, customer_label_sq, customer_label_en, icon, color, customer_visible, target_minutes, is_core)
values
  ('new',       10, 'E marrë',    'Placed',    'E marrë',        'Received',   '📥', '#8a8a8a', true,  null, true),
  ('accepted',  20, 'Pranuar',    'Accepted',  'Po përgatitet',  'In progress','✓',  '#c4640b', true,  3,    false),
  ('preparing', 30, 'Në furrë',   'In kitchen','Po përgatitet',  'In progress','🔥', '#c4640b', true,  20,   true),
  ('ready',     40, 'Gati',       'Ready',     'Nisi për te ti', 'On its way', '🛎',  '#3b6446', true,  5,    false),
  ('delivering',50, 'Në rrugë',   'On the way','Nisi për te ti', 'On its way', '🛵', '#3b6446', true,  25,   true),
  ('done',      60, 'Dorëzuar',   'Delivered', 'Dorëzuar',       'Delivered',  '🏁', '#3b6446', true,  null, true),
  ('cancelled', 70, 'Anuluar',    'Cancelled', 'Anuluar',        'Cancelled',  '✕',  '#a22f1b', true,  null, true)
on conflict (key) do nothing;


-- ═══════════════════════ 2. KLIENTËT ═══════════════════════
-- Libri i adresave. Numri i telefonit sjell emrin dhe adresat e mëparshme,
-- që telefonata të mos e diktojë adresën nga e para çdo herë.

create table if not exists public.customers (
  id            uuid primary key default gen_random_uuid(),
  phone         text        not null unique,
  name          text        not null default '',
  note          text,
  blocked       boolean     not null default false,
  block_reason  text,
  orders_count  integer     not null default 0,
  orders_total  numeric(12,2) not null default 0,
  last_order_at timestamptz,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),

  constraint customers_phone_ok check (char_length(phone) between 5 and 30),
  constraint customers_name_ok  check (char_length(name) <= 80)
);

comment on table public.customers is 'Klientët e njohur — libri i adresave dhe historiku i shkurtër.';

create index if not exists customers_phone_idx on public.customers (phone);
create index if not exists customers_last_idx  on public.customers (last_order_at desc);

create table if not exists public.customer_addresses (
  id          uuid primary key default gen_random_uuid(),
  customer_id uuid        not null references public.customers(id) on delete cascade,
  label       text        not null default '',
  address     text        not null,
  lat         double precision,
  lng         double precision,
  accuracy    integer,
  is_default  boolean     not null default false,
  created_at  timestamptz not null default now(),

  constraint cust_addr_ok  check (char_length(address) between 3 and 300),
  constraint cust_addr_lat check (lat is null or lat between -90 and 90),
  constraint cust_addr_lng check (lng is null or lng between -180 and 180)
);

comment on table public.customer_addresses is 'Adresat e ruajtura të një klienti, me pin në hartë.';

create index if not exists cust_addr_customer_idx on public.customer_addresses (customer_id);


-- ═══════════════════════ 3. STAFI ═══════════════════════
-- Kuzhina dhe motorristët hyjnë me kod, jo me email — askush nuk shkruan
-- email në motor ose me duar me miell. Kodi ruhet i hash-uar.

create table if not exists public.staff (
  id           uuid primary key default gen_random_uuid(),
  name         text        not null,
  role         text        not null,
  pin_hash     text,
  active       boolean     not null default true,
  phone        text,
  failed_tries integer     not null default 0,
  locked_until timestamptz,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),

  constraint staff_role_ok check (role in ('owner','manager','cashier','kitchen','driver')),
  constraint staff_name_ok check (char_length(name) between 2 and 60)
);

comment on table public.staff is 'Personat që përdorin programin: pronar, menaxher, banak, kuzhinë, motorrist.';

create index if not exists staff_role_idx on public.staff (role) where active;

-- Sesionet e pajisjeve. Tableti i kuzhinës dhe telefoni i motorristit mbajnë
-- një token, që të mos shkruhet kodi çdo herë.
create table if not exists public.staff_sessions (
  token      uuid primary key default gen_random_uuid(),
  staff_id   uuid        not null references public.staff(id) on delete cascade,
  device     text,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default now() + interval '30 days',
  last_seen  timestamptz not null default now()
);

create index if not exists staff_sessions_staff_idx on public.staff_sessions (staff_id);


-- ═══════════════════════ 4. NISJET E MOTORRISTËVE ═══════════════════════
-- Njësia bazë nuk është porosia, është nisja: 2–3 porosi që një motorrist i
-- merr bashkë dhe i mbyll një nga një.

create table if not exists public.runs (
  id          uuid primary key default gen_random_uuid(),
  driver_id   uuid        not null references public.staff(id) on delete restrict,
  started_at  timestamptz not null default now(),
  closed_at   timestamptz,
  cash_due    numeric(10,2) not null default 0,
  cash_handed numeric(10,2),
  handed_at   timestamptz,
  note        text,
  created_at  timestamptz not null default now()
);

comment on table public.runs is 'Një dalje e motorristit me disa porosi bashkë.';

create index if not exists runs_driver_idx on public.runs (driver_id, started_at desc);
create index if not exists runs_open_idx   on public.runs (started_at desc) where closed_at is null;

-- Gjurma e ndalesave: pozicioni regjistrohet në çastet kur motorristi e ka
-- faqen hapur gjithsesi — kur niset dhe kur dorëzon.
create table if not exists public.run_points (
  id        uuid primary key default gen_random_uuid(),
  run_id    uuid        not null references public.runs(id) on delete cascade,
  order_id  uuid,
  kind      text        not null default 'stop',
  lat       double precision,
  lng       double precision,
  accuracy  integer,
  at        timestamptz not null default now(),

  constraint run_points_kind_ok check (kind in ('start','stop','delivered','failed','ping','end')),
  constraint run_points_lat_ok  check (lat is null or lat between -90 and 90),
  constraint run_points_lng_ok  check (lng is null or lng between -180 and 180)
);

create index if not exists run_points_run_idx on public.run_points (run_id, at);


-- ═══════════════════════ 5. ZGJERIMI I POROSIVE ═══════════════════════
-- Kolonat e reja mbi tabelën ekzistuese. Të gjitha me `if not exists`, që
-- skedari të ekzekutohet edhe mbi një bazë që punon prej muajsh.

alter table public.orders add column if not exists customer_id    uuid references public.customers(id) on delete set null;
alter table public.orders add column if not exists channel        text not null default 'web';
alter table public.orders add column if not exists lat            double precision;
alter table public.orders add column if not exists lng            double precision;
alter table public.orders add column if not exists accuracy       integer;
alter table public.orders add column if not exists created_by     uuid references public.staff(id) on delete set null;
alter table public.orders add column if not exists driver_id      uuid references public.staff(id) on delete set null;
alter table public.orders add column if not exists run_id         uuid references public.runs(id) on delete set null;
alter table public.orders add column if not exists kitchen_at     timestamptz;
alter table public.orders add column if not exists picked_at      timestamptz;
alter table public.orders add column if not exists delivered_at   timestamptz;
alter table public.orders add column if not exists cash_collected numeric(10,2);
alter table public.orders add column if not exists fail_reason    text;

do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'orders_channel_ok') then
    alter table public.orders add constraint orders_channel_ok
      check (channel in ('web','phone','walkin','other'));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'orders_lat_ok') then
    alter table public.orders add constraint orders_lat_ok check (lat is null or lat between -90 and 90);
  end if;
  if not exists (select 1 from pg_constraint where conname = 'orders_lng_ok') then
    alter table public.orders add constraint orders_lng_ok check (lng is null or lng between -180 and 180);
  end if;
end $$;

create index if not exists orders_customer_idx on public.orders (customer_id);
create index if not exists orders_driver_idx   on public.orders (driver_id, created_at desc);
create index if not exists orders_run_idx      on public.orders (run_id);
create index if not exists orders_channel_idx  on public.orders (channel);


-- ═══════════════════════ 6. FURNITORËT ═══════════════════════

create table if not exists public.suppliers (
  id         uuid primary key default gen_random_uuid(),
  name       text        not null,
  nipt       text,
  phone      text,
  email      text,
  address    text,
  note       text,
  active     boolean     not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint suppliers_name_ok check (char_length(name) between 2 and 120)
);

comment on table public.suppliers is 'Furnitorët nga të cilët blihet malli.';

create index if not exists suppliers_active_idx on public.suppliers (name) where active;


-- ═══════════════════════ 7. MAGAZINA ═══════════════════════
-- Gjendja nuk ruhet si numër — ajo llogaritet nga lëvizjet. Kështu çdo copë
-- e gjendjes ka një shpjegim: kur hyri, nga kush, ose ku shkoi.

create table if not exists public.stock_items (
  id         uuid primary key default gen_random_uuid(),
  sku        text unique,
  name       text        not null,
  unit       text        not null default 'copë',
  category   text        not null default '',
  min_qty    numeric(12,3) not null default 0,
  cost       numeric(12,4) not null default 0,
  active     boolean     not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint stock_items_name_ok check (char_length(name) between 2 and 120),
  constraint stock_items_min_ok  check (min_qty >= 0),
  constraint stock_items_cost_ok check (cost >= 0)
);

comment on table public.stock_items is 'Artikujt e magazinës: lëndë e parë, pije, materiale.';

create index if not exists stock_items_cat_idx on public.stock_items (category) where active;

create table if not exists public.stock_moves (
  id         uuid primary key default gen_random_uuid(),
  item_id    uuid        not null references public.stock_items(id) on delete cascade,
  qty        numeric(12,3) not null,
  kind       text        not null,
  unit_cost  numeric(12,4),
  ref_type   text,
  ref_id     uuid,
  staff_id   uuid references public.staff(id) on delete set null,
  note       text,
  at         timestamptz not null default now(),

  constraint stock_moves_kind_ok check (kind in ('in','out','waste','count','production','return')),
  constraint stock_moves_qty_ok  check (qty <> 0)
);

comment on table public.stock_moves is
  'Çdo lëvizje malli. Hyrje me shenjë +, dalje me shenjë −. Gjendja është shuma.';

create index if not exists stock_moves_item_idx on public.stock_moves (item_id, at desc);
create index if not exists stock_moves_ref_idx  on public.stock_moves (ref_type, ref_id);

-- Gjendja aktuale, e llogaritur.
create or replace view public.stock_levels
with (security_invoker = true) as
select i.id, i.sku, i.name, i.unit, i.category, i.min_qty, i.cost, i.active,
       coalesce(sum(m.qty), 0)                            as qty,
       coalesce(sum(m.qty), 0) * i.cost                   as value,
       coalesce(sum(m.qty), 0) <= i.min_qty               as low,
       max(m.at)                                          as last_move_at
from public.stock_items i
left join public.stock_moves m on m.item_id = i.id
group by i.id;

comment on view public.stock_levels is 'Gjendja e magazinës, e llogaritur nga lëvizjet.';


-- ═══════════════════════ 8. BLERJET (HYRJET) ═══════════════════════

create sequence if not exists public.purchase_number_seq start 1;

create table if not exists public.purchases (
  id          uuid primary key default gen_random_uuid(),
  number      integer     not null default nextval('public.purchase_number_seq'),
  supplier_id uuid references public.suppliers(id) on delete set null,
  date        date        not null default current_date,
  status      text        not null default 'draft',
  subtotal    numeric(12,2) not null default 0,
  vat         numeric(12,2) not null default 0,
  total       numeric(12,2) not null default 0,
  doc_ref     text,
  note        text,
  staff_id    uuid references public.staff(id) on delete set null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),

  constraint purchases_status_ok check (status in ('draft','received','cancelled')),
  constraint purchases_total_ok  check (total >= 0)
);

comment on table public.purchases is 'Hyrjet e mallit nga furnitorët.';

create unique index if not exists purchases_number_idx on public.purchases (number);
create index if not exists purchases_supplier_idx on public.purchases (supplier_id, date desc);

create table if not exists public.purchase_lines (
  id          uuid primary key default gen_random_uuid(),
  purchase_id uuid        not null references public.purchases(id) on delete cascade,
  item_id     uuid        not null references public.stock_items(id) on delete restrict,
  qty         numeric(12,3) not null,
  unit_cost   numeric(12,4) not null default 0,
  total       numeric(12,2) not null default 0,

  constraint purchase_lines_qty_ok  check (qty > 0),
  constraint purchase_lines_cost_ok check (unit_cost >= 0)
);

create index if not exists purchase_lines_purchase_idx on public.purchase_lines (purchase_id);


-- ═══════════════════════ 9. RECETAT ═══════════════════════
-- Sa lëndë e parë shkon për një pjatë. Kjo lidh shitjen me magazinën:
-- kur porosia mbyllet, gjendja zbritet vetvetiu.

create table if not exists public.recipes (
  menu_item_id  text        not null references public.menu_items(id) on delete cascade,
  stock_item_id uuid        not null references public.stock_items(id) on delete cascade,
  qty           numeric(12,4) not null,
  primary key (menu_item_id, stock_item_id),

  constraint recipes_qty_ok check (qty > 0)
);

comment on table public.recipes is 'Përbërësit e një pjate — sa njësi magazine harxhon.';


-- ═══════════════════════ 10. DOKUMENTET E BRENDSHME ═══════════════════════
-- Fletë porosie për kuzhinën, fletë dorëzimi për motorristin, urdhërblerje
-- për furnitorin. NUK janë fatura tatimore — shihni shënimin në krye.

create sequence if not exists public.document_number_seq start 1;

create table if not exists public.documents (
  id         uuid primary key default gen_random_uuid(),
  number     integer     not null default nextval('public.document_number_seq'),
  kind       text        not null,
  ref_type   text,
  ref_id     uuid,
  title      text        not null default '',
  data       jsonb       not null default '{}'::jsonb,
  total      numeric(12,2),
  staff_id   uuid references public.staff(id) on delete set null,
  created_at timestamptz not null default now(),

  constraint documents_kind_ok check (kind in
    ('order_slip','kitchen_ticket','delivery_note','purchase_order','stock_count','internal_receipt'))
);

comment on table public.documents is
  'Dokumente të brendshme. Jo fatura tatimore — fatura lëshohet nga programi i certifikuar.';

create unique index if not exists documents_number_idx on public.documents (number);
create index if not exists documents_ref_idx  on public.documents (ref_type, ref_id);
create index if not exists documents_kind_idx on public.documents (kind, created_at desc);


-- ═══════════════════════ 11. updated_at AUTOMATIK ═══════════════════════

do $$
declare t text;
begin
  foreach t in array array['order_phases','customers','staff','suppliers',
                           'stock_items','purchases']
  loop
    execute format('drop trigger if exists %I_touch on public.%I', t, t);
    execute format(
      'create trigger %I_touch before update on public.%I
       for each row execute function public.touch_updated_at()', t, t);
  end loop;
end $$;


-- ═══════════════════════ 12. SIGURIA ═══════════════════════
-- Rregulli: klienti nuk lexon asgjë nga këto tabela. Stafi i identifikuar
-- lexon dhe shkruan. Kuzhina dhe motorristët punojnë përmes funksioneve me
-- token, jo me akses të drejtpërdrejtë.

do $$
declare t text;
begin
  foreach t in array array['order_phases','customers','customer_addresses','staff',
                           'staff_sessions','runs','run_points','suppliers','stock_items',
                           'stock_moves','purchases','purchase_lines','recipes','documents']
  loop
    execute format('alter table public.%I enable row level security', t);
    execute format('drop policy if exists "stafi i identifikuar" on public.%I', t);
    execute format(
      'create policy "stafi i identifikuar" on public.%I
       for all to authenticated using (true) with check (true)', t);
  end loop;
end $$;

-- Fazat i lexon edhe faqja publike, që hapat e gjurmimit të kenë emrat e tu.
drop policy if exists "fazat lexohen nga te gjithe" on public.order_phases;
create policy "fazat lexohen nga te gjithe"
  on public.order_phases for select
  to anon, authenticated
  using (true);


-- ═══════════════════════ 13. HYRJA E STAFIT ME KOD ═══════════════════════
-- Kodi kurrë nuk kalon te klienti dhe kurrë nuk ruhet i hapur. Pas 5 gabimesh
-- llogaria bllokohet për 15 minuta, që kodi 4-shifror të mos gjendet me prova.

create or replace function public.set_staff_pin(p_staff_id uuid, p_pin text)
returns void
language plpgsql
security definer
set search_path = public, extensions
as $$
begin
  if p_pin !~ '^[0-9]{4,8}$' then
    raise exception 'Kodi duhet të jetë 4–8 shifra.';
  end if;

  -- Dy veta nuk mund të kenë të njëjtin kod: hyrja bëhet vetëm me kod, pa emër,
  -- kështu që një kod i përsëritur do të fuste personin e gabuar.
  if exists (
    select 1 from public.staff
     where id <> p_staff_id and active and pin_hash is not null
       and pin_hash = crypt(p_pin, pin_hash)
  ) then
    raise exception 'Ky kod përdoret tashmë nga dikush tjetër. Zgjidh një tjetër.';
  end if;

  update public.staff
     set pin_hash = crypt(p_pin, gen_salt('bf')),
         failed_tries = 0, locked_until = null
   where id = p_staff_id;
end;
$$;

revoke all on function public.set_staff_pin(uuid, text) from public, anon;
grant execute on function public.set_staff_pin(uuid, text) to authenticated;

create or replace function public.staff_login(p_pin text, p_device text default null)
returns table (token uuid, staff_id uuid, name text, role text)
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  s record;
  t uuid;
begin
  select * into s
    from public.staff
   where active and pin_hash is not null
     and (locked_until is null or locked_until < now())
     and pin_hash = crypt(p_pin, pin_hash)
   limit 1;

  if s.id is null then
    update public.staff
       set failed_tries = failed_tries + 1,
           locked_until = case when failed_tries + 1 >= 5
                               then now() + interval '15 minutes' else locked_until end
     where active and pin_hash is not null;
    raise exception 'Kod i gabuar.';
  end if;

  update public.staff set failed_tries = 0, locked_until = null where id = s.id;

  insert into public.staff_sessions (staff_id, device)
  values (s.id, left(coalesce(p_device, ''), 120))
  returning staff_sessions.token into t;

  return query select t, s.id, s.name, s.role;
end;
$$;

revoke all on function public.staff_login(text, text) from public;
grant execute on function public.staff_login(text, text) to anon, authenticated;

-- Kthen stafin nëse tokeni është i vlefshëm; përndryshe gabim.
create or replace function public.staff_by_token(p_token uuid)
returns table (staff_id uuid, name text, role text)
language plpgsql
security definer
set search_path = public
as $$
declare s record;
begin
  select st.id, st.name, st.role into s
    from public.staff_sessions ss
    join public.staff st on st.id = ss.staff_id
   where ss.token = p_token
     and ss.expires_at > now()
     and st.active
   limit 1;

  if s.id is null then
    raise exception 'Sesioni skadoi. Hyr përsëri me kod.';
  end if;

  update public.staff_sessions set last_seen = now() where staff_sessions.token = p_token;
  return query select s.id, s.name, s.role;
end;
$$;

revoke all on function public.staff_by_token(uuid) from public;
grant execute on function public.staff_by_token(uuid) to anon, authenticated;

create or replace function public.staff_logout(p_token uuid)
returns void
language sql
security definer
set search_path = public
as $$
  delete from public.staff_sessions where token = p_token;
$$;

revoke all on function public.staff_logout(uuid) from public;
grant execute on function public.staff_logout(uuid) to anon, authenticated;


-- ═══════════════════════ 14. LIBRI I ADRESAVE ═══════════════════════
-- Përdoret vetëm nga banaku i identifikuar, kur shkruan një porosi telefoni.

create or replace function public.lookup_customer(p_phone text)
returns jsonb
language sql
security definer
stable
set search_path = public
as $$
  select jsonb_build_object(
    'customer', to_jsonb(c) - 'note',
    'addresses', coalesce(
      (select jsonb_agg(to_jsonb(a) order by a.is_default desc, a.created_at desc)
         from public.customer_addresses a where a.customer_id = c.id), '[]'::jsonb),
    'last_order', (
      select jsonb_build_object('id', o.id, 'number', o.number, 'items', o.items, 'total', o.total)
        from public.orders o
       where o.customer_id = c.id and o.status = 'done'
       order by o.created_at desc limit 1)
  )
  from public.customers c
  where regexp_replace(c.phone, '\D', '', 'g') = regexp_replace(coalesce(p_phone,''), '\D', '', 'g')
    and length(regexp_replace(coalesce(p_phone,''), '\D', '', 'g')) >= 6
  limit 1;
$$;

revoke all on function public.lookup_customer(text) from public, anon;
grant execute on function public.lookup_customer(text) to authenticated;

-- Krijon ose përditëson klientin dhe ruan adresën e re, pa krijuar dublikatë.
create or replace function public.upsert_customer(
  p_phone text, p_name text, p_address text default null,
  p_lat double precision default null, p_lng double precision default null,
  p_accuracy integer default null)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare cid uuid;
begin
  insert into public.customers (phone, name)
  values (p_phone, coalesce(p_name, ''))
  on conflict (phone) do update
    set name = case when excluded.name <> '' then excluded.name else public.customers.name end
  returning id into cid;

  if p_address is not null and char_length(trim(p_address)) >= 3 then
    if not exists (
      select 1 from public.customer_addresses a
       where a.customer_id = cid and lower(trim(a.address)) = lower(trim(p_address))
    ) then
      insert into public.customer_addresses (customer_id, address, lat, lng, accuracy)
      values (cid, trim(p_address), p_lat, p_lng, p_accuracy);
    else
      update public.customer_addresses
         set lat = coalesce(p_lat, lat), lng = coalesce(p_lng, lng),
             accuracy = coalesce(p_accuracy, accuracy)
       where customer_id = cid and lower(trim(address)) = lower(trim(p_address));
    end if;
  end if;

  return cid;
end;
$$;

revoke all on function public.upsert_customer(text, text, text, double precision, double precision, integer) from public, anon;
grant execute on function public.upsert_customer(text, text, text, double precision, double precision, integer) to authenticated;


-- ═══════════════════════ 15. NUMËRUESIT E KLIENTIT ═══════════════════════
-- Sa porosi ka bërë dhe sa ka lënë — mbahen të freskëta nga vetë baza.

create or replace function public.bump_customer_stats()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.status = 'done' and (tg_op = 'INSERT' or coalesce(old.status,'') <> 'done')
     and new.customer_id is not null then
    update public.customers
       set orders_count  = orders_count + 1,
           orders_total  = orders_total + coalesce(new.total, 0),
           last_order_at = now()
     where id = new.customer_id;
  end if;
  return new;
end;
$$;

drop trigger if exists orders_customer_stats on public.orders;
create trigger orders_customer_stats
  after insert or update of status on public.orders
  for each row execute function public.bump_customer_stats();


-- ═══════════════════════ 16. ZBRITJA E MAGAZINËS ═══════════════════════
-- Kur porosia mbyllet, receta zbret lëndën e parë. Nëse pjata s'ka recetë,
-- nuk ndodh asgjë — magazina mbetet e saktë vetëm për ato që i ke përshkruar.

create or replace function public.consume_stock_for_order(p_order_id uuid)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare n integer := 0;
begin
  if exists (select 1 from public.stock_moves
              where ref_type = 'order' and ref_id = p_order_id and kind = 'production') then
    return 0;   -- e zbritur më parë
  end if;

  insert into public.stock_moves (item_id, qty, kind, ref_type, ref_id, note)
  select r.stock_item_id,
         -1 * r.qty * (line->>'qty')::numeric,
         'production', 'order', p_order_id,
         'Zbritur nga porosia'
    from public.orders o
    cross join lateral jsonb_array_elements(o.items) as line
    join public.recipes r on r.menu_item_id = line->>'id'
   where o.id = p_order_id;

  get diagnostics n = row_count;
  return n;
end;
$$;

revoke all on function public.consume_stock_for_order(uuid) from public, anon;
grant execute on function public.consume_stock_for_order(uuid) to authenticated;


-- ═══════════════════════ 17. FLETA E DITËS SË MOTORRISTIT ═══════════════════════

create or replace function public.driver_day(p_date date default current_date)
returns table (
  driver_id uuid, driver_name text, deliveries bigint,
  cash numeric, card numeric,
  avg_minutes numeric, avg_wait_minutes numeric, worst_minutes numeric
)
language sql
security definer
stable
set search_path = public
as $$
  select s.id, s.name,
         count(o.id),
         coalesce(sum(o.total) filter (where o.payment = 'cash'), 0),
         coalesce(sum(o.total) filter (where o.payment = 'card'), 0),
         round(avg(extract(epoch from (o.delivered_at - o.picked_at)) / 60.0)::numeric, 1),
         round(avg(extract(epoch from (o.picked_at   - o.ready_at))  / 60.0)::numeric, 1),
         round(max(extract(epoch from (o.delivered_at - o.picked_at)) / 60.0)::numeric, 1)
    from public.staff s
    join public.orders o on o.driver_id = s.id
   where s.role = 'driver'
     and o.delivered_at is not null
     and o.delivered_at::date = p_date
   group by s.id, s.name
   order by count(o.id) desc;
$$;

revoke all on function public.driver_day(date) from public, anon;
grant execute on function public.driver_day(date) to authenticated;


-- ═══════════════════════ 18. FAZAT PËR FAQEN PUBLIKE ═══════════════════════
-- Faqja e gjurmimit i merr hapat me emrat që ke vendosur ti.

create or replace function public.public_phases()
returns table (key text, sort integer, label_sq text, label_en text, icon text, color text)
language sql
security definer
stable
set search_path = public
as $$
  select p.key, p.sort,
         coalesce(nullif(p.customer_label_sq, ''), p.label_sq),
         coalesce(nullif(p.customer_label_en, ''), p.label_en),
         p.icon, p.color
    from public.order_phases p
   where p.enabled and p.customer_visible and p.key <> 'cancelled'
   order by p.sort;
$$;

revoke all on function public.public_phases() from public;
grant execute on function public.public_phases() to anon, authenticated;


-- ═══════════════════════ 19. EKRANI I KUZHINËS ═══════════════════════
-- Kuzhina nuk e prek tabelën drejtpërdrejt: hyn me kod dhe punon përmes këtyre
-- dy funksioneve. Ato kthejnë VETËM atë që i duhet për të gatuar — pa emër,
-- pa telefon, pa adresë. Një ekran i varur në mur nuk ka pse t'i mbajë ato të
-- dukshme gjithë ditën.

create or replace function public.kds_orders(p_token uuid)
returns table (
  id uuid, number int, status text, kind text, items jsonb, note text,
  created_at timestamptz, accepted_at timestamptz, kitchen_at timestamptz,
  ready_at timestamptz, prep_minutes int
)
language plpgsql
security definer
stable
set search_path = public
as $$
declare r text;
begin
  select s.role into r from public.staff_by_token(p_token) s;
  if r not in ('kitchen','manager','owner') then
    raise exception 'Ky kod nuk e hap ekranin e kuzhinës.';
  end if;

  return query
    select o.id, o.number, o.status, o.kind, o.items, o.note,
           o.created_at, o.accepted_at, o.kitchen_at, o.ready_at, o.prep_minutes
      from public.orders o
     where o.status in ('new','accepted','preparing','ready')
       and o.created_at > now() - interval '12 hours'
     order by o.created_at;
end;
$$;

revoke all on function public.kds_orders(uuid) from public;
grant execute on function public.kds_orders(uuid) to anon, authenticated;

/* Kalimi i fazës nga kuzhina. Lejohen vetëm hapat që kuzhina ka të drejtë të
   bëjë — që një prekje e gabuar te tableti të mos e shpallë porosinë të
   dorëzuar. Kthimi mbrapsht lejohet, sepse butoni preket gabimisht shpesh. */
create or replace function public.kds_bump(p_token uuid, p_order uuid, p_status text)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare r text; cur text;
begin
  select s.role into r from public.staff_by_token(p_token) s;
  if r not in ('kitchen','manager','owner') then
    raise exception 'Ky kod nuk e hap ekranin e kuzhinës.';
  end if;

  select status into cur from public.orders where id = p_order;
  if cur is null then raise exception 'Porosia nuk u gjet.'; end if;

  if not (
       (p_status = 'preparing' and cur in ('new','accepted','ready'))
    or (p_status = 'ready'     and cur in ('preparing','accepted'))
  ) then
    raise exception 'Kalimi % → % nuk lejohet nga kuzhina.', cur, p_status;
  end if;

  update public.orders
     set status      = p_status,
         kitchen_at  = case when p_status = 'preparing' and kitchen_at is null
                            then now() else kitchen_at end,
         ready_at    = case when p_status = 'ready' then now()
                            when p_status = 'preparing' then null
                            else ready_at end
   where id = p_order;

  return p_status;
end;
$$;

revoke all on function public.kds_bump(uuid, uuid, text) from public;
grant execute on function public.kds_bump(uuid, uuid, text) to anon, authenticated;


-- ============================================================================
-- Gati. Hapat e ardhshëm te paneli:
--   Cilësimet → Fazat      — riemërto hapat me fjalët e kuzhinës sate
--   Cilësimet → Stafi      — shto motorristët dhe kodet e tyre
--   Magazina  → Artikujt   — shto lëndën e parë, pastaj recetat
-- ============================================================================
