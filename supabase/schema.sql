-- ============================================================================
-- SPRINT — Fast Food & Pizza, Durrës
-- Skema e bazës së të dhënave për panelin admin.
--
-- SI PËRDORET
--   1. Hyr në supabase.com → New project (plani falas).
--   2. Menuja e majtë → SQL Editor → New query.
--   3. Ngjit KREJT këtë skedar dhe shtyp «Run».
--   4. Authentication → Users → «Add user» → vendos email-in dhe fjalëkalimin
--      me të cilin do të hysh në panel. (Regjistrimi publik mbetet i mbyllur.)
--   5. Project Settings → Data API → kopjo «Project URL» dhe çelësin «anon»
--      te shared/config.js.
--
-- SIGURIA
--   Kushdo mund të LEXOJË menunë — kjo është e nevojshme që faqja të punojë.
--   Vetëm përdoruesit e identifikuar mund të SHKRUAJNË ose të fshijnë.
-- ============================================================================

-- ─────────────────────────── TABELAT ───────────────────────────

create table if not exists public.menu_items (
  id          text primary key,
  sort        integer     not null default 0,
  category    text        not null,
  art         text        not null default 'pizza',
  name_sq     text        not null,
  name_en     text,
  desc_sq     text        not null default '',
  desc_en     text        not null default '',
  price       numeric(10,2) not null default 0,
  unit        text,
  note        text,
  tags        text[]      not null default '{}',
  image_url   text,
  available   boolean     not null default true,
  updated_at  timestamptz not null default now()
);

comment on table public.menu_items is 'Pjatët e menusë — çmimet, fotot dhe disponueshmëria.';

create index if not exists menu_items_category_idx on public.menu_items (category);
create index if not exists menu_items_sort_idx     on public.menu_items (sort);

-- Cilësimet e faqes (kontaktet, orari, kategoritë, review-t) në një rresht të vetëm.
create table if not exists public.settings (
  id          text primary key default 'main',
  data        jsonb       not null default '{}'::jsonb,
  updated_at  timestamptz not null default now()
);

comment on table public.settings is 'Cilësimet e faqes: kontaktet, orari, kategoritë, review-t.';

insert into public.settings (id, data)
values ('main', '{}'::jsonb)
on conflict (id) do nothing;

-- ────────────────── PËRDITËSIMI AUTOMATIK I updated_at ──────────────────

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists menu_items_touch on public.menu_items;
create trigger menu_items_touch
  before update on public.menu_items
  for each row execute function public.touch_updated_at();

drop trigger if exists settings_touch on public.settings;
create trigger settings_touch
  before update on public.settings
  for each row execute function public.touch_updated_at();

-- ─────────────────────── SIGURIA E RRESHTAVE ───────────────────────

alter table public.menu_items enable row level security;
alter table public.settings   enable row level security;

-- Leximi: i hapur për këdo (faqja publike).
drop policy if exists "menu lexohet nga te gjithe" on public.menu_items;
create policy "menu lexohet nga te gjithe"
  on public.menu_items for select
  to anon, authenticated
  using (true);

drop policy if exists "cilesimet lexohen nga te gjithe" on public.settings;
create policy "cilesimet lexohen nga te gjithe"
  on public.settings for select
  to anon, authenticated
  using (true);

-- Shkrimi: vetëm përdoruesit e identifikuar (paneli admin).
drop policy if exists "menu shkruhet vetem nga admini" on public.menu_items;
create policy "menu shkruhet vetem nga admini"
  on public.menu_items for all
  to authenticated
  using (true) with check (true);

drop policy if exists "cilesimet shkruhen vetem nga admini" on public.settings;
create policy "cilesimet shkruhen vetem nga admini"
  on public.settings for all
  to authenticated
  using (true) with check (true);

-- ─────────────────────── HAPËSIRA E FOTOVE ───────────────────────

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('photos', 'photos', true, 5242880,
        array['image/jpeg','image/png','image/webp','image/avif'])
on conflict (id) do update
  set public = true,
      file_size_limit = 5242880,
      allowed_mime_types = array['image/jpeg','image/png','image/webp','image/avif'];

drop policy if exists "fotot shihen nga te gjithe" on storage.objects;
create policy "fotot shihen nga te gjithe"
  on storage.objects for select
  to anon, authenticated
  using (bucket_id = 'photos');

drop policy if exists "fotot ngarkohen nga admini" on storage.objects;
create policy "fotot ngarkohen nga admini"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'photos');

drop policy if exists "fotot zevendesohen nga admini" on storage.objects;
create policy "fotot zevendesohen nga admini"
  on storage.objects for update
  to authenticated
  using (bucket_id = 'photos') with check (bucket_id = 'photos');

drop policy if exists "fotot fshihen nga admini" on storage.objects;
create policy "fotot fshihen nga admini"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'photos');


-- ============================================================================
--  POROSITË DHE REZERVIMET
--  Porosia shkruhet në bazë PARA se të hapet WhatsApp-i, që të mos humbasë
--  asnjë edhe nëse klienti nuk e dërgon mesazhin.
-- ============================================================================

create table if not exists public.orders (
  id            uuid primary key default gen_random_uuid(),
  number        integer generated by default as identity (start with 1000),
  token         text        not null default encode(gen_random_bytes(9), 'hex'),
  status        text        not null default 'new',
  kind          text        not null default 'delivery',   -- delivery | pickup
  customer_name text        not null,
  phone         text        not null,
  address       text,
  note          text,
  items         jsonb       not null default '[]'::jsonb,
  subtotal      numeric(10,2) not null default 0,
  delivery_fee  numeric(10,2) not null default 0,
  total         numeric(10,2) not null default 0,
  payment       text        not null default 'cash',       -- cash | card
  wanted_at     text,                                       -- 'asap' ose 'HH:MM'
  prep_minutes  integer,
  accepted_at   timestamptz,
  ready_at      timestamptz,
  done_at       timestamptz,
  cancel_reason text,
  lang          text        not null default 'sq',
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),

  constraint orders_status_ok check (status in
    ('new','accepted','preparing','ready','delivering','done','cancelled')),
  constraint orders_kind_ok    check (kind in ('delivery','pickup')),
  constraint orders_payment_ok check (payment in ('cash','card')),
  constraint orders_name_ok    check (char_length(customer_name) between 2 and 80),
  constraint orders_phone_ok   check (char_length(phone) between 5 and 30),
  constraint orders_note_ok    check (note is null or char_length(note) <= 500),
  constraint orders_addr_ok    check (address is null or char_length(address) <= 300),
  constraint orders_total_ok   check (total >= 0 and total <= 500000),
  constraint orders_items_ok   check (jsonb_typeof(items) = 'array'
                                      and jsonb_array_length(items) between 1 and 60)
);

comment on table public.orders is 'Porositë e klientëve, nga «E re» te «Përfunduar».';

create index if not exists orders_created_idx on public.orders (created_at desc);
create index if not exists orders_status_idx  on public.orders (status);
create unique index if not exists orders_token_idx on public.orders (token);

create table if not exists public.bookings (
  id            uuid primary key default gen_random_uuid(),
  number        integer generated by default as identity (start with 100),
  status        text        not null default 'new',
  customer_name text        not null,
  phone         text        not null,
  date          date        not null,
  time          text,
  people        text,
  area          text,
  note          text,
  lang          text        not null default 'sq',
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),

  constraint bookings_status_ok check (status in ('new','confirmed','seated','done','cancelled')),
  constraint bookings_name_ok   check (char_length(customer_name) between 2 and 80),
  constraint bookings_phone_ok  check (char_length(phone) between 5 and 30),
  constraint bookings_note_ok   check (note is null or char_length(note) <= 500)
);

comment on table public.bookings is 'Rezervimet e tavolinave.';

create index if not exists bookings_date_idx on public.bookings (date desc);

drop trigger if exists orders_touch on public.orders;
create trigger orders_touch
  before update on public.orders
  for each row execute function public.touch_updated_at();

drop trigger if exists bookings_touch on public.bookings;
create trigger bookings_touch
  before update on public.bookings
  for each row execute function public.touch_updated_at();

-- ── siguria ────────────────────────────────────────────────────────────────
alter table public.orders   enable row level security;
alter table public.bookings enable row level security;

-- Klienti mund të KRIJOJË një porosi, por jo ta lexojë atë të tjetrit.
drop policy if exists "porosia krijohet nga klienti" on public.orders;
create policy "porosia krijohet nga klienti"
  on public.orders for insert
  to anon, authenticated
  with check (status = 'new' and accepted_at is null and done_at is null);

drop policy if exists "porosite i sheh vetem admini" on public.orders;
create policy "porosite i sheh vetem admini"
  on public.orders for select to authenticated using (true);

drop policy if exists "porosite i ndryshon vetem admini" on public.orders;
create policy "porosite i ndryshon vetem admini"
  on public.orders for update to authenticated using (true) with check (true);

drop policy if exists "porosite i fshin vetem admini" on public.orders;
create policy "porosite i fshin vetem admini"
  on public.orders for delete to authenticated using (true);

drop policy if exists "rezervimi krijohet nga klienti" on public.bookings;
create policy "rezervimi krijohet nga klienti"
  on public.bookings for insert
  to anon, authenticated
  with check (status = 'new');

drop policy if exists "rezervimet i sheh vetem admini" on public.bookings;
create policy "rezervimet i sheh vetem admini"
  on public.bookings for select to authenticated using (true);

drop policy if exists "rezervimet i ndryshon vetem admini" on public.bookings;
create policy "rezervimet i ndryshon vetem admini"
  on public.bookings for all to authenticated using (true) with check (true);

-- ── ndjekja e porosisë nga klienti ─────────────────────────────────────────
-- Kthen VETËM fushat jo-personale, dhe vetëm për një kod të saktë.
create or replace function public.track_order(p_token text)
returns table (
  number int, status text, kind text, total numeric,
  created_at timestamptz, accepted_at timestamptz, prep_minutes int, items jsonb
)
language sql
security definer
stable
set search_path = public
as $$
  select o.number, o.status, o.kind, o.total,
         o.created_at, o.accepted_at, o.prep_minutes, o.items
  from public.orders o
  where o.token = p_token
  limit 1;
$$;

revoke all on function public.track_order(text) from public;
grant execute on function public.track_order(text) to anon, authenticated;

-- ============================================================================
-- Gati. Hapi tjetër: hap panelin te /admin, hyr me email-in që krijove dhe
-- shtyp «Dërgo menunë në Supabase» për ta mbushur tabelën me 122 pjatët.
-- ============================================================================
