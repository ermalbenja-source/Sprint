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
const JSON_COLS = { menu_items: ['tags'], settings: ['data'], orders: ['items'],
                    documents: ['data'] };

const TABLES = ['menu_items','settings','order_phases','customers','customer_addresses',
                'staff','role_screens','runs','run_points','orders','bookings','suppliers',
                'stock_items','stock_moves','purchases','purchase_lines','recipes','documents'];

const BOOL_COLS = ['available','enabled','customer_visible','is_core','active','blocked','is_default'];

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
      const row = encode(table, withDefaults(db, table, raw));
      const cols = Object.keys(row);
      const verb = merge ? 'insert or replace' : ignore ? 'insert or ignore' : 'insert';
      const sql = `${verb} into "${table}" (${cols.map((c) => `"${c}"`).join(',')})
                   values (${cols.map(() => '?').join(',')})`;
      db.prepare(sql).run(...cols.map((c) => row[c]));
      if (row.id) out.push(decode(table, db.prepare(`select * from "${table}" where id=?`).get(row.id)));
      else if (row.key) out.push(decode(table, db.prepare(`select * from "${table}" where key=?`).get(row.key)));
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
    if (!wantBack) return null;
    return db.prepare(`select * from "${table}"${w.sql}`).all(...w.args).map((r) => decode(table, r));
  }

  if (method === 'DELETE') {
    const w = buildWhere(params);
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
const ALL_SCREENS = ['neworder','orders','kds','runs','bookings','menu','stock','reports','staff','settings'];

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

  /* ---------- kuzhina ---------- */
  kds_orders(db, a) {
    needScreen(db, a.p_token, 'kds', 'Ky kod nuk e hap ekranin e kuzhinës.');
    const since = new Date(Date.now() - 12 * 3600e3).toISOString();
    return db.prepare(`select id,number,status,kind,items,note,created_at,
                              accepted_at,kitchen_at,ready_at,prep_minutes
                         from orders
                        where status in ('new','accepted','preparing','ready') and created_at > ?
                        order by created_at`).all(since).map((r) => decode('orders', r));
  },
  kds_bump(db, a) {
    needScreen(db, a.p_token, 'kds', 'Ky kod nuk e hap ekranin e kuzhinës.');
    const o = db.prepare('select status from orders where id=?').get(a.p_order);
    if (!o) throw httpErr(404, 'Porosia nuk u gjet.');
    const ok = (a.p_status === 'preparing' && ['new','accepted','ready'].indexOf(o.status) >= 0)
            || (a.p_status === 'ready' && ['preparing','accepted'].indexOf(o.status) >= 0);
    if (!ok) throw httpErr(400, `Kalimi ${o.status} → ${a.p_status} nuk lejohet nga kuzhina.`);
    const t = D.now();
    db.prepare(`update orders set status=?, updated_at=?,
                  kitchen_at = case when ?='preparing' and kitchen_at is null then ? else kitchen_at end,
                  ready_at = case when ?='ready' then ? when ?='preparing' then null else ready_at end
                where id=?`)
      .run(a.p_status, t, a.p_status, t, a.p_status, t, a.p_status, a.p_order);
    return a.p_status;
  },

  /* ---------- motorristi ---------- */
  drv_ready(db, a) {
    needScreen(db, a.p_token, 'runs', 'Ky kod nuk e hap ekranin e motorristit.');
    const since = new Date(Date.now() - 12 * 3600e3).toISOString();
    return db.prepare(`select id,number,kind,customer_name,phone,address,lat,lng,
                              total,payment,note,ready_at
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
                                     total,payment,note,delivered_at,fail_reason
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

    const o = db.prepare('select run_id from orders where id=?').get(a.p_order);
    db.prepare('insert into run_points (id,run_id,order_id,kind,lat,lng,at) values (?,?,?,?,?,?,?)')
      .run(D.uuid(), o.run_id, a.p_order, 'delivered', a.p_lat, a.p_lng, t);

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
};

function httpErr(status, message) {
  const e = new Error(message);
  e.status = status;
  return e;
}

module.exports = { rest, RPC, httpErr, decode };
