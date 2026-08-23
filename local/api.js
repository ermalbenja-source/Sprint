/* ============================================================================
   SPRINT — API-ja lokale.
   Flet të njëjtën gjuhë si Supabase (PostgREST + /rpc/*), që faqja të mos dijë
   fare nëse po punon në internet apo mbi kompjuterin e dyqanit. E njëjta faqe,
   dy vende.

   Zbatohet vetëm sa përdoret vërtet: filtrat eq/neq/gte/lt, renditja, kufiri
   dhe funksionet me emër.
   ========================================================================== */
'use strict';
const D = require('./db');

/* Kolonat që ruhen si JSON në SQLite por udhëtojnë si objekte. */
const JSON_COLS = { menu_items: ['tags'], settings: ['data'], orders: ['items','station_ready'],
                    zones: ['keywords','outline'],
                    documents: ['data'] };

const TABLES = ['menu_items','settings','order_phases','customers','customer_addresses',
                'staff','role_screens','category_stations','runs','run_points','orders','bookings','suppliers',
                'stock_levels',
                'stock_items','stock_moves','purchases','purchase_lines','recipes','documents',
                'push_subs','zones'];

const BOOL_COLS = ['available','enabled','customer_visible','is_core','active','blocked','is_default','low'];

function decode(table, row) {
  if (!row) return row;
  const out = Object.assign({}, row);
  (JSON_COLS[table] || []).forEach((c) => {
    if (typeof out[c] === 'string') { try { out[c] = JSON.parse(out[c]); } catch (e) {} }
  });
  BOOL_COLS.forEach((c) => { if (c in out && out[c] !== null) out[c] = !!out[c]; });
  return out;
}
function encode(table, row) {
  const out = Object.assign({}, row);
  (JSON_COLS[table] || []).forEach((c) => {
    if (c in out && typeof out[c] !== 'string') out[c] = JSON.stringify(out[c] == null ? null : out[c]);
  });
  Object.keys(out).forEach((k) => {
    if (typeof out[k] === 'boolean') out[k] = out[k] ? 1 : 0;
    else if (out[k] && typeof out[k] === 'object') out[k] = JSON.stringify(out[k]);
  });
  return out;
}

/* ---------- përkthimi i filtrave të PostgREST-it ---------- */
const OPS = { eq: '=', neq: '<>', gt: '>', gte: '>=', lt: '<', lte: '<=', like: 'like' };

function buildWhere(params) {
  const where = [], args = [];
  for (const [key, val] of params) {
    if (['select','order','limit','offset','on_conflict','apikey'].indexOf(key) >= 0) continue;
    const m = String(val).match(/^([a-z]+)\.(.*)$/s);
    if (!m || !OPS[m[1]]) continue;
    if (m[1] === 'eq' && m[2] === 'null') { where.push(`"${key}" is null`); continue; }
    if (m[1] === 'neq' && m[2] === 'null') { where.push(`"${key}" is not null`); continue; }
    where.push(`"${key}" ${OPS[m[1]]} ?`);
    args.push(m[2]);
  }
  return { sql: where.length ? ' where ' + where.join(' and ') : '', args };
}

function buildOrder(params) {
  const o = params.get('order');
  if (!o) return '';
  const parts = o.split(',').map((seg) => {
    const [col, ...mods] = seg.split('.');
    if (!/^[a-z_]+$/i.test(col)) return null;
    const desc = mods.indexOf('desc') >= 0 ? ' desc' : ' asc';
    const nulls = mods.indexOf('nullslast') >= 0 ? ' nulls last' : '';
    return `"${col}"${desc}${nulls}`;
  }).filter(Boolean);
  return parts.length ? ' order by ' + parts.join(', ') : '';
}

/* ══════════════════ REST ══════════════════ */

/* Kufijtë që Postgres-i i mban vetë me `check`. SQLite nuk i ka, ndaj
   kontrollohen këtu — përndryshe diçka që punon lokalisht do të refuzohej
   nga Supabase, dhe gabimi do të dilte vetëm pas kalimit online. */
function check(table, row) {
  if (table === 'orders' && row.items !== undefined) {
    const n = Array.isArray(row.items) ? row.items.length : -1;
    if (n < 1 || n > 60) {
      throw httpErr(400, 'Porosia duhet të ketë nga 1 deri në 60 rreshta.');
    }
  }
  if (table === 'orders' && row.total !== undefined
      && (Number(row.total) < 0 || Number(row.total) > 500000)) {
    throw httpErr(400, 'Vlera e porosisë del jashtë kufijve.');
  }
}

/* Artikulli që ka histori blerjeje ose është përbërës i një recete nuk fshihet
   dot — dhe kjo është e drejtë. Por gabimi i bazës nuk i thotë asgjë njeriut
   përpara ekranit, ndaj kthehet një fjali e kuptueshme. */
function guardDelete(db, table, w) {
  if (table !== 'stock_items') return;
  const ids = db.prepare(`select id, name from "stock_items"${w.sql}`).all(...w.args);
  for (const it of ids) {
    const inBuy = db.prepare('select count(*) as n from purchase_lines where item_id=?').get(it.id).n;
    if (inBuy) {
      throw httpErr(409, `«${it.name}» ka blerje të regjistruara dhe nuk fshihet dot. `
        + 'Çaktivizoje në vend që ta fshish — historia mbetet e paprekur.');
    }
    const inRec = db.prepare('select count(*) as n from recipes where stock_item_id=?').get(it.id).n;
    if (inRec) {
      throw httpErr(409, `«${it.name}» përdoret te një recetë. Hiqe së pari nga receta.`);
    }
  }
}

/* Porosia e re prek vetëm stacionet që kanë vërtet diçka për të gatuar. Një
   porosi vetëm me pije nuk zgjon askënd. */
function afterOrder(db, row) {
  let items = row.items;
  if (typeof items === 'string') { try { items = JSON.parse(items); } catch (e) { items = []; } }
  const need = stationsOf(router(db), items || []);
  const label = { kitchen: 'kds', oven: 'oven' };
  need.forEach((st2) => {
    notify([label[st2]], {
      title: st2 === 'oven' ? 'Porosi e re — furra' : 'Porosi e re — kuzhina',
      body: '#' + (row.number || '') + ' · '
        + (items || []).filter((x) => (x.station || st2) === st2 || !x.station)
            .slice(0, 3).map((x) => (Number(x.qty) || 1) + '× ' + (x.name || '')).join(', '),
      tag: 'e-re-' + (row.id || row.number || Date.now()),
    });
  });
}

function rest(db, method, table, params, body, headers) {
  if (TABLES.indexOf(table) < 0) throw httpErr(404, 'Tabelë e panjohur: ' + table);
  const prefer = String(headers['prefer'] || '');
  const wantBack = prefer.indexOf('return=representation') >= 0;

  if (method === 'GET') {
    const w = buildWhere(params);
    const lim = params.get('limit');
    const sql = `select * from "${table}"${w.sql}${buildOrder(params)}`
      + (lim ? ' limit ' + Number(lim) : '');
    return db.prepare(sql).all(...w.args).map((r) => decode(table, r));
  }

  if (method === 'POST') {
    const rows = Array.isArray(body) ? body : [body];
    const merge = prefer.indexOf('merge-duplicates') >= 0;
    const ignore = prefer.indexOf('ignore-duplicates') >= 0;
    const out = [];
    for (const raw of rows) {
      check(table, raw);
      if (table === 'orders' && raw.zone == null) {
        raw.zone = zoneFor(db, raw.address, raw.lat, raw.lng);
      }
      const row = encode(table, withDefaults(db, table, raw));
      const cols = Object.keys(row);
      const verb = merge ? 'insert or replace' : ignore ? 'insert or ignore' : 'insert';
      const sql = `${verb} into "${table}" (${cols.map((c) => `"${c}"`).join(',')})
                   values (${cols.map(() => '?').join(',')})`;
      db.prepare(sql).run(...cols.map((c) => row[c]));
      const saved = row.id
        ? decode(table, db.prepare(`select * from "${table}" where id=?`).get(row.id))
        : row.key
          ? decode(table, db.prepare(`select * from "${table}" where key=?`).get(row.key))
          : null;
      // Njoftimi nis pas ruajtjes, jo para: numri i porosisë jepet nga baza,
      // dhe pa të njoftimi do të thoshte thjesht «porosi e re #».
      if (table === 'orders' && saved) afterOrder(db, saved);
      if (saved) out.push(saved);
    }
    return wantBack ? out : null;
  }

  if (method === 'PATCH') {
    const w = buildWhere(params);
    const row = encode(table, Object.assign({}, body,
      hasCol(db, table, 'updated_at') ? { updated_at: D.now() } : {}));
    const cols = Object.keys(row);
    if (!cols.length) return wantBack ? [] : null;
    db.prepare(`update "${table}" set ${cols.map((c) => `"${c}"=?`).join(',')}${w.sql}`)
      .run(...cols.map((c) => row[c]), ...w.args);
    if (table === 'orders' && body && body.status === 'accepted') {
      db.prepare(`select id, number, items, note from "orders"${w.sql}`).all(...w.args)
        .forEach((r) => afterOrder(db, decode('orders', r)));
    }
    if (!wantBack) return null;
    return db.prepare(`select * from "${table}"${w.sql}`).all(...w.args).map((r) => decode(table, r));
  }

  if (method === 'DELETE') {
    const w = buildWhere(params);
    guardDelete(db, table, w);
    db.prepare(`delete from "${table}"${w.sql}`).run(...w.args);
    return null;
  }

  throw httpErr(405, 'Metodë e papranuar');
}

const colCache = {};
function hasCol(db, table, col) {
  if (!colCache[table]) {
    colCache[table] = db.prepare(`pragma table_info("${table}")`).all().map((r) => r.name);
  }
  return colCache[table].indexOf(col) >= 0;
}

function withDefaults(db, table, raw) {
  const row = Object.assign({}, raw);
  if (hasCol(db, table, 'id') && !row.id) row.id = D.uuid();
  if (hasCol(db, table, 'created_at') && !row.created_at) row.created_at = D.now();
  if (hasCol(db, table, 'updated_at')) row.updated_at = D.now();
  if (table === 'orders') {
    if (!row.number) row.number = D.nextNumber(db, 'orders', 1000);
    if (!row.token) row.token = D.genCode();
  }
  if (table === 'bookings' && !row.number) row.number = D.nextNumber(db, 'bookings', 100);
  if (table === 'purchases' && !row.number) row.number = D.nextNumber(db, 'purchases', 1);
  if (table === 'documents' && !row.number) row.number = D.nextNumber(db, 'documents', 1);
  return row;
}

/* ══════════════════ FUNKSIONET ══════════════════ */

const norm = (c) => String(c || '').replace(/[^A-Za-z0-9]/g, '').toUpperCase();
const digits = (s) => String(s || '').replace(/\D/g, '');
const ALL_SCREENS = ['neworder','orders','kds','oven','runs','bookings','menu','stock','reports','staff','settings'];

function staffByToken(db, token) {
  const r = db.prepare(`select s.id as staff_id, s.name, s.role
                          from staff_sessions ss join staff s on s.id = ss.staff_id
                         where ss.token = ? and ss.expires_at > ? and s.active = 1`)
    .get(String(token || ''), D.now());
  if (!r) throw httpErr(401, 'Sesioni skadoi. Hyr përsëri me kod.');
  db.prepare('update staff_sessions set last_seen=? where token=?').run(D.now(), token);
  return r;
}

function screensFor(db, role) {
  if (role === 'owner') return ALL_SCREENS.slice();
  return db.prepare('select screen from role_screens where role=? order by screen')
    .all(role).map((r) => r.screen);
}

/* ---------- zonat e dërgesës ----------
   I njëjti algoritëm si te Postgres-i (ray casting), që përgjigjja të mos
   ndryshojë sipas vendit ku llogaritet. */
function pointInOutline(lat, lng, outline) {
  if (!Array.isArray(outline) || outline.length < 3
      || lat == null || lng == null) return false;
  let inside = false;
  for (let i = 0, j = outline.length - 1; i < outline.length; j = i++) {
    const yi = Number(outline[i][0]), xi = Number(outline[i][1]);
    const yj = Number(outline[j][0]), xj = Number(outline[j][1]);
    if ((yi > lat) !== (yj > lat)
        && lng < (xj - xi) * (lat - yi) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

/** Pika mbizotëron mbi fjalët: adresa e shkruar gabim nuk e zhvendos zonën. */
function zoneFor(db, address, lat, lng) {
  const zs = db.prepare('select * from zones where active=1 order by sort').all()
    .map((z) => decode('zones', z));
  if (lat != null && lng != null) {
    for (const z of zs) {
      if (z.outline && pointInOutline(Number(lat), Number(lng), z.outline)) return z.name;
    }
  }
  const a = String(address || '').toLowerCase();
  if (a) {
    for (const z of zs) {
      for (const k of (z.keywords || [])) {
        if (k && a.indexOf(String(k).toLowerCase()) >= 0) return z.name;
      }
    }
  }
  return null;
}

/* ---------- kutia e njoftimeve ----------
   Funksionet nuk dërgojnë vetë njoftime: lënë një shënim këtu dhe serveri e
   zbraz pasi t'i jetë përgjigjur kërkesës. Kështu një njoftim i ngadaltë nuk e
   mban në pritje ekranin që sapo shtypi një buton. */
const outbox = [];
function notify(screens, msg) {
  outbox.push({ screens, msg });
}

/* ---------- stacionet e gatimit ---------- */
const STATIONS = ['kitchen', 'oven', 'none'];
const stationArg = (v) => (v === 'oven' ? 'oven' : 'kitchen');

/** Kthen funksionin «ku gatuhet ky rresht?», me ndarjen e lexuar një herë. */
function router(db) {
  const cats = {};
  db.prepare('select category, station from category_stations').all()
    .forEach((r) => { cats[r.category] = r.station; });
  const items = {};
  db.prepare('select id, category, station from menu_items').all()
    .forEach((r) => { items[r.id] = r; });
  return (line) => {
    if (!line) return 'kitchen';
    if (STATIONS.indexOf(line.station) >= 0) return line.station;
    const m = items[String(line.id)];
    if (m && STATIONS.indexOf(m.station) >= 0) return m.station;
    const c = (m && m.category) || line.category || line.c;
    if (c && STATIONS.indexOf(cats[c]) >= 0) return cats[c];
    return 'kitchen';
  };
}

/** Cilat stacione duhet ta gatuajnë këtë porosi. Pijet nuk numërohen. */
function stationsOf(of, items) {
  const seen = {};
  (items || []).forEach((li) => { const s = of(li); if (s !== 'none') seen[s] = 1; });
  return Object.keys(seen).sort();
}

function needScreen(db, token, screen, msg) {
  const me = staffByToken(db, token);
  if (screensFor(db, me.role).indexOf(screen) < 0) throw httpErr(403, msg);
  return me;
}

const RPC = {
  /* ---------- gjurmimi i klientit ---------- */
  track_order(db, a) {
    const c = norm(a.p_token);
    if (c.length < 6) return [];
    const o = db.prepare(`select token as code, number, status, kind, total, created_at,
                                 accepted_at, prep_minutes, items
                            from orders where upper(token) = ?`).get(c);
    return o ? [decode('orders', o)] : [];
  },
  find_orders_by_phone(db, a) {
    const d = digits(a.p_phone);
    if (d.length < 6) return [];
    const since = new Date(Date.now() - 24 * 3600e3).toISOString();
    return db.prepare(`select token as code, number, status, kind, total, created_at,
                              accepted_at, prep_minutes
                         from orders
                        where created_at > ? and status not in ('done','cancelled')
                        order by created_at desc limit 20`).all(since)
      .filter((o) => true)
      .slice(0, 5);
  },
  public_phases(db) {
    return db.prepare(`select key, sort,
                              coalesce(nullif(customer_label_sq,''), label_sq) as label_sq,
                              coalesce(nullif(customer_label_en,''), label_en) as label_en,
                              icon, color
                         from order_phases
                        where enabled=1 and customer_visible=1 and key<>'cancelled'
                        order by sort`).all();
  },

  /* ---------- stafi ---------- */
  set_staff_pin(db, a) {
    if (!/^[0-9]{4,8}$/.test(String(a.p_pin))) throw httpErr(400, 'Kodi duhet të jetë 4–8 shifra.');
    const others = db.prepare('select id, name, pin_hash from staff where id<>? and active=1 and pin_hash is not null')
      .all(a.p_staff_id);
    for (const o of others) {
      if (D.verify(a.p_pin, o.pin_hash)) {
        throw httpErr(400, 'Ky kod përdoret tashmë nga ' + o.name + '.');
      }
    }
    db.prepare('update staff set pin_hash=?, failed_tries=0, locked_until=null, updated_at=? where id=?')
      .run(D.hash(a.p_pin), D.now(), a.p_staff_id);
    return null;
  },
  staff_login(db, a) {
    const list = db.prepare('select * from staff where active=1 and pin_hash is not null').all();
    const hit = list.find((s) =>
      (!s.locked_until || s.locked_until < D.now()) && D.verify(a.p_pin, s.pin_hash));
    if (!hit) {
      db.prepare(`update staff set failed_tries = failed_tries + 1,
                    locked_until = case when failed_tries + 1 >= 5 then ? else locked_until end
                  where active=1 and pin_hash is not null`)
        .run(new Date(Date.now() + 15 * 60000).toISOString());
      throw httpErr(401, 'Kod i gabuar.');
    }
    db.prepare('update staff set failed_tries=0, locked_until=null where id=?').run(hit.id);
    const token = D.uuid();
    db.prepare(`insert into staff_sessions (token,staff_id,device,created_at,expires_at,last_seen)
                values (?,?,?,?,?,?)`)
      .run(token, hit.id, String(a.p_device || '').slice(0, 120), D.now(),
           new Date(Date.now() + 30 * 864e5).toISOString(), D.now());
    return [{ token, staff_id: hit.id, name: hit.name, role: hit.role }];
  },
  staff_by_token(db, a) { return [staffByToken(db, a.p_token)]; },
  staff_logout(db, a) {
    db.prepare('delete from staff_sessions where token=?').run(String(a.p_token || ''));
    return null;
  },
  my_screens(db, a) {
    const me = staffByToken(db, a.p_token);
    return [{ staff_id: me.staff_id, name: me.name, role: me.role, screens: screensFor(db, me.role) }];
  },

  /* ---------- klientët ---------- */
  lookup_customer(db, a) {
    const d = digits(a.p_phone);
    if (d.length < 6) return null;
    const c = db.prepare('select * from customers').all()
      .find((x) => digits(x.phone).slice(-9) === d.slice(-9));
    if (!c) return null;
    const addresses = db.prepare(`select * from customer_addresses where customer_id=?
                                  order by is_default desc, created_at desc`).all(c.id);
    const last = db.prepare(`select id, number, items, total from orders
                              where customer_id=? and status='done'
                              order by created_at desc limit 1`).get(c.id);
    return { customer: decode('customers', c), addresses,
             last_order: last ? decode('orders', last) : null };
  },
  upsert_customer(db, a) {
    const phone = String(a.p_phone || '').trim();
    let c = db.prepare('select * from customers').all()
      .find((x) => digits(x.phone).slice(-9) === digits(phone).slice(-9));
    if (!c) {
      const id = D.uuid();
      db.prepare(`insert into customers (id,phone,name,created_at,updated_at)
                  values (?,?,?,?,?)`).run(id, phone, a.p_name || '', D.now(), D.now());
      c = db.prepare('select * from customers where id=?').get(id);
    } else if (a.p_name) {
      db.prepare('update customers set name=?, updated_at=? where id=?').run(a.p_name, D.now(), c.id);
    }
    const addr = String(a.p_address || '').trim();
    if (addr.length >= 3) {
      const hit = db.prepare('select * from customer_addresses where customer_id=?').all(c.id)
        .find((x) => x.address.trim().toLowerCase() === addr.toLowerCase());
      if (hit) {
        db.prepare('update customer_addresses set lat=coalesce(?,lat), lng=coalesce(?,lng), accuracy=coalesce(?,accuracy) where id=?')
          .run(a.p_lat, a.p_lng, a.p_accuracy, hit.id);
      } else {
        db.prepare(`insert into customer_addresses (id,customer_id,address,lat,lng,accuracy,created_at)
                    values (?,?,?,?,?,?,?)`)
          .run(D.uuid(), c.id, addr, a.p_lat, a.p_lng, a.p_accuracy, D.now());
      }
    }
    return c.id;
  },

  /* ---------- gatimi: kuzhina dhe furra e picës ----------
     Dy stacione të ndara, secili me ekranin e vet. Një porosi mund të ketë
     rreshta te të dyja dhe bëhet «gati» vetëm kur të dy e kanë dhënë. */
  kds_orders(db, a) {
    const sta = stationArg(a.p_station);
    needScreen(db, a.p_token, sta === 'oven' ? 'oven' : 'kds', 'Ky kod nuk e hap këtë ekran.');
    const of = router(db);
    const since = new Date(Date.now() - 12 * 3600e3).toISOString();
    return db.prepare(`select id,number,status,kind,items,note,created_at,accepted_at,
                              kitchen_at,ready_at,prep_minutes,station_ready
                         from orders
                        where status in ('new','accepted','preparing','ready') and created_at > ?
                        order by created_at`).all(since)
      .map((r) => decode('orders', r))
      .map((o) => {
        const done = o.station_ready || {};
        const need = stationsOf(of, o.items);
        return Object.assign({}, o, {
          items: (o.items || []).map((li) => Object.assign({}, li, { station: of(li) })),
          need,
          station_done: !!done[sta],
          waiting_on: need.filter((s) => !done[s]),
        });
      })
      .filter((o) => o.need.indexOf(sta) >= 0);
  },
  kds_bump(db, a) {
    const sta = stationArg(a.p_station);
    needScreen(db, a.p_token, sta === 'oven' ? 'oven' : 'kds', 'Ky kod nuk e hap këtë ekran.');
    const raw = db.prepare('select status,items,station_ready,kitchen_at,ready_at from orders where id=?')
      .get(a.p_order);
    if (!raw) throw httpErr(404, 'Porosia nuk u gjet.');
    const o = decode('orders', raw);
    const need = stationsOf(router(db), o.items);
    if (need.indexOf(sta) < 0) throw httpErr(400, 'Kjo porosi nuk ka asgjë për këtë stacion.');

    const ok = (a.p_status === 'preparing' && ['new','accepted','preparing','ready'].indexOf(o.status) >= 0)
            || (a.p_status === 'ready' && ['new','accepted','preparing'].indexOf(o.status) >= 0);
    if (!ok) throw httpErr(400, `Kalimi ${o.status} → ${a.p_status} nuk lejohet nga gatimi.`);

    const t = D.now();
    const done = Object.assign({}, o.station_ready || {});
    if (a.p_status === 'ready') done[sta] = t; else delete done[sta];
    const gati = need.every((s) => done[s]);

    db.prepare(`update orders set status=?, station_ready=?, updated_at=?,
                  kitchen_at=coalesce(kitchen_at,?), ready_at=?
                where id=?`)
      .run(gati ? 'ready' : 'preparing', JSON.stringify(done), t, t,
           gati ? (o.ready_at || t) : null, a.p_order);

    if (gati) {
      const full = db.prepare('select number, kind, address from orders where id=?').get(a.p_order);
      notify(['runs'], {
        title: 'Porosi gati për nisje',
        body: '#' + full.number + (full.kind === 'pickup' ? ' · merr vetë'
              : (full.address ? ' · ' + full.address : '')),
        tag: 'gati-' + a.p_order,
      });
    }
    return gati ? 'ready' : 'preparing';
  },

  /* ---------- motorristi ---------- */
  drv_ready(db, a) {
    needScreen(db, a.p_token, 'runs', 'Ky kod nuk e hap ekranin e motorristit.');
    const since = new Date(Date.now() - 12 * 3600e3).toISOString();
    return db.prepare(`select id,number,kind,customer_name,phone,address,lat,lng,
                              total,payment,note,ready_at,zone
                         from orders
                        where status='ready' and kind='delivery' and run_id is null and created_at > ?
                        order by ready_at, created_at`).all(since);
  },
  drv_start_run(db, a) {
    const me = needScreen(db, a.p_token, 'runs', 'Ky kod nuk e hap ekranin e motorristit.');
    const ids = a.p_orders || [];
    if (!ids.length) throw httpErr(400, 'Zgjidh të paktën një porosi.');
    const open = db.prepare('select id from runs where driver_id=? and closed_at is null').get(me.staff_id);
    if (open) throw httpErr(400, 'Ke ende një nisje të hapur. Mbylle atë përpara se të nisesh sërish.');

    const rid = D.uuid();
    db.prepare('insert into runs (id,driver_id,started_at,created_at) values (?,?,?,?)')
      .run(rid, me.staff_id, D.now(), D.now());
    const upd = db.prepare(`update orders set run_id=?, driver_id=?, status='delivering',
                              picked_at=?, updated_at=?
                            where id=? and status='ready' and run_id is null`);
    let n = 0;
    ids.forEach((id) => { n += upd.run(rid, me.staff_id, D.now(), D.now(), id).changes; });
    if (!n) {
      db.prepare('delete from runs where id=?').run(rid);
      throw httpErr(409, 'Këto porosi u morën nga dikush tjetër. Rifresko listën.');
    }
    const cash = db.prepare(`select coalesce(sum(total),0) as c from orders
                              where run_id=? and payment='cash'`).get(rid).c;
    db.prepare('update runs set cash_due=? where id=?').run(cash, rid);
    db.prepare(`insert into run_points (id,run_id,kind,lat,lng,at) values (?,?,?,?,?,?)`)
      .run(D.uuid(), rid, 'start', a.p_lat, a.p_lng, D.now());
    return rid;
  },
  drv_my_run(db, a) {
    const me = needScreen(db, a.p_token, 'runs', 'Ky kod nuk e hap ekranin e motorristit.');
    const run = db.prepare(`select * from runs where driver_id=? and closed_at is null
                            order by started_at desc limit 1`).get(me.staff_id);
    if (!run) return [];
    const stops = db.prepare(`select id,number,status,customer_name,phone,address,lat,lng,
                                     total,payment,note,delivered_at,fail_reason,zone
                                from orders where run_id=?
                               order by (delivered_at is not null), number`).all(run.id);
    if (!stops.length) return [{ run_id: run.id, started_at: run.started_at, cash_due: run.cash_due }];
    return stops.map((s) => Object.assign(
      { run_id: run.id, started_at: run.started_at, cash_due: run.cash_due }, s));
  },
  drv_delivered(db, a) {
    const me = needScreen(db, a.p_token, 'runs', 'Ky kod nuk e hap ekranin e motorristit.');
    const t = D.now();
    const r = db.prepare(`update orders set status='done', delivered_at=?, done_at=?,
                            cash_collected=?, updated_at=?
                          where id=? and driver_id=? and status='delivering'`)
      .run(t, t, a.p_cash == null ? null : Number(a.p_cash), t, a.p_order, me.staff_id);
    if (!r.changes) throw httpErr(400, 'Kjo porosi nuk është në nisjen tënde.');

    const o = db.prepare('select run_id, customer_id, address from orders where id=?').get(a.p_order);
    db.prepare('insert into run_points (id,run_id,order_id,kind,lat,lng,at) values (?,?,?,?,?,?,?)')
      .run(D.uuid(), o.run_id, a.p_order, 'delivered', a.p_lat, a.p_lng, t);

    // HARTA QË MËSON. Në çastin e dorëzimit telefoni është te dera; ajo pikë
    // i ngjitet adresës dhe herën tjetër e dimë saktësisht ku është.
    if (a.p_lat != null && a.p_lng != null && o.customer_id && o.address) {
      const dita = new Date(Date.now() - 864e5).toISOString();
      db.prepare(`update customer_addresses
                     set lat=?, lng=?, accuracy=null, confirmed_at=?, confirmed_by=?
                   where customer_id=? and lower(trim(address))=lower(trim(?))
                     and (confirmed_at is null or confirmed_at < ?)`)
        .run(a.p_lat, a.p_lng, t, me.staff_id, o.customer_id, o.address, dita);
    }

    const left = db.prepare(`select count(*) as n from orders
                              where run_id=? and status not in ('done','cancelled')`).get(o.run_id).n;
    if (!left) {
      db.prepare('update runs set closed_at=? where id=?').run(t, o.run_id);
      db.prepare('insert into run_points (id,run_id,kind,lat,lng,at) values (?,?,?,?,?,?)')
        .run(D.uuid(), o.run_id, 'end', a.p_lat, a.p_lng, t);
    }
    return 'done';
  },
  drv_failed(db, a) {
    const me = needScreen(db, a.p_token, 'runs', 'Ky kod nuk e hap ekranin e motorristit.');
    const r = db.prepare(`update orders set status='ready', run_id=null, picked_at=null,
                            fail_reason=?, updated_at=?
                          where id=? and driver_id=? and status='delivering'`)
      .run(String(a.p_reason || 'Nuk u gjend').slice(0, 200), D.now(), a.p_order, me.staff_id);
    if (!r.changes) throw httpErr(400, 'Kjo porosi nuk është në nisjen tënde.');
    return 'ready';
  },
  drv_my_day(db, a) {
    const me = needScreen(db, a.p_token, 'runs', 'Ky kod nuk e hap ekranin e motorristit.');
    const day = (a.p_date || D.now().slice(0, 10));
    const rows = db.prepare(`select total, payment, picked_at, delivered_at from orders
                              where driver_id=? and delivered_at is not null
                                and substr(delivered_at,1,10)=?`).all(me.staff_id, day);
    const sum = (f) => rows.filter(f).reduce((n, r) => n + (r.total || 0), 0);
    const mins = rows.filter((r) => r.picked_at)
      .map((r) => (new Date(r.delivered_at) - new Date(r.picked_at)) / 60000);
    return [{ deliveries: rows.length, cash: sum((r) => r.payment === 'cash'),
              card: sum((r) => r.payment === 'card'),
              avg_minutes: mins.length ? Math.round(mins.reduce((a2, b) => a2 + b, 0) / mins.length * 10) / 10 : null }];
  },
  driver_day(db, a) {
    const day = (a.p_date || D.now().slice(0, 10));
    return db.prepare(`select s.id as driver_id, s.name as driver_name,
                              count(o.id) as deliveries,
                              coalesce(sum(case when o.payment='cash' then o.total end),0) as cash,
                              coalesce(sum(case when o.payment='card' then o.total end),0) as card
                         from staff s join orders o on o.driver_id = s.id
                        where s.role='driver' and o.delivered_at is not null
                          and substr(o.delivered_at,1,10)=?
                        group by s.id order by deliveries desc`).all(day);
  },
  consume_stock_for_order(db, a) {
    const done = db.prepare(`select count(*) as n from stock_moves
                              where ref_type='order' and ref_id=? and kind='production'`).get(a.p_order_id).n;
    if (done) return 0;
    const o = db.prepare('select items from orders where id=?').get(a.p_order_id);
    if (!o) return 0;
    let items = [];
    try { items = JSON.parse(o.items) || []; } catch (e) {}
    const rec = db.prepare('select stock_item_id, qty from recipes where menu_item_id=?');
    let n = 0;
    items.forEach((line) => {
      rec.all(line.id).forEach((r) => {
        db.prepare(`insert into stock_moves (id,item_id,qty,kind,ref_type,ref_id,note,at)
                    values (?,?,?,?,?,?,?,?)`)
          .run(D.uuid(), r.stock_item_id, -1 * r.qty * (Number(line.qty) || 1),
               'production', 'order', a.p_order_id, 'Zbritur nga porosia', D.now());
        n++;
      });
    });
    return n;
  },

  /* ---------- magazina ----------
     Gjendja nuk shkruhet kurrë drejtpërdrejt: llogaritet nga lëvizjet, që
     çdo copë të ketë një pse. */
  stock_adjust(db, a) {
    const kind = String(a.p_kind || '');
    if (['in','out','waste','count','return'].indexOf(kind) < 0) {
      throw httpErr(400, 'Lloj lëvizjeje i panjohur: ' + kind);
    }
    if (!db.prepare('select 1 as x from stock_items where id=?').get(a.p_item)) {
      throw httpErr(404, 'Artikulli nuk u gjet.');
    }
    const cur = Number(db.prepare('select coalesce(sum(qty),0) as q from stock_moves where item_id=?')
      .get(a.p_item).q) || 0;
    const q = Number(a.p_qty) || 0;
    let delta;
    if (kind === 'count') { delta = q - cur; if (!delta) return cur; }
    else if (kind === 'out' || kind === 'waste') delta = -Math.abs(q);
    else delta = Math.abs(q);

    db.prepare(`insert into stock_moves (id,item_id,qty,kind,note,at) values (?,?,?,?,?,?)`)
      .run(D.uuid(), a.p_item, delta, kind,
           kind === 'count' ? ((a.p_note || '') + ' (numërim: ' + q + ')') : (a.p_note || null),
           D.now());
    return cur + delta;
  },

  /* Pranimi i blerjes: rreshtat bëhen hyrje dhe kostoja merr çmimin e fundit.
     Thirrja e dytë nuk bën asgjë — fatura nuk hyn dy herë. */
  receive_purchase(db, a) {
    const p = db.prepare('select status from purchases where id=?').get(a.p_id);
    if (!p) throw httpErr(404, 'Blerja nuk u gjet.');
    if (p.status === 'received') return 0;
    if (p.status === 'cancelled') throw httpErr(400, 'Blerja është anuluar.');

    const lines = db.prepare('select * from purchase_lines where purchase_id=?').all(a.p_id);
    const t = D.now();
    lines.forEach((l) => {
      db.prepare(`insert into stock_moves (id,item_id,qty,kind,unit_cost,ref_type,ref_id,note,at)
                  values (?,?,?,?,?,?,?,?,?)`)
        .run(D.uuid(), l.item_id, l.qty, 'in', l.unit_cost, 'purchase', a.p_id,
             'Hyrje nga blerja', t);
      if (Number(l.unit_cost) > 0) {
        db.prepare('update stock_items set cost=?, updated_at=? where id=?')
          .run(l.unit_cost, t, l.item_id);
      }
    });
    const sum = lines.reduce((n, l) => n + (Number(l.total) || 0), 0);
    db.prepare('update purchases set status=?, subtotal=?, total=?, updated_at=? where id=?')
      .run('received', sum, sum, t, a.p_id);
    return lines.length;
  },

  zone_for(db, a) { return zoneFor(db, a.p_address, a.p_lat, a.p_lng); },

  /* ---------- njoftimet push ---------- */
  push_subscribe(db, a) {
    const me = staffByToken(db, a.p_token);
    const ep = String(a.p_endpoint || '');
    if (!ep) throw httpErr(400, 'Mungon adresa e abonimit.');
    const had = db.prepare('select id from push_subs where endpoint=?').get(ep);
    if (had) {
      db.prepare(`update push_subs set staff_id=?, p256dh=?, auth=?, device=?, fails=0
                  where endpoint=?`)
        .run(me.staff_id, a.p_p256dh, a.p_auth, a.p_device || null, ep);
      return had.id;
    }
    const id = D.uuid();
    db.prepare(`insert into push_subs (id,staff_id,endpoint,p256dh,auth,device,created_at)
                values (?,?,?,?,?,?,?)`)
      .run(id, me.staff_id, ep, a.p_p256dh, a.p_auth, a.p_device || null, D.now());
    return id;
  },
  push_unsubscribe(db, a) {
    staffByToken(db, a.p_token);
    db.prepare('delete from push_subs where endpoint=?').run(String(a.p_endpoint || ''));
    return 1;
  },

  /* ---------- raportet ---------- */
  report_day(db, a) {
    const day = a.p_date || D.now().slice(0, 10);
    const r = db.prepare(`select
        count(case when status<>'cancelled' then 1 end) as orders_count,
        coalesce(sum(case when status<>'cancelled' then total end),0) as revenue,
        coalesce(sum(case when status<>'cancelled' and payment='cash' then total end),0) as cash,
        coalesce(sum(case when status<>'cancelled' and payment<>'cash' then total end),0) as card,
        count(case when status<>'cancelled' and kind='delivery' then 1 end) as delivery_count,
        count(case when status<>'cancelled' and kind='pickup' then 1 end) as pickup_count,
        count(case when status<>'cancelled' and channel='web' then 1 end) as web_count,
        count(case when status<>'cancelled' and channel='phone' then 1 end) as phone_count,
        count(case when status='cancelled' then 1 end) as cancelled_count,
        coalesce(round(avg(case when status<>'cancelled' then total end)),0) as guests_avg
      from orders where substr(created_at,1,10)=?`).get(day);

    // Kohët nxirren veç: SQLite nuk ka zbritje datash, ndaj llogariten këtu.
    const rows = db.prepare(`select created_at, ready_at, picked_at, delivered_at
                               from orders where substr(created_at,1,10)=?`).all(day);
    const avg = (list) => list.length
      ? Math.round((list.reduce((n, x) => n + x, 0) / list.length) * 10) / 10 : null;
    const mins = (a2, b2) => (new Date(b2) - new Date(a2)) / 60000;
    r.avg_prep_minutes = avg(rows.filter((x) => x.ready_at)
      .map((x) => mins(x.created_at, x.ready_at)));
    r.avg_delivery_minutes = avg(rows.filter((x) => x.delivered_at && x.picked_at)
      .map((x) => mins(x.picked_at, x.delivered_at)));
    return [r];
  },

  report_range(db, a) {
    return db.prepare(`select substr(created_at,1,10) as day, count(*) as orders_count,
                              coalesce(sum(total),0) as revenue
                         from orders
                        where substr(created_at,1,10) between ? and ? and status<>'cancelled'
                        group by 1 order by 1`).all(a.p_from, a.p_to);
  },

  report_items(db, a) {
    const of = router(db);
    const rows = db.prepare(`select items from orders
                              where substr(created_at,1,10) between ? and ? and status<>'cancelled'`)
      .all(a.p_from, a.p_to);
    const acc = {};
    rows.forEach((r) => {
      let items = [];
      try { items = JSON.parse(r.items) || []; } catch (e) {}
      items.forEach((li) => {
        const id = String(li.id == null ? '' : li.id);
        const k = acc[id] || (acc[id] = { item_id: id, name: li.name || id, qty: 0,
                                          revenue: 0, station: of(li) });
        const q = Number(li.qty) || 0;
        k.qty += q;
        k.revenue += q * (Number(li.price) || 0);
        if (li.name) k.name = li.name;
      });
    });
    return Object.values(acc).sort((x, y) => y.qty - x.qty);
  },
};

function httpErr(status, message) {
  const e = new Error(message);
  e.status = status;
  return e;
}

module.exports = { rest, RPC, httpErr, decode, outbox, notify, zoneFor, pointInOutline };
