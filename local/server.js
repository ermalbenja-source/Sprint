#!/usr/bin/env node
/* ============================================================================
   SPRINT — Serveri lokal.
   Ngre programin mbi kompjuterin e dyqanit. Tableti i kuzhinës dhe telefonat e
   motorristëve lidhen me të njëjtin WiFi dhe shohin të njëjtat porosi.

   Pa asnjë varësi të jashtme — vetëm Node 22 dhe SQLite që vjen brenda tij.

   Përdorimi:  node local/server.js
   ========================================================================== */
'use strict';
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const crypto = require('node:crypto');
const D = require('./db');
const API = require('./api');

const ROOT = path.join(__dirname, '..');
const WEB = path.join(ROOT, 'dist');
const DATA = process.env.SPRINT_DATA || path.join(__dirname, 'te-dhenat');
const PORT = Number(process.env.SPRINT_PORT || 8787);

const db = D.open(path.join(DATA, 'sprint.db'));

/* ── llogaria e parë e pronarit ────────────────────────────────────────────
   Krijohet vetëm një herë. Fjalëkalimi shkruhet në ekran e në një skedar,
   që të mos humbasë, dhe ndryshohet nga paneli. */
function ensureOwner() {
  const n = db.prepare('select count(*) as n from users').get().n;
  if (n) return null;
  const email = process.env.SPRINT_EMAIL || 'pronar@sprint.local';
  const pass = process.env.SPRINT_PASS || crypto.randomBytes(5).toString('hex');
  db.prepare('insert into users (id,email,pass_hash,created_at) values (?,?,?,?)')
    .run(D.uuid(), email, D.hash(pass), D.now());
  const sid = D.uuid();
  db.prepare(`insert into staff (id,name,role,active,created_at,updated_at)
              values (?,?,?,1,?,?)`).run(sid, 'Pronari', 'owner', D.now(), D.now());
  fs.writeFileSync(path.join(DATA, 'hyrja.txt'),
    `Paneli hapet te /admin\n\nEmail: ${email}\nFjalëkalimi: ${pass}\n\n`
    + `Ndryshoje nga paneli sapo të hysh herën e parë.\n`);
  return { email, pass };
}
const created = ensureOwner();

/* ── sesionet e panelit ── */
function login(email, pass) {
  const u = db.prepare('select * from users where lower(email)=lower(?)').get(String(email || '').trim());
  if (!u || !D.verify(pass, u.pass_hash)) throw API.httpErr(400, 'Email ose fjalëkalim i gabuar.');
  const token = D.uuid();
  db.prepare('insert into sessions (token,user_id,created_at,expires_at) values (?,?,?,?)')
    .run(token, u.id, D.now(), new Date(Date.now() + 30 * 864e5).toISOString());
  return { access_token: token, refresh_token: token, token_type: 'bearer',
           expires_in: 2592000, user: { id: u.id, email: u.email } };
}
const isAdmin = (token) => !!db.prepare('select 1 from sessions where token=? and expires_at>?')
  .get(String(token || ''), D.now());

/* ── skedarët statikë ── */
const MIME = { '.html':'text/html; charset=utf-8', '.js':'text/javascript; charset=utf-8',
  '.css':'text/css; charset=utf-8', '.json':'application/json; charset=utf-8',
  '.png':'image/png', '.jpg':'image/jpeg', '.jpeg':'image/jpeg', '.webp':'image/webp',
  '.svg':'image/svg+xml', '.ico':'image/x-icon', '.txt':'text/plain; charset=utf-8' };

/* Faqja është e njëjta si ajo online; kjo shenjë e vetme i thotë se baza
   është këtu, jo te Supabase. Shtohet gjatë shërbimit, që dist të mbetet një. */
function markLocal(buf) {
  const html = buf.toString('utf8');
  return Buffer.from(html.replace('<script>', '<script>window.SPRINT_LOCAL=true;</script>\n<script>'));
}

function serveStatic(req, res, urlPath) {
  let rel = decodeURIComponent(urlPath.split('?')[0]);
  if (rel.endsWith('/')) rel += 'index.html';
  const file = path.join(WEB, rel);
  // Asnjë dalje jashtë dosjes së faqes.
  if (!file.startsWith(WEB)) { res.writeHead(403).end('Ndalohet'); return; }
  fs.readFile(file, (err, buf) => {
    if (err) {
      const idx = path.join(WEB, rel, 'index.html');
      if (idx.startsWith(WEB) && fs.existsSync(idx)) {
        res.writeHead(200, { 'Content-Type': MIME['.html'] }).end(markLocal(fs.readFileSync(idx)));
        return;
      }
      res.writeHead(404, { 'Content-Type': MIME['.html'] })
         .end('<p style="font:16px system-ui;padding:2rem">Faqja nuk u gjet.</p>');
      return;
    }
    res.writeHead(200, {
      'Content-Type': MIME[path.extname(file)] || 'application/octet-stream',
      'Cache-Control': /\/(admin|staf)\//.test(rel) ? 'no-store' : 'no-cache',
    }).end(path.extname(file) === '.html' ? markLocal(buf) : buf);
  });
}

/* ── ndihmësa ── */
const json = (res, code, body) => {
  const s = JSON.stringify(body === undefined ? null : body);
  res.writeHead(code, { 'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': Buffer.byteLength(s) }).end(s);
};
function readBody(req) {
  return new Promise((resolve, reject) => {
    let n = 0; const parts = [];
    req.on('data', (c) => {
      n += c.length;
      if (n > 2e6) { reject(API.httpErr(413, 'Kërkesa është shumë e madhe.')); req.destroy(); return; }
      parts.push(c);
    });
    req.on('end', () => {
      const raw = Buffer.concat(parts).toString('utf8');
      if (!raw) return resolve(null);
      try { resolve(JSON.parse(raw)); } catch (e) { reject(API.httpErr(400, 'JSON i pavlefshëm.')); }
    });
    req.on('error', reject);
  });
}

/* Funksionet që i hap kushdo — klienti që gjurmon porosinë dhe pajisja që
   hyn me kod. Gjithçka tjetër kërkon sesion admini. */
const PUBLIC_RPC = ['track_order','find_orders_by_phone','public_phases',
                    'staff_login','staff_by_token','staff_logout','my_screens',
                    'kds_orders','kds_bump',
                    'drv_ready','drv_start_run','drv_my_run','drv_delivered',
                    'drv_failed','drv_my_day'];
const PUBLIC_READ = ['menu_items','settings','order_phases'];

const server = http.createServer(async (req, res) => {
  const u = new URL(req.url, 'http://x');
  const p = u.pathname;

  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'authorization,apikey,content-type,prefer',
      'Access-Control-Allow-Methods': 'GET,POST,PATCH,DELETE,OPTIONS',
    }).end();
    return;
  }
  res.setHeader('Access-Control-Allow-Origin', '*');

  try {
    /* ---------- hyrja e panelit ---------- */
    if (p === '/auth/v1/token') {
      const body = await readBody(req);
      return json(res, 200, login(body && body.email, body && body.password));
    }
    if (p === '/auth/v1/logout') {
      const t = (req.headers.authorization || '').replace(/^Bearer\s+/i, '');
      db.prepare('delete from sessions where token=?').run(t);
      return json(res, 204, null);
    }
    if (p === '/auth/v1/user') {
      const t = (req.headers.authorization || '').replace(/^Bearer\s+/i, '');
      const r = db.prepare(`select u.id, u.email from sessions s join users u on u.id=s.user_id
                            where s.token=? and s.expires_at>?`).get(t, D.now());
      if (!r) return json(res, 401, { message: 'Sesioni skadoi.' });
      return json(res, 200, r);
    }
    /* Ndryshimi i fjalëkalimit të pronarit. */
    if (p === '/auth/v1/password' && req.method === 'POST') {
      const t = (req.headers.authorization || '').replace(/^Bearer\s+/i, '');
      if (!isAdmin(t)) return json(res, 401, { message: 'Hyr së pari.' });
      const body = await readBody(req);
      if (!body || String(body.password || '').length < 8) {
        return json(res, 400, { message: 'Fjalëkalimi duhet të paktën 8 shenja.' });
      }
      const uid = db.prepare('select user_id from sessions where token=?').get(t).user_id;
      db.prepare('update users set pass_hash=? where id=?').run(D.hash(body.password), uid);
      return json(res, 200, { ok: true });
    }

    /* ---------- funksionet ---------- */
    if (p.startsWith('/rest/v1/rpc/')) {
      const name = p.slice('/rest/v1/rpc/'.length);
      const fn = API.RPC[name];
      if (!fn) return json(res, 404, { message: 'Funksion i panjohur: ' + name });
      const t = (req.headers.authorization || '').replace(/^Bearer\s+/i, '');
      if (PUBLIC_RPC.indexOf(name) < 0 && !isAdmin(t)) {
        return json(res, 401, { message: 'Kjo kërkon hyrje.' });
      }
      const body = await readBody(req);
      return json(res, 200, fn(db, body || {}));
    }

    /* ---------- tabelat ---------- */
    if (p.startsWith('/rest/v1/')) {
      const table = p.slice('/rest/v1/'.length);
      const t = (req.headers.authorization || '').replace(/^Bearer\s+/i, '');
      const admin = isAdmin(t);
      const readOnlyPublic = req.method === 'GET' && PUBLIC_READ.indexOf(table) >= 0;
      const anonInsert = req.method === 'POST' && ['orders','bookings'].indexOf(table) >= 0;
      if (!admin && !readOnlyPublic && !anonInsert) {
        return json(res, 401, { message: 'Kjo kërkon hyrje.' });
      }
      const body = await readBody(req);
      const out = API.rest(db, req.method, table, u.searchParams, body, req.headers);
      return json(res, out === null ? 204 : 200, out);
    }

    /* ---------- gjendja ---------- */
    if (p === '/api/health') {
      return json(res, 200, { ok: true, mode: 'local',
        orders: db.prepare('select count(*) as n from orders').get().n });
    }

    serveStatic(req, res, p);
  } catch (e) {
    json(res, e.status || 500, { message: e.message || 'Gabim i brendshëm.' });
  }
});

/* ── adresat në rrjetin e dyqanit ── */
function addresses() {
  const out = [];
  const nets = os.networkInterfaces();
  Object.keys(nets).forEach((k) => (nets[k] || []).forEach((n) => {
    if (n.family === 'IPv4' && !n.internal) out.push(n.address);
  }));
  return out;
}

server.listen(PORT, () => {
  const ips = addresses();
  console.log('\n  SPRINT — programi i dyqanit\n');
  console.log('  Mbi këtë kompjuter:  http://localhost:' + PORT);
  ips.forEach((ip) => console.log('  Nga tableti/telefoni: http://' + ip + ':' + PORT));
  console.log('\n  Faqja      /            Paneli  /admin');
  console.log('  Stafi      /staf         (kuzhina dhe motorristët, me kod)');
  console.log('\n  Të dhënat: ' + path.join(DATA, 'sprint.db'));
  if (created) {
    console.log('\n  ── Llogaria e parë u krijua ──');
    console.log('  Email:       ' + created.email);
    console.log('  Fjalëkalimi: ' + created.pass);
    console.log('  (ruajtur edhe te ' + path.join(DATA, 'hyrja.txt') + ')');
  }
  console.log('\n  Për ta ndalur: Ctrl+C\n');
});

process.on('SIGINT', () => { console.log('\n  U ndal. Të dhënat janë të ruajtura.\n'); process.exit(0); });
