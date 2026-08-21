\set ON_ERROR_STOP on
\pset pager off

\echo '=== 1. FAZAT ==='
select key, sort, label_sq, customer_label_sq, enabled, is_core from public.order_phases order by sort;
select count(*) as faza_publike from public.public_phases();

\echo ''
\echo '=== 2. STAFI DHE HYRJA ME KOD ==='
insert into public.staff (name, role) values ('Banaku Test','cashier') on conflict do nothing;
insert into public.staff (name, role) values ('Kuzhina Test','kitchen') on conflict do nothing;
insert into public.staff (name, role) values ('Motorrist A','driver')   on conflict do nothing;
insert into public.staff (name, role) values ('Motorrist B','driver')   on conflict do nothing;

select public.set_staff_pin((select id from public.staff where name='Motorrist A'), '4821');
select public.set_staff_pin((select id from public.staff where name='Kuzhina Test'), '1199');

\echo '-- hyrje e saktë:'
select name, role from public.staff_login('4821','tablet-1');

\echo '-- kodi ruhet i hash-uar (nuk duhet të duket 4821):'
select name, left(pin_hash, 7) as fillimi_i_hash from public.staff where name='Motorrist A';

\echo '-- tokeni punon:'
select s.name, s.role from public.staff_by_token(
  (select token from public.staff_sessions order by created_at desc limit 1)) s;

\echo '-- kod i gabuar duhet të dështojë:'
do $$ begin
  perform public.staff_login('0000','x');
  raise exception 'DËSHTIM: kodi i gabuar u pranua';
exception when others then
  if sqlerrm = 'DËSHTIM: kodi i gabuar u pranua' then raise; end if;
  raise notice 'OK — u refuzua: %', sqlerrm;
end $$;

\echo '-- token i pavlefshëm duhet të dështojë:'
do $$ begin
  perform public.staff_by_token(gen_random_uuid());
  raise exception 'DËSHTIM: tokeni i rremë u pranua';
exception when others then
  if sqlerrm = 'DËSHTIM: tokeni i rremë u pranua' then raise; end if;
  raise notice 'OK — u refuzua: %', sqlerrm;
end $$;

\echo '-- dy veta nuk mund të kenë të njëjtin kod:'
do $$ begin
  perform public.set_staff_pin((select id from public.staff where name='Kuzhina Test'), '4821');
  raise exception 'DËSHTIM: kodi i dyfishtë u pranua';
exception when others then
  if sqlerrm = 'DËSHTIM: kodi i dyfishtë u pranua' then raise; end if;
  raise notice 'OK — u refuzua: %', sqlerrm;
end $$;

\echo ''
\echo '=== 3. LIBRI I ADRESAVE ==='
select public.upsert_customer('069 123 4567','Ermal Benja','Rruga Taulantia 12', 41.3231, 19.4414, 12) as customer_id \gset
\echo '-- e njëjta adresë nuk duhet të krijojë dublikatë:'
select public.upsert_customer('069 123 4567','Ermal Benja','rruga taulantia 12', 41.3232, 19.4415, 8);
select count(*) as adresa_te_ruajtura from public.customer_addresses where customer_id = :'customer_id';

\echo '-- adresë e dytë:'
select public.upsert_customer('069 123 4567','Ermal Benja','Plazh, pallati 4', 41.3100, 19.4500, 20);
select count(*) as adresa_tani from public.customer_addresses where customer_id = :'customer_id';

\echo '-- kërkimi me telefon të formatuar ndryshe duhet ta gjejë:'
select jsonb_pretty(public.lookup_customer('0691234567')) as gjetja;

\echo ''
\echo '=== 4. POROSI + MAGAZINË + RECETA ==='
insert into public.menu_items (id, category, name_sq, price)
values ('test-pica','pizza','Pica Test', 700) on conflict (id) do nothing;

insert into public.stock_items (sku, name, unit, cost) values
  ('MIELL','Miell','kg', 60), ('DJATHE','Djathë','kg', 900)
on conflict (sku) do nothing;

insert into public.recipes (menu_item_id, stock_item_id, qty)
select 'test-pica', id, case when sku='MIELL' then 0.25 else 0.15 end
  from public.stock_items where sku in ('MIELL','DJATHE')
on conflict do nothing;

\echo '-- hyrje malli: 10 kg miell, 5 kg djathë'
insert into public.stock_moves (item_id, qty, kind, unit_cost)
select id, case when sku='MIELL' then 10 else 5 end, 'in', cost
  from public.stock_items where sku in ('MIELL','DJATHE');

select name, qty, unit, low from public.stock_levels where sku in ('MIELL','DJATHE') order by name;

\echo '-- porosi me 2 pica:'
insert into public.orders (customer_name, phone, items, total, status, customer_id, channel)
values ('Ermal Benja','069 123 4567',
        '[{"id":"test-pica","name":"Pica Test","qty":2,"price":700}]'::jsonb,
        1400, 'new', :'customer_id', 'phone')
returning id as order_id \gset

select public.consume_stock_for_order(:'order_id') as rreshta_te_zbritur;

\echo '-- gjendja pas zbritjes (miell 10-0.5=9.5, djathë 5-0.3=4.7):'
select name, qty from public.stock_levels where sku in ('MIELL','DJATHE') order by name;

\echo '-- zbritja e dytë nuk duhet të ndodhë:'
select public.consume_stock_for_order(:'order_id') as duhet_zero;
select name, qty from public.stock_levels where sku in ('MIELL','DJATHE') order by name;

\echo ''
\echo '=== 5. STATISTIKAT E KLIENTIT ==='
update public.orders set status='done' where id = :'order_id';
select name, orders_count, orders_total from public.customers where id = :'customer_id';

\echo ''
\echo '=== 6. NISJA DHE FLETA E DITËS ==='
insert into public.runs (driver_id) select id from public.staff where name='Motorrist A'
returning id as run_id \gset

update public.orders
   set driver_id = (select id from public.staff where name='Motorrist A'),
       run_id = :'run_id', payment='cash',
       ready_at = now() - interval '30 min',
       picked_at = now() - interval '26 min',
       delivered_at = now() - interval '5 min'
 where id = :'order_id';

insert into public.run_points (run_id, order_id, kind, lat, lng, accuracy)
values (:'run_id', :'order_id', 'start', 41.3231, 19.4414, 10),
       (:'run_id', :'order_id', 'delivered', 41.3100, 19.4500, 14);

select driver_name, deliveries, cash, avg_minutes, avg_wait_minutes
  from public.driver_day(current_date);

\echo '-- gjurma e ndalesave:'
select kind, lat, lng from public.run_points where run_id = :'run_id' order by at;

\echo ''
\echo '=== 7. BLERJE NGA FURNITORI ==='
insert into public.suppliers (name, nipt) values ('Furnitori Test','L12345678A')
on conflict do nothing;
insert into public.purchases (supplier_id, total, status)
select id, 6000, 'received' from public.suppliers where name='Furnitori Test'
returning number as purchase_no \gset
\echo '-- numri i blerjes u dha vetvetiu:'
select :'purchase_no' as numri_i_blerjes;

\echo ''
\echo '=== 8. DOKUMENT I BRENDSHËM ==='
insert into public.documents (kind, ref_type, ref_id, title, total)
values ('delivery_note','order', :'order_id', 'Fletë dorëzimi', 1400)
returning number, kind, title;

\echo ''
\echo '=== TË GJITHA KALUAN ==='
