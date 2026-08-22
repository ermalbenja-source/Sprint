/* ============================================================================
   SPRINT — Baza lokale (SQLite).
   E njëjta strukturë si te Supabase, e përkthyer për SQLite. Skedari i bazës
   rri pranë programit, ndaj kopja rezervë është thjesht kopjimi i një skedari.

   Pa asnjë varësi: node:sqlite vjen brenda Node-it 22.
   ========================================================================== */
'use strict';
const { DatabaseSync } = require('node:sqlite');
const crypto = require('node:crypto');
const path = require('node:path');
const fs = require('node:fs');

const uuid = () => crypto.randomUUID();
const now = () => new Date().toISOString();

/* Kodet dhe fjalëkalimet ruhen të hash-uara me scrypt — kurrë të hapura. */
function hash(secret) {
  const salt = crypto.randomBytes(16).toString('hex');
  const key = crypto.scryptSync(String(secret), salt, 32).toString('hex');
  return 'scrypt$' + salt + '$' + key;
}
function verify(secret, stored) {
  if (!stored || !stored.startsWith('scrypt$')) return false;
  const [, salt, key] = stored.split('$');
  const test = crypto.scryptSync(String(secret), salt, 32).toString('hex');
  try {
    return crypto.timingSafeEqual(Buffer.from(key, 'hex'), Buffer.from(test, 'hex'));
  } catch (e) { return false; }
}

const CODE_ABC = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const genCode = () => Array.from({ length: 8 },
  () => CODE_ABC[crypto.randomInt(CODE_ABC.length)]).join('');

const SCHEMA = `
pragma journal_mode = WAL;
pragma foreign_keys = on;

create table if not exists menu_items (
  id text primary key, sort integer not null default 0, category text not null,
  art text not null default 'pizza', name_sq text not null, name_en text,
  desc_sq text not null default '', desc_en text not null default '',
  price real not null default 0, unit text, note text,
  tags text not null default '[]', image_url text, station text,
  available integer not null default 1, updated_at text not null);

create table if not exists category_stations (
  category text primary key, station text not null default 'kitchen');

create table if not exists settings (
  id text primary key, data text not null default '{}', updated_at text not null);

create table if not exists order_phases (
  key text primary key, sort integer not null default 0,
  label_sq text not null, label_en text not null default '',
  customer_label_sq text, customer_label_en text,
  icon text not null default '', color text not null default '',
  enabled integer not null default 1, customer_visible integer not null default 1,
  target_minutes integer, is_core integer not null default 0, updated_at text not null);

create table if not exists customers (
  id text primary key, phone text not null unique, name text not null default '',
  note text, blocked integer not null default 0, block_reason text,
  orders_count integer not null default 0, orders_total real not null default 0,
  last_order_at text, created_at text not null, updated_at text not null);

create table if not exists customer_addresses (
  id text primary key, customer_id text not null references customers(id) on delete cascade,
  label text not null default '', address text not null,
  lat real, lng real, accuracy integer,
  is_default integer not null default 0, created_at text not null);

create table if not exists staff (
  id text primary key, name text not null, role text not null,
  pin_hash text, active integer not null default 1, phone text,
  failed_tries integer not null default 0, locked_until text,
  created_at text not null, updated_at text not null);

create table if not exists staff_sessions (
  token text primary key, staff_id text not null references staff(id) on delete cascade,
  device text, created_at text not null, expires_at text not null, last_seen text not null);

create table if not exists role_screens (role text not null, screen text not null,
  primary key (role, screen));

create table if not exists runs (
  id text primary key, driver_id text not null references staff(id),
  started_at text not null, closed_at text, cash_due real not null default 0,
  cash_handed real, handed_at text, note text, created_at text not null);

create table if not exists run_points (
  id text primary key, run_id text not null references runs(id) on delete cascade,
  order_id text, kind text not null default 'stop',
  lat real, lng real, accuracy integer, at text not null);

create table if not exists orders (
  id text primary key, number integer, token text unique, status text not null default 'new',
  kind text not null default 'delivery', customer_name text not null, phone text not null,
  address text, note text, items text not null default '[]',
  subtotal real not null default 0, delivery_fee real not null default 0,
  total real not null default 0, payment text not null default 'cash',
  wanted_at text, prep_minutes integer,
  accepted_at text, kitchen_at text, ready_at text, picked_at text,
  delivered_at text, done_at text, cancel_reason text, fail_reason text,
  lang text not null default 'sq', channel text not null default 'web',
  customer_id text, created_by text, driver_id text, run_id text,
  lat real, lng real, accuracy integer, cash_collected real,
  station_ready text not null default '{}',
  created_at text not null, updated_at text not null);

create table if not exists bookings (
  id text primary key, number integer, status text not null default 'new',
  customer_name text not null, phone text not null, email text,
  date text not null, time text not null, guests integer not null default 2,
  area text, note text, lang text not null default 'sq',
  created_at text not null, updated_at text not null);

create table if not exists suppliers (
  id text primary key, name text not null, nipt text, phone text, email text,
  address text, note text, active integer not null default 1,
  created_at text not null, updated_at text not null);

create table if not exists stock_items (
  id text primary key, sku text unique, name text not null,
  unit text not null default 'copë', category text not null default '',
  min_qty real not null default 0, cost real not null default 0,
  active integer not null default 1, created_at text not null, updated_at text not null);

create table if not exists stock_moves (
  id text primary key, item_id text not null references stock_items(id) on delete cascade,
  qty real not null, kind text not null, unit_cost real,
  ref_type text, ref_id text, staff_id text, note text, at text not null);

create table if not exists purchases (
  id text primary key, number integer, supplier_id text, date text not null,
  status text not null default 'draft', subtotal real not null default 0,
  vat real not null default 0, total real not null default 0,
  doc_ref text, note text, staff_id text, created_at text not null, updated_at text not null);

create table if not exists purchase_lines (
  id text primary key, purchase_id text not null references purchases(id) on delete cascade,
  item_id text not null, qty real not null, unit_cost real not null default 0,
  total real not null default 0);

create table if not exists recipes (
  menu_item_id text not null, stock_item_id text not null, qty real not null,
  primary key (menu_item_id, stock_item_id));

create table if not exists documents (
  id text primary key, number integer, kind text not null,
  ref_type text, ref_id text, title text not null default '',
  data text not null default '{}', total real, staff_id text, created_at text not null);

-- Përdoruesit e panelit (pronari e menaxheri hyjnë me email, jo me kod).
create table if not exists users (
  id text primary key, email text not null unique, pass_hash text not null,
  staff_id text, created_at text not null);

create table if not exists sessions (
  token text primary key, user_id text not null references users(id) on delete cascade,
  created_at text not null, expires_at text not null);

create index if not exists orders_created_idx on orders (created_at desc);
create index if not exists orders_status_idx on orders (status);
create index if not exists orders_run_idx on orders (run_id);
create index if not exists stock_moves_item_idx on stock_moves (item_id);
`;

const DEFAULT_PHASES = [
  ['new',       10, 'E marrë',  'Placed',     'E marrë',        'Received',    '📥', '#8a8a8a', null, 1],
  ['accepted',  20, 'Pranuar',  'Accepted',   'Po përgatitet',  'In progress', '✓',  '#c4640b', 3,    0],
  ['preparing', 30, 'Në furrë', 'In kitchen', 'Po përgatitet',  'In progress', '🔥', '#c4640b', 20,   1],
  ['ready',     40, 'Gati',     'Ready',      'Nisi për te ti', 'On its way',  '🛎',  '#3b6446', 5,    0],
  ['delivering',50, 'Në rrugë', 'On the way', 'Nisi për te ti', 'On its way',  '🛵', '#3b6446', 25,   1],
  ['done',      60, 'Dorëzuar', 'Delivered',  'Dorëzuar',       'Delivered',   '🏁', '#3b6446', null, 1],
  ['cancelled', 70, 'Anuluar',  'Cancelled',  'Anuluar',        'Cancelled',   '✕',  '#a22f1b', null, 1],
];

const DEFAULT_ROLE_SCREENS = {
  manager: ['neworder','orders','kds','oven','runs','bookings','menu','stock','reports'],
  cashier: ['neworder','orders','bookings'],
  kitchen: ['kds'],
  pizza:   ['oven'],
  driver:  ['runs'],
};

// Ndarja fillestare e gatimit: picat dhe sanduiçët në furrë, pjesa tjetër në
// kuzhinë, pijet askund. Pronari e ndryshon te paneli.
const DEFAULT_STATIONS = {
  pizza: 'oven', fast: 'oven',
  rest: 'kitchen', trad: 'kitchen', starter: 'kitchen', pije: 'none',
};

function open(file) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const db = new DatabaseSync(file);
  db.exec(SCHEMA);

  // Kolonat e shtuara pas instalimit të parë. `create table if not exists` nuk
  // i shton dot te një bazë që ekziston, ndaj shtohen këtu një nga një — nëse
  // janë tashmë aty, SQLite ankohet dhe ne e kalojmë pa zhurmë.
  [['menu_items', 'station text'],
   ['orders', "station_ready text not null default '{}'"],
  ].forEach(([tbl, col]) => {
    try { db.exec(`alter table ${tbl} add column ${col}`); } catch (e) {}
  });

  const t = now();
  const ins = db.prepare(`insert or ignore into order_phases
    (key,sort,label_sq,label_en,customer_label_sq,customer_label_en,icon,color,
     target_minutes,is_core,enabled,customer_visible,updated_at)
    values (?,?,?,?,?,?,?,?,?,?,1,1,?)`);
  DEFAULT_PHASES.forEach((p) => ins.run(...p, t));

  const rs = db.prepare('insert or ignore into role_screens (role,screen) values (?,?)');
  Object.keys(DEFAULT_ROLE_SCREENS).forEach((role) =>
    DEFAULT_ROLE_SCREENS[role].forEach((screen) => rs.run(role, screen)));

  const cs = db.prepare('insert or ignore into category_stations (category,station) values (?,?)');
  Object.keys(DEFAULT_STATIONS).forEach((c) => cs.run(c, DEFAULT_STATIONS[c]));

  db.prepare('insert or ignore into settings (id,data,updated_at) values (?,?,?)')
    .run('main', '{}', t);

  return db;
}

/** Numri rendor i porosisë: 1000, 1001, … si te versioni online. */
function nextNumber(db, table, from) {
  const r = db.prepare(`select max(number) as n from ${table}`).get();
  return ((r && r.n) || (from - 1)) + 1;
}

module.exports = { open, uuid, now, hash, verify, genCode, nextNumber,
                   DEFAULT_ROLE_SCREENS };
