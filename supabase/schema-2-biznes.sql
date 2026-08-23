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

  constraint staff_role_ok check (role in ('owner','manager','cashier','kitchen','pizza','driver')),
  constraint staff_name_ok check (char_length(name) between 2 and 60)
);

-- Furra e picës u nda nga kuzhina më vonë. Instalimet e vjetra e kanë kufirin
-- pa 'pizza', ndaj vendoset sërish — pa këtë, personi i furrës nuk krijohet dot.
alter table public.staff drop constraint if exists staff_role_ok;
alter table public.staff add constraint staff_role_ok check (role in
  ('owner','manager','cashier','kitchen','pizza','driver'));

comment on table public.staff is
  'Personat që përdorin programin: pronar, menaxher, banak, kuzhinë, furrë, motorrist.';

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


-- ═══════════════════════ 19. HIERARKIA E EKRANEVE ═══════════════════════
-- Rregulli i artë: pronari sheh gjithçka, gjithmonë, dhe kjo nuk konfigurohet
-- dot — përndryshe një gabim i vetëm te cilësimet do të mbyllte jashtë të
-- vetmin person që i rregullon cilësimet. Të tjerët shohin atë që cakton ai.

create table if not exists public.role_screens (
  role   text not null,
  screen text not null,
  primary key (role, screen),

  constraint role_screens_role_ok check (role in ('manager','cashier','kitchen','pizza','driver')),
  constraint role_screens_screen_ok check (screen in
    ('neworder','orders','kds','oven','runs','bookings','menu','stock','reports','staff','settings'))
);

-- Po ashtu vetërregullim për instalimet e mëparshme: roli 'pizza' dhe ekrani
-- 'oven' nuk ekzistonin kur u ngrit tabela.
alter table public.role_screens drop constraint if exists role_screens_role_ok;
alter table public.role_screens add constraint role_screens_role_ok check (role in
  ('manager','cashier','kitchen','pizza','driver'));
alter table public.role_screens drop constraint if exists role_screens_screen_ok;
alter table public.role_screens add constraint role_screens_screen_ok check (screen in
  ('neworder','orders','kds','oven','runs','bookings','menu','stock','reports','staff','settings'));

comment on table public.role_screens is
  'Cilat ekrane sheh secili rol. Pronari nuk figuron këtu — ai sheh gjithçka.';

-- Vlerat fillestare: secili sheh atë që i duhet për punën e vet, jo më shumë.
insert into public.role_screens (role, screen) values
  ('manager','neworder'), ('manager','orders'), ('manager','kds'), ('manager','runs'),
  ('manager','bookings'), ('manager','menu'), ('manager','stock'), ('manager','reports'),
  ('cashier','neworder'), ('cashier','orders'), ('cashier','bookings'),
  ('kitchen','kds'),
  ('pizza','oven'),
  ('driver','runs')
on conflict do nothing;

insert into public.role_screens (role, screen) values
  ('manager','oven')
on conflict do nothing;

alter table public.role_screens enable row level security;
drop policy if exists "stafi i identifikuar" on public.role_screens;
create policy "stafi i identifikuar" on public.role_screens
  for all to authenticated using (true) with check (true);

/* Ekranet që i lejohen mbajtësit të një tokeni. Pronari i merr të gjitha
   pa i kërkuar askund — kjo është e ngurtë me qëllim. */
create or replace function public.my_screens(p_token uuid)
returns table (staff_id uuid, name text, role text, screens text[])
language plpgsql
security definer
stable
set search_path = public
as $$
declare s record;
begin
  select st.staff_id, st.name, st.role into s from public.staff_by_token(p_token) st;

  if s.role = 'owner' then
    return query select s.staff_id, s.name, s.role, array[
      'neworder','orders','kds','oven','runs','bookings','menu','stock','reports','staff','settings'];
  else
    return query
      select s.staff_id, s.name, s.role,
             coalesce(array_agg(rs.screen order by rs.screen), '{}')
        from public.role_screens rs
       where rs.role = s.role;
  end if;
end;
$$;

revoke all on function public.my_screens(uuid) from public;
grant execute on function public.my_screens(uuid) to anon, authenticated;

/* Ndihmës i brendshëm: a e ka ky token të drejtën e këtij ekrani? */
create or replace function public.has_screen(p_token uuid, p_screen text)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select coalesce(bool_or(p_screen = any(s.screens)), false)
    from public.my_screens(p_token) s;
$$;

revoke all on function public.has_screen(uuid, text) from public;
grant execute on function public.has_screen(uuid, text) to anon, authenticated;


-- ═══════════════════════ 20. STACIONET E PËRGATITJES ═══════════════════════
-- Brenda dyqanit gatuhet në dy vende të ndara: kuzhina dhe furra e picës.
-- Furra ka njeriun e vet, ritmin e vet dhe ekranin e vet; picat dhe sanduiçët
-- me brumë pice nuk kalojnë fare nga kuzhina. Prandaj çdo pjatë i përket një
-- stacioni, dhe një porosi e vetme mund të ndahet mes të dyve.
--
--   kitchen — kuzhina
--   oven    — furra e picës
--   none    — nuk gatuhet fare (pijet, uji, birra) — nuk shfaqet në asnjë ekran
--
-- Ndarjen e vendos pronari te paneli, jo kodi. Këtu ruhet vetëm ajo që ai zgjedh.

create table if not exists public.category_stations (
  category text primary key,
  station  text not null default 'kitchen',
  constraint category_stations_ok check (station in ('kitchen','oven','none'))
);

comment on table public.category_stations is
  'Cila kategori gatuhet ku. Pronari e ndryshon te Paneli → Kategoritë.';

-- Ndarja e parë, ajo që përputhet me dyqanin sot. Rreshtat nuk mbishkruhen më
-- pas: nëse pronari e ka lëvizur një kategori, zgjedhja e tij mbetet.
insert into public.category_stations (category, station) values
  ('pizza','oven'), ('fast','oven'),
  ('rest','kitchen'), ('trad','kitchen'), ('starter','kitchen'),
  ('pije','none')
on conflict (category) do nothing;

alter table public.category_stations enable row level security;
drop policy if exists "stacionet lexohen nga te gjithe" on public.category_stations;
create policy "stacionet lexohen nga te gjithe"
  on public.category_stations for select to anon, authenticated using (true);
drop policy if exists "stacionet shkruhen vetem nga admini" on public.category_stations;
create policy "stacionet shkruhen vetem nga admini"
  on public.category_stations for all to authenticated using (true) with check (true);

-- Përjashtimi për një pjatë të vetme: një pjatë mund të mos e ndjekë kategorinë
-- e vet. Bosh do të thotë «si gjithë kategoria».
alter table public.menu_items add column if not exists station text;
alter table public.menu_items drop constraint if exists menu_items_station_ok;
alter table public.menu_items add constraint menu_items_station_ok
  check (station is null or station in ('kitchen','oven','none'));

/* Ku gatuhet kjo pjatë? Përgjigjja: përjashtimi i pjatës, përndryshe kategoria,
   përndryshe kuzhina — që një pjatë e panjohur të mos humbasë pa u parë. */
create or replace function public.item_station(p_item_id text, p_category text default null)
returns text
language sql
stable
set search_path = public
as $$
  select coalesce(
    (select coalesce(mi.station, cs.station)
       from public.menu_items mi
       left join public.category_stations cs on cs.category = mi.category
      where mi.id = p_item_id),
    -- Pjata mund të mos jetë ende te menuja e publikuar. Rreshti i porosisë e
    -- mban vetë kategorinë, ndaj ndarja punon që nga porosia e parë.
    (select cs.station from public.category_stations cs where cs.category = p_category),
    'kitchen');
$$;

drop function if exists public.item_station(text);

/* Rreshtat e porosisë me stacionin e ngjitur secilit. Nëse rreshti e mban
   tashmë stacionin nga çasti i porosisë, ai respektohet — porositë e vjetra
   nuk ndryshojnë vend sepse ndarja u ndryshua pas tyre. */
create or replace function public.order_lines_tagged(p_items jsonb)
returns jsonb
language sql
stable
set search_path = public
as $$
  select coalesce(jsonb_agg(
           case when li->>'station' in ('kitchen','oven','none') then li
                else li || jsonb_build_object('station',
                       public.item_station(li->>'id',
                         coalesce(li->>'c', li->>'category'))) end
           order by ord), '[]'::jsonb)
    from jsonb_array_elements(coalesce(p_items, '[]'::jsonb)) with ordinality t(li, ord);
$$;

/* Cilat stacione duhet ta gatuajnë këtë porosi. Pijet nuk numërohen. */
create or replace function public.order_stations(p_items jsonb)
returns text[]
language sql
stable
set search_path = public
as $$
  select coalesce(array_agg(distinct li->>'station' order by li->>'station'), '{}')
    from jsonb_array_elements(public.order_lines_tagged(p_items)) li
   where li->>'station' in ('kitchen','oven');
$$;

-- Cili stacion e ka mbaruar pjesën e vet. `{"oven":"2026-…"}` do të thotë që
-- furra e ka dhënë, kuzhina jo — porosia nuk është ende gati për motorristin.
alter table public.orders add column if not exists station_ready jsonb not null default '{}'::jsonb;


-- ═══════════════════════ 20b. EKRANET E GATIMIT ═══════════════════════
-- Kuzhina dhe furra nuk e prekin tabelën drejtpërdrejt: hyjnë me kod dhe
-- punojnë përmes këtyre dy funksioneve. Ato kthejnë VETËM atë që u duhet për
-- të gatuar — pa emër, pa telefon, pa adresë. Një ekran i varur në mur nuk ka
-- pse t'i mbajë ato të dukshme gjithë ditën.
--
-- Kush hyn ku e vendos pronari te «Kush sheh çfarë»: ekrani 'kds' është
-- kuzhina, ekrani 'oven' është furra. Roli nuk është i ngurtë.

drop function if exists public.kds_orders(uuid);
create or replace function public.kds_orders(p_token uuid, p_station text default 'kitchen')
returns table (
  id uuid, number int, status text, kind text, items jsonb, note text,
  created_at timestamptz, accepted_at timestamptz, kitchen_at timestamptz,
  ready_at timestamptz, prep_minutes int,
  station_done boolean, waiting_on text[]
)
language plpgsql
security definer
stable
set search_path = public
as $$
begin
  if p_station not in ('kitchen','oven') then
    raise exception 'Stacion i panjohur: %', p_station;
  end if;
  if not public.has_screen(p_token, case p_station when 'oven' then 'oven' else 'kds' end) then
    raise exception 'Ky kod nuk e hap këtë ekran.';
  end if;

  return query
    with o as (
      select ord.*, public.order_lines_tagged(ord.items) as tagged
        from public.orders ord
       where ord.status in ('new','accepted','preparing','ready')
         and ord.created_at > now() - interval '12 hours'
    )
    select o.id, o.number, o.status, o.kind, o.tagged, o.note,
           o.created_at, o.accepted_at, o.kitchen_at, o.ready_at, o.prep_minutes,
           (o.station_ready ? p_station) as station_done,
           array(select s from unnest(public.order_stations(o.items)) s
                  where not (o.station_ready ? s)) as waiting_on
      from o
     where p_station = any(public.order_stations(o.items))
     order by o.created_at;
end;
$$;

revoke all on function public.kds_orders(uuid, text) from public;
grant execute on function public.kds_orders(uuid, text) to anon, authenticated;

/* Kalimi i fazës nga një stacion. Lejohen vetëm hapat që gatimi ka të drejtë
   të bëjë — që një prekje e gabuar te tableti të mos e shpallë porosinë të
   dorëzuar. Kthimi mbrapsht lejohet, sepse butoni preket gabimisht shpesh.
   Porosia bëhet «gati» vetëm kur TË GJITHË stacionet e saj e kanë dhënë:
   një picë e ftohtë duke pritur tavën në kuzhinë është pikërisht ajo që kjo
   pjesë ndalon. */
drop function if exists public.kds_bump(uuid, uuid, text);
create or replace function public.kds_bump(
  p_token uuid, p_order uuid, p_status text, p_station text default 'kitchen')
returns text
language plpgsql
security definer
set search_path = public
as $$
declare cur text; need text[]; ready jsonb; mbetur text[];
begin
  if p_station not in ('kitchen','oven') then
    raise exception 'Stacion i panjohur: %', p_station;
  end if;
  if not public.has_screen(p_token, case p_station when 'oven' then 'oven' else 'kds' end) then
    raise exception 'Ky kod nuk e hap këtë ekran.';
  end if;

  select o.status, public.order_stations(o.items), o.station_ready
    into cur, need, ready
    from public.orders o where o.id = p_order;
  if cur is null then raise exception 'Porosia nuk u gjet.'; end if;
  if not (p_station = any(need)) then
    raise exception 'Kjo porosi nuk ka asgjë për këtë stacion.';
  end if;

  if not (
       (p_status = 'preparing' and cur in ('new','accepted','preparing','ready'))
    or (p_status = 'ready'     and cur in ('new','accepted','preparing'))
  ) then
    raise exception 'Kalimi % → % nuk lejohet nga gatimi.', cur, p_status;
  end if;

  if p_status = 'ready' then
    ready := ready || jsonb_build_object(p_station, to_char(now() at time zone 'utc',
                        'YYYY-MM-DD"T"HH24:MI:SS"Z"'));
  else
    ready := ready - p_station;          -- kthim mbrapsht: ky stacion po e rimerr
  end if;

  select array(select s from unnest(need) s where not (ready ? s)) into mbetur;

  update public.orders
     set station_ready = ready,
         status = case when cardinality(mbetur) = 0 then 'ready' else 'preparing' end,
         kitchen_at = coalesce(kitchen_at, now()),
         ready_at = case when cardinality(mbetur) = 0 then coalesce(ready_at, now())
                         else null end
   where id = p_order;

  -- Kthehet gjendja e vërtetë e porosisë, jo ajo që u kërkua: nëse stacioni
  -- tjetër ende po punon, ekrani duhet ta dijë se porosia s'është gati.
  return case when cardinality(mbetur) = 0 then 'ready' else 'preparing' end;
end;
$$;

revoke all on function public.kds_bump(uuid, uuid, text, text) from public;
grant execute on function public.kds_bump(uuid, uuid, text, text) to anon, authenticated;


-- ═══════════════════════ 21. EKRANI I MOTORRISTIT ═══════════════════════
-- Ndryshe nga kuzhina, motorristi i SHEH të dhënat e klientit: pa emër,
-- telefon dhe adresë nuk dorëzon dot. Kufiri këtu është koha — sheh vetëm
-- porositë e hapura, jo historikun e dyqanit.

drop function if exists public.drv_ready(uuid);
create or replace function public.drv_ready(p_token uuid)
returns table (
  id uuid, number int, kind text, customer_name text, phone text, address text,
  lat double precision, lng double precision, total numeric, payment text,
  note text, ready_at timestamptz, zone text
)
language plpgsql
security definer
stable
set search_path = public
as $$
begin
  if not public.has_screen(p_token, 'runs') then
    raise exception 'Ky kod nuk e hap ekranin e motorristit.';
  end if;

  return query
    select o.id, o.number, o.kind, o.customer_name, o.phone, o.address,
           o.lat, o.lng, o.total, o.payment, o.note, o.ready_at, o.zone
      from public.orders o
     where o.status = 'ready' and o.kind = 'delivery' and o.run_id is null
       and o.created_at > now() - interval '12 hours'
     order by o.ready_at nulls last, o.created_at;
end;
$$;

revoke all on function public.drv_ready(uuid) from public;
grant execute on function public.drv_ready(uuid) to anon, authenticated;

/* Nisja: disa porosi merren bashkë. Kjo është njësia e vërtetë e punës këtu,
   jo porosia e vetme — motorristët dalin me 2–3 dhe i mbyllin një nga një. */
create or replace function public.drv_start_run(
  p_token uuid, p_orders uuid[],
  p_lat double precision default null, p_lng double precision default null)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare s record; rid uuid; n int;
begin
  select st.staff_id, st.role into s from public.staff_by_token(p_token) st;
  if not public.has_screen(p_token, 'runs') then
    raise exception 'Ky kod nuk e hap ekranin e motorristit.';
  end if;
  if p_orders is null or array_length(p_orders, 1) is null then
    raise exception 'Zgjidh të paktën një porosi.';
  end if;

  -- Një motorrist ka të shumtën një nisje të hapur. Përndryshe ndalesat e dy
  -- daljeve përzihen dhe arka e ditës nuk mbyllet dot.
  if exists (select 1 from public.runs where driver_id = s.staff_id and closed_at is null) then
    raise exception 'Ke ende një nisje të hapur. Mbylle atë përpara se të nisesh sërish.';
  end if;

  insert into public.runs (driver_id) values (s.staff_id) returning id into rid;

  update public.orders
     set run_id = rid, driver_id = s.staff_id,
         status = 'delivering', picked_at = now()
   where id = any(p_orders) and status = 'ready' and run_id is null;
  get diagnostics n = row_count;

  if n = 0 then
    delete from public.runs where id = rid;
    raise exception 'Këto porosi u morën nga dikush tjetër. Rifresko listën.';
  end if;

  update public.runs set cash_due = (
    select coalesce(sum(total), 0) from public.orders
     where run_id = rid and payment = 'cash') where id = rid;

  insert into public.run_points (run_id, kind, lat, lng)
  values (rid, 'start', p_lat, p_lng);

  return rid;
end;
$$;

revoke all on function public.drv_start_run(uuid, uuid[], double precision, double precision) from public;
grant execute on function public.drv_start_run(uuid, uuid[], double precision, double precision) to anon, authenticated;

/* Nisja e hapur e këtij motorristi, me ndalesat e mbetura. */
drop function if exists public.drv_my_run(uuid);
create or replace function public.drv_my_run(p_token uuid)
returns table (
  run_id uuid, started_at timestamptz, cash_due numeric,
  id uuid, number int, status text, customer_name text, phone text, address text,
  lat double precision, lng double precision, total numeric, payment text,
  note text, delivered_at timestamptz, fail_reason text, zone text
)
language plpgsql
security definer
stable
set search_path = public
as $$
declare s record;
begin
  select st.staff_id into s from public.staff_by_token(p_token) st;
  if not public.has_screen(p_token, 'runs') then
    raise exception 'Ky kod nuk e hap ekranin e motorristit.';
  end if;

  return query
    select r.id, r.started_at, r.cash_due,
           o.id, o.number, o.status, o.customer_name, o.phone, o.address,
           o.lat, o.lng, o.total, o.payment, o.note, o.delivered_at, o.fail_reason, o.zone
      from (select * from public.runs
             where driver_id = s.staff_id and closed_at is null
             order by started_at desc limit 1) r
      left join public.orders o on o.run_id = r.id
     order by o.delivered_at nulls first, o.number;
end;
$$;

revoke all on function public.drv_my_run(uuid) from public;
grant execute on function public.drv_my_run(uuid) to anon, authenticated;

/* Dorëzimi. Vendndodhja regjistrohet në çastin kur motorristi e ka faqen
   hapur gjithsesi — pa aplikacion, pa gjurmim të fshehtë. */
create or replace function public.drv_delivered(
  p_token uuid, p_order uuid,
  p_lat double precision default null, p_lng double precision default null,
  p_cash numeric default null)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare s record; rid uuid; left_n int;
begin
  select st.staff_id into s from public.staff_by_token(p_token) st;
  if not public.has_screen(p_token, 'runs') then
    raise exception 'Ky kod nuk e hap ekranin e motorristit.';
  end if;

  update public.orders
     set status = 'done', delivered_at = now(), done_at = now(),
         cash_collected = p_cash
   where id = p_order and driver_id = s.staff_id and status = 'delivering'
  returning run_id into rid;

  if rid is null then raise exception 'Kjo porosi nuk është në nisjen tënde.'; end if;

  insert into public.run_points (run_id, order_id, kind, lat, lng)
  values (rid, p_order, 'delivered', p_lat, p_lng);

  -- HARTA QË MËSON. Në çastin që motorristi shtyp «U dorëzua», telefoni i tij
  -- është te dera. Ajo pikë i ngjitet adresës së klientit dhe herën tjetër e
  -- dimë saktësisht ku është — pa kërkuar askund, pa paguar asgjë, pa i shtuar
  -- askujt asnjë sekondë pune. Kjo është e vetmja mënyrë e besueshme për të
  -- ndërtuar hartën e adresave në Durrës, ku rrugët nuk kanë numra.
  if p_lat is not null and p_lng is not null then
    update public.customer_addresses ca
       set lat = p_lat, lng = p_lng, accuracy = null,
           confirmed_at = now(), confirmed_by = s.staff_id
      from public.orders o
     where o.id = p_order
       and ca.customer_id = o.customer_id
       and lower(trim(ca.address)) = lower(trim(o.address))
       -- Një pikë e konfirmuar nuk mbishkruhet nga një tjetër brenda ditës:
       -- adresa nuk lëviz, dhe një dorëzim i shënuar me vonesë do ta prishte.
       and (ca.confirmed_at is null or ca.confirmed_at < now() - interval '1 day');
  end if;

  -- Nisja mbyllet vetë te ndalesa e fundit; askush s'ka pse ta kujtojë.
  select count(*) into left_n from public.orders
   where run_id = rid and status not in ('done','cancelled');
  if left_n = 0 then
    update public.runs set closed_at = now() where id = rid;
    insert into public.run_points (run_id, kind, lat, lng) values (rid, 'end', p_lat, p_lng);
  end if;

  return 'done';
end;
$$;

revoke all on function public.drv_delivered(uuid, uuid, double precision, double precision, numeric) from public;
grant execute on function public.drv_delivered(uuid, uuid, double precision, double precision, numeric) to anon, authenticated;

/* Klienti nuk u gjend. Porosia kthehet te banaku me arsyen, në vend që të
   mbetet e varur në rrugë. */
create or replace function public.drv_failed(p_token uuid, p_order uuid, p_reason text)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare s record; rid uuid;
begin
  select st.staff_id into s from public.staff_by_token(p_token) st;
  if not public.has_screen(p_token, 'runs') then
    raise exception 'Ky kod nuk e hap ekranin e motorristit.';
  end if;

  update public.orders
     set status = 'ready', run_id = null, picked_at = null,
         fail_reason = left(coalesce(p_reason, 'Nuk u gjend'), 200)
   where id = p_order and driver_id = s.staff_id and status = 'delivering'
  returning run_id into rid;

  if not found then raise exception 'Kjo porosi nuk është në nisjen tënde.'; end if;
  return 'ready';
end;
$$;

revoke all on function public.drv_failed(uuid, uuid, text) from public;
grant execute on function public.drv_failed(uuid, uuid, text) to anon, authenticated;

/* Fleta e ditës së vetë motorristit — sa dorëzime dhe sa para në xhep. */
create or replace function public.drv_my_day(p_token uuid, p_date date default current_date)
returns table (deliveries bigint, cash numeric, card numeric, avg_minutes numeric)
language plpgsql
security definer
stable
set search_path = public
as $$
declare s record;
begin
  select st.staff_id into s from public.staff_by_token(p_token) st;
  if not public.has_screen(p_token, 'runs') then
    raise exception 'Ky kod nuk e hap ekranin e motorristit.';
  end if;

  return query
    select count(*),
           coalesce(sum(o.total) filter (where o.payment = 'cash'), 0),
           coalesce(sum(o.total) filter (where o.payment = 'card'), 0),
           round(avg(extract(epoch from (o.delivered_at - o.picked_at)) / 60.0)::numeric, 1)
      from public.orders o
     where o.driver_id = s.staff_id
       and o.delivered_at is not null
       and o.delivered_at::date = p_date;
end;
$$;

revoke all on function public.drv_my_day(uuid, date) from public;
grant execute on function public.drv_my_day(uuid, date) to anon, authenticated;


-- ============================================================================
-- Gati. Hapat e ardhshëm te paneli:
--   Cilësimet → Fazat      — riemërto hapat me fjalët e kuzhinës sate
--   Cilësimet → Stafi      — shto motorristët dhe kodet e tyre
--   Magazina  → Artikujt   — shto lëndën e parë, pastaj recetat
-- ============================================================================


-- ═══════════════════════ 22. MAGAZINA NË PUNË ═══════════════════════
-- Tabelat e magazinës ekzistonin që herët; këtu vijnë veprimet që i vënë në
-- punë. Rregulli i vetëm që mban gjithçka të ndershme: gjendja nuk shkruhet
-- kurrë drejtpërdrejt, llogaritet nga lëvizjet. Kështu çdo copë ka një pse.

/* Një lëvizje e vetme: hyrje, dalje, prishje, ose numërim.
   Numërimi është i veçantë — aty nuk jepet ndryshimi, jepet gjendja e vërtetë
   që u gjet në raft, dhe funksioni e llogarit vetë diferencën. */
create or replace function public.stock_adjust(
  p_item uuid, p_qty numeric, p_kind text, p_note text default null)
returns numeric
language plpgsql
security definer
set search_path = public
as $$
declare cur numeric; delta numeric;
begin
  if p_kind not in ('in','out','waste','count','return') then
    raise exception 'Lloj lëvizjeje i panjohur: %', p_kind;
  end if;
  if not exists (select 1 from public.stock_items where id = p_item) then
    raise exception 'Artikulli nuk u gjet.';
  end if;

  select coalesce(sum(qty), 0) into cur from public.stock_moves where item_id = p_item;

  if p_kind = 'count' then
    delta := p_qty - cur;                       -- sa mungon ose sa tepron
    if delta = 0 then return cur; end if;
  elsif p_kind in ('out','waste') then
    delta := -1 * abs(p_qty);                   -- dalja është gjithmonë minus
  else
    delta := abs(p_qty);
  end if;

  insert into public.stock_moves (item_id, qty, kind, note)
  values (p_item, delta, p_kind,
          case when p_kind = 'count'
               then coalesce(p_note, '') || ' (numërim: ' || p_qty || ')'
               else p_note end);

  return cur + delta;
end;
$$;

revoke all on function public.stock_adjust(uuid, numeric, text, text) from public, anon;
grant execute on function public.stock_adjust(uuid, numeric, text, text) to authenticated;

/* Pranimi i një blerjeje. Deri sa blerja është `draft` nuk prek gjë; kur
   pranohet, çdo rresht bëhet hyrje magazine dhe kostoja e artikullit merr
   çmimin e fundit të blerë — që vlera e magazinës të mos mbetet e vitit
   të kaluar. Thirrja e dytë nuk bën asgjë: fatura nuk hyn dy herë. */
create or replace function public.receive_purchase(p_id uuid)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare n integer := 0; st text;
begin
  select status into st from public.purchases where id = p_id;
  if st is null then raise exception 'Blerja nuk u gjet.'; end if;
  if st = 'received' then return 0; end if;
  if st = 'cancelled' then raise exception 'Blerja është anuluar.'; end if;

  insert into public.stock_moves (item_id, qty, kind, unit_cost, ref_type, ref_id, note)
  select l.item_id, l.qty, 'in', l.unit_cost, 'purchase', p_id, 'Hyrje nga blerja'
    from public.purchase_lines l
   where l.purchase_id = p_id;
  get diagnostics n = row_count;

  update public.stock_items i
     set cost = l.unit_cost, updated_at = now()
    from public.purchase_lines l
   where l.purchase_id = p_id and l.item_id = i.id and l.unit_cost > 0;

  update public.purchases
     set status = 'received', updated_at = now(),
         subtotal = coalesce((select sum(total) from public.purchase_lines where purchase_id = p_id), 0),
         total    = coalesce((select sum(total) from public.purchase_lines where purchase_id = p_id), 0)
   where id = p_id;

  return n;
end;
$$;

revoke all on function public.receive_purchase(uuid) from public, anon;
grant execute on function public.receive_purchase(uuid) to authenticated;


-- ═══════════════════════ 23. RAPORTET ═══════════════════════
-- Numrat që i duhen pronarit në mbyllje të ditës, të nxjerrë nga e njëjta
-- tabelë që përdor kuzhina — pa regjistër të dytë që del jashtë sinkroni.
-- Porositë e anuluara nuk numërohen askund si xhiro.

create or replace function public.report_day(p_date date default current_date)
returns table (
  orders_count bigint, revenue numeric, cash numeric, card numeric,
  delivery_count bigint, pickup_count bigint,
  web_count bigint, phone_count bigint,
  cancelled_count bigint, avg_prep_minutes numeric, avg_delivery_minutes numeric,
  guests_avg numeric
)
language sql
security definer
stable
set search_path = public
as $$
  select count(*) filter (where o.status <> 'cancelled'),
         coalesce(sum(o.total) filter (where o.status <> 'cancelled'), 0),
         coalesce(sum(o.total) filter (where o.status <> 'cancelled' and o.payment = 'cash'), 0),
         coalesce(sum(o.total) filter (where o.status <> 'cancelled' and o.payment <> 'cash'), 0),
         count(*) filter (where o.status <> 'cancelled' and o.kind = 'delivery'),
         count(*) filter (where o.status <> 'cancelled' and o.kind = 'pickup'),
         count(*) filter (where o.status <> 'cancelled' and o.channel = 'web'),
         count(*) filter (where o.status <> 'cancelled' and o.channel = 'phone'),
         count(*) filter (where o.status = 'cancelled'),
         round(avg(extract(epoch from (o.ready_at - o.created_at)) / 60.0)
               filter (where o.ready_at is not null)::numeric, 1),
         round(avg(extract(epoch from (o.delivered_at - o.picked_at)) / 60.0)
               filter (where o.delivered_at is not null)::numeric, 1),
         round(avg(o.total) filter (where o.status <> 'cancelled')::numeric, 0)
    from public.orders o
   where o.created_at::date = p_date;
$$;

revoke all on function public.report_day(date) from public, anon;
grant execute on function public.report_day(date) to authenticated;

/* Xhiroja ditë për ditë, për të parë javën me një sy. */
create or replace function public.report_range(p_from date, p_to date)
returns table (day date, orders_count bigint, revenue numeric)
language sql
security definer
stable
set search_path = public
as $$
  select o.created_at::date, count(*), coalesce(sum(o.total), 0)
    from public.orders o
   where o.created_at::date between p_from and p_to
     and o.status <> 'cancelled'
   group by 1
   order by 1;
$$;

revoke all on function public.report_range(date, date) from public, anon;
grant execute on function public.report_range(date, date) to authenticated;

/* Çfarë shitet vërtet. Rreshtat e porosive hapen një nga një. */
create or replace function public.report_items(p_from date, p_to date)
returns table (item_id text, name text, qty numeric, revenue numeric, station text)
language sql
security definer
stable
set search_path = public
as $$
  select line->>'id',
         max(line->>'name'),
         sum((line->>'qty')::numeric),
         sum((line->>'qty')::numeric * coalesce((line->>'price')::numeric, 0)),
         public.item_station(line->>'id', coalesce(line->>'c', line->>'category'))
    from public.orders o
    cross join lateral jsonb_array_elements(o.items) as line
   where o.created_at::date between p_from and p_to
     and o.status <> 'cancelled'
   group by 1, 5
   order by 3 desc;
$$;

revoke all on function public.report_items(date, date) from public, anon;
grant execute on function public.report_items(date, date) to authenticated;


-- ═══════════════════════ 24. NJOFTIMET PUSH ═══════════════════════
-- Abonimi i një pajisjeje. Kuzhina dhe furra e mbajnë ekranin hapur gjithë
-- ditën, por motorristi jo — telefoni i rri në xhep, ndaj njoftimi është e
-- vetmja mënyrë që ta marrë vesh një porosi të re pa e kontrolluar vetë.
--
-- KUFIRI: shfletuesi e ndez këtë vetëm mbi HTTPS ose te localhost. Në një
-- rrjet lokal me http://192.168.x.x nuk ndizet dot — rregull i shfletuesit,
-- jo i programit. Prandaj ekrani ka gjithmonë edhe zilen brenda faqes.

create table if not exists public.push_subs (
  id         uuid primary key default gen_random_uuid(),
  staff_id   uuid        not null references public.staff(id) on delete cascade,
  endpoint   text        not null unique,
  p256dh     text        not null,
  auth       text        not null,
  device     text,
  created_at timestamptz not null default now(),
  last_ok_at timestamptz,
  fails      integer     not null default 0
);

comment on table public.push_subs is
  'Pajisjet që presin njoftime. Çelësat janë të pajisjes, jo të personit.';

create index if not exists push_subs_staff_idx on public.push_subs (staff_id);

alter table public.push_subs enable row level security;
drop policy if exists "abonimet vetem nga serveri" on public.push_subs;
create policy "abonimet vetem nga serveri" on public.push_subs
  for all to authenticated using (true) with check (true);

/* Pajisja abonohet vetë, me kodin e saj. Nëse i njëjti endpoint ekziston,
   thjesht kalon te personi i tanishëm — një tablet i ndarë mes dy turneve
   nuk duhet të krijojë dy abonime. */
create or replace function public.push_subscribe(
  p_token uuid, p_endpoint text, p_p256dh text, p_auth text, p_device text default null)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare s record; id uuid;
begin
  select st.staff_id into s from public.staff_by_token(p_token) st;
  if s.staff_id is null then raise exception 'Hyr me kodin tënd.'; end if;

  insert into public.push_subs (staff_id, endpoint, p256dh, auth, device)
  values (s.staff_id, p_endpoint, p_p256dh, p_auth, p_device)
  on conflict (endpoint) do update
    set staff_id = excluded.staff_id,
        p256dh   = excluded.p256dh,
        auth     = excluded.auth,
        device   = excluded.device,
        fails    = 0
  returning public.push_subs.id into id;

  return id;
end;
$$;

revoke all on function public.push_subscribe(uuid, text, text, text, text) from public;
grant execute on function public.push_subscribe(uuid, text, text, text, text) to anon, authenticated;

create or replace function public.push_unsubscribe(p_token uuid, p_endpoint text)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare n integer;
begin
  perform 1 from public.staff_by_token(p_token);
  delete from public.push_subs where endpoint = p_endpoint;
  get diagnostics n = row_count;
  return n;
end;
$$;

revoke all on function public.push_unsubscribe(uuid, text) from public;
grant execute on function public.push_unsubscribe(uuid, text) to anon, authenticated;


-- ═══════════════════════ 25. ZONAT E DËRGESËS ═══════════════════════
-- Durrësi është 8 × 11 km. Në një qytet kaq të vogël, radha matematikore e
-- ndalesave ndryshon pak minuta; ajo që ndryshon shumë është të mos shkosh
-- Plazh, të kthehesh Shkozet, dhe të ngjitesh sërish Plazh.
--
-- Prandaj zona vjen para koordinatës. Zona caktohet në dy mënyra, sipas asaj
-- që dihet për porosinë:
--   1. fjalët e adresës  — punon që në porosinë e parë, pa asnjë koordinatë
--   2. pika brenda kufirit — kur klienti ka ndarë vendndodhjen ose adresa
--      është mësuar nga një dorëzim i mëparshëm
--
-- Kufijtë i vizaton pronari mbi hartë. Kufiri administrativ i Durrësit NUK
-- përdoret për këtë: zona ku dorëzohet është vendim biznesi, jo ndarje
-- administrative — dhe u vërtetua se ato dy nuk përputhen.

create table if not exists public.zones (
  id         uuid primary key default gen_random_uuid(),
  name       text        not null,
  sort       integer     not null default 0,
  color      text        not null default '#DE7F1C',
  keywords   text[]      not null default '{}',
  outline    jsonb,                              -- [[lat,lng], …] ose null
  lat        double precision,
  lng        double precision,
  fee        numeric(10,2) not null default 0,   -- për më vonë; sot dërgesa falas
  active     boolean     not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint zones_name_ok check (char_length(name) between 2 and 60)
);

comment on table public.zones is
  'Zonat e dërgesës në Durrës. Kufijtë i vizaton pronari; fjalët kyçe e caktojnë zonën edhe pa koordinata.';

create index if not exists zones_sort_idx on public.zones (sort) where active;

alter table public.zones enable row level security;
drop policy if exists "zonat lexohen nga te gjithe" on public.zones;
create policy "zonat lexohen nga te gjithe"
  on public.zones for select to anon, authenticated using (true);
drop policy if exists "zonat shkruhen vetem nga admini" on public.zones;
create policy "zonat shkruhen vetem nga admini"
  on public.zones for all to authenticated using (true) with check (true);

alter table public.orders add column if not exists zone text;

-- Adresa e mësuar: kur motorristi shtyp «U dorëzua», telefoni i tij është te
-- dera. Ajo pikë vlen më shumë se çdo kërkim adresash — dhe nuk kushton asgjë.
alter table public.customer_addresses add column if not exists confirmed_at timestamptz;
alter table public.customer_addresses add column if not exists confirmed_by uuid
  references public.staff(id) on delete set null;

/* A bie pika brenda kufirit? Ray casting — i njëjti algoritëm si te shfletuesi,
   që përgjigjja të mos ndryshojë sipas vendit ku llogaritet. */
create or replace function public.point_in_outline(
  p_lat double precision, p_lng double precision, p_outline jsonb)
returns boolean
language plpgsql
immutable
as $$
declare n int; i int; j int; inside boolean := false;
        xi double precision; yi double precision;
        xj double precision; yj double precision;
begin
  if p_outline is null or p_lat is null or p_lng is null then return false; end if;
  n := jsonb_array_length(p_outline);
  if n < 3 then return false; end if;

  j := n - 1;
  for i in 0 .. n - 1 loop
    yi := (p_outline -> i ->> 0)::double precision;   -- lat
    xi := (p_outline -> i ->> 1)::double precision;   -- lng
    yj := (p_outline -> j ->> 0)::double precision;
    xj := (p_outline -> j ->> 1)::double precision;
    if ((yi > p_lat) <> (yj > p_lat))
       and (p_lng < (xj - xi) * (p_lat - yi) / (yj - yi) + xi) then
      inside := not inside;
    end if;
    j := i;
  end loop;
  return inside;
end;
$$;

/* Cila zonë i takon kësaj porosie. Pika mbizotëron mbi fjalët: një adresë e
   shkruar «Plazh» por me pin te Currila është te Currila. */
create or replace function public.zone_for(
  p_address text, p_lat double precision default null, p_lng double precision default null)
returns text
language plpgsql
stable
set search_path = public
as $$
declare z record; a text;
begin
  if p_lat is not null and p_lng is not null then
    for z in select * from public.zones
              where active and outline is not null order by sort loop
      if public.point_in_outline(p_lat, p_lng, z.outline) then return z.name; end if;
    end loop;
  end if;

  a := lower(coalesce(p_address, ''));
  if a <> '' then
    for z in select * from public.zones where active order by sort loop
      if exists (select 1 from unnest(z.keywords) k
                  where k <> '' and position(lower(k) in a) > 0) then
        return z.name;
      end if;
    end loop;
  end if;

  return null;
end;
$$;

revoke all on function public.zone_for(text, double precision, double precision) from public;
grant execute on function public.zone_for(text, double precision, double precision)
  to anon, authenticated;

/* Porosia e re e merr zonën vetvetiu — banaku nuk ka pse ta zgjedhë me dorë
   sa herë, dhe nuk ka pse ta harrojë. */
create or replace function public.set_order_zone()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.zone is null then
    new.zone := public.zone_for(new.address, new.lat, new.lng);
  end if;
  return new;
end;
$$;

drop trigger if exists orders_zone on public.orders;
create trigger orders_zone
  before insert on public.orders
  for each row execute function public.set_order_zone();
