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
-- Gati. Hapi tjetër: hap panelin te /admin, hyr me email-in që krijove dhe
-- shtyp «Dërgo menunë në Supabase» për ta mbushur tabelën me 122 pjatët.
-- ============================================================================
