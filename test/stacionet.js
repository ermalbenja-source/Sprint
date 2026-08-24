/* ============================================================================
   Kuzhina dhe furra e picës, kundër serverit lokal të vërtetë.
   Provon zinxhirin: menuja → ndarja → porosia e përzier → dy ekranet →
   porosia bëhet gati vetëm kur të dy stacionet e kanë dhënë.
   Nisje:  node test/stacionet.js [http://127.0.0.1:8787]
   ========================================================================== */
const B = process.argv[2] || 'http://127.0.0.1:8787';
const fs = require('fs');

let admin = '';
const H = (extra) => Object.assign(
  { 'Content-Type': 'application/json', apikey: 'local' },
  admin ? { Authorization: 'Bearer ' + admin } : {}, extra || {});

async function call(path, opt) {
  const r = await fetch(B + path, opt || {});
  const txt = await r.text();
  let body = null;
  try { body = txt ? JSON.parse(txt) : null; } catch (e) { body = txt; }
  if (!r.ok) throw new Error((body && body.message) || r.status + ' ' + txt.slice(0, 160));
  return body;
}
const rpc = (name, args) =>
  call('/rest/v1/rpc/' + name, { method: 'POST', headers: H(), body: JSON.stringify(args || {}) });

let fails = 0;
function ok(cond, msg, extra) {
  console.log((cond ? '  ✓ ' : '  ✗ ') + msg + (extra ? '  ' + extra : ''));
  if (!cond) fails++;
}

(async () => {
  /* ---------- hyrja e pronarit ---------- */
  const creds = fs.readFileSync(process.env.SPRINT_DATA + '/hyrja.txt', 'utf8');
  const email = (creds.match(/Email:\s*(\S+)/) || [])[1];
  const pass  = (creds.match(/Fjalëkalimi:\s*(\S+)/) || [])[1];
  const tok = await call('/auth/v1/token?grant_type=password', {
    method: 'POST', headers: { 'Content-Type': 'application/json', apikey: 'local' },
    body: JSON.stringify({ email, password: pass }) });
  admin = tok.access_token;

  console.log('\n═══ 1. MENUJA DHE NDARJA FILLESTARE ═══');
  await call('/rest/v1/menu_items?on_conflict=id', {
    method: 'POST', headers: H({ Prefer: 'resolution=merge-duplicates,return=minimal' }),
    body: JSON.stringify([
      { id: 'pz03', category: 'pizza', name_sq: 'Pica Margarita', price: 320, updated_at: new Date().toISOString() },
      { id: 'fs01', category: 'fast',  name_sq: 'Sufllaqe pule',  price: 250, updated_at: new Date().toISOString() },
      { id: 'tr01', category: 'trad',  name_sq: 'Tavë kosi',      price: 400, updated_at: new Date().toISOString() },
      { id: 'pj01', category: 'pije',  name_sq: 'Ujë 0.5L',        price: 60,  updated_at: new Date().toISOString() },
    ]) });
  const cats = await call('/rest/v1/category_stations?select=category,station', { headers: H() });
  const cmap = {}; cats.forEach((c) => { cmap[c.category] = c.station; });
  ok(cmap.pizza === 'oven', 'picat shkojnë te furra', JSON.stringify(cmap.pizza));
  ok(cmap.fast === 'oven', 'sanduiçët shkojnë te furra');
  ok(cmap.trad === 'kitchen', 'tavat shkojnë te kuzhina');
  ok(cmap.pije === 'none', 'pijet nuk gatuhen askund');

  console.log('\n═══ 2. STAFI ═══');
  // Pastrim: testi duhet të japë të njëjtin rezultat sa herë të niset.
  for (const n of ['Kuzhina Provë', 'Furra Provë', 'Andrea Provë']) {
    await call('/rest/v1/staff?name=eq.' + encodeURIComponent(n),
      { method: 'DELETE', headers: H() });
  }
  const mkStaff = async (name, role, pin) => {
    const rows = await call('/rest/v1/staff', {
      method: 'POST', headers: H({ Prefer: 'return=representation' }),
      body: JSON.stringify({ name, role, active: true }) });
    const id = (Array.isArray(rows) ? rows[0] : rows).id;
    await rpc('set_staff_pin', { p_staff_id: id, p_pin: pin });
    return id;
  };
  await mkStaff('Kuzhina Provë', 'kitchen', '1199');
  await mkStaff('Furra Provë', 'pizza', '1155');
  await mkStaff('Andrea Provë', 'driver', '4821');
  const login = async (pin, dev) => {
    const r = await rpc('staff_login', { p_pin: pin, p_device: dev });
    return (Array.isArray(r) ? r[0] : r).token;
  };
  const kTok = await login('1199', 'tablet-kuzhine');
  const oTok = await login('1155', 'tablet-furre');
  const dTok = await login('4821', 'moto');
  ok(!!kTok && !!oTok && !!dTok, 'të tre hynë me kodin e vet');

  const scr = (t) => rpc('my_screens', { p_token: t }).then((r) => (r[0] || r).screens);
  ok(JSON.stringify(await scr(kTok)) === '["kds"]', 'kuzhinieri sheh vetëm kuzhinën');
  ok(JSON.stringify(await scr(oTok)) === '["oven"]', 'piceri sheh vetëm furrën');

  console.log('\n═══ 3. POROSI E PËRZIER ═══');
  const ord = (await call('/rest/v1/orders', {
    method: 'POST', headers: H({ Prefer: 'return=representation' }),
    body: JSON.stringify([{
      kind: 'delivery', customer_name: 'Klient Provë', phone: '069 555 0101',
      address: 'Rruga Provë 5', status: 'accepted', payment: 'cash', total: 1030,
      note: 'pa qepë',
      items: [{ id: 'pz03', name: 'Pica Margarita', qty: 2, price: 320 },
              { id: 'tr01', name: 'Tavë kosi', qty: 1, price: 400 },
              { id: 'pj01', name: 'Ujë 0.5L', qty: 3, price: 60 }],
    }]) }))[0];

  const kds = async (t, s) => (await rpc('kds_orders', { p_token: t, p_station: s }))
    .find((o) => o.id === ord.id);
  const kOrd = await kds(kTok, 'kitchen');
  const oOrd = await kds(oTok, 'oven');
  ok(!!kOrd, 'kuzhina e sheh porosinë');
  ok(!!oOrd, 'furra e sheh të njëjtën porosi');

  const mine = (o, s) => (o.items || []).filter((x) => x.station === s).map((x) => x.name);
  ok(JSON.stringify(mine(kOrd, 'kitchen')) === '["Tavë kosi"]',
     'kuzhina ka vetëm tavën', JSON.stringify(mine(kOrd, 'kitchen')));
  ok(JSON.stringify(mine(oOrd, 'oven')) === '["Pica Margarita"]',
     'furra ka vetëm picën', JSON.stringify(mine(oOrd, 'oven')));
  ok(JSON.stringify(kOrd.need) === '["kitchen","oven"]', 'porosia u takon të dyve');
  ok(!(kOrd.items || []).some((x) => x.customer_name || x.phone), 'asnjë e dhënë e klientit te rreshtat');
  ok(!('phone' in kOrd) && !('address' in kOrd), 'ekrani i gatimit nuk merr telefon as adresë');

  console.log('\n═══ 4. GATI VETËM KUR TË DY E JAPIN ═══');
  const st = async () => (await call('/rest/v1/orders?select=status,station_ready&id=eq.' + ord.id,
    { headers: H() }))[0];
  let r1 = await rpc('kds_bump', { p_token: oTok, p_order: ord.id, p_status: 'ready', p_station: 'oven' });
  let s1 = await st();
  ok(r1 === 'preparing' && s1.status === 'preparing',
     'furra e dha, porosia ende JO gati', s1.status);
  ok(!!s1.station_ready.oven && !s1.station_ready.kitchen, 'shënohet vetëm furra');

  const drvBefore = await rpc('drv_ready', { p_token: dTok });
  ok(!drvBefore.some((o) => o.id === ord.id), 'motorristi ende nuk e sheh');

  let r2 = await rpc('kds_bump', { p_token: kTok, p_order: ord.id, p_status: 'ready', p_station: 'kitchen' });
  let s2 = await st();
  ok(r2 === 'ready' && s2.status === 'ready', 'të dy e dhanë → porosia GATI', s2.status);

  const drvAfter = await rpc('drv_ready', { p_token: dTok });
  ok(drvAfter.some((o) => o.id === ord.id), 'tani motorristi e sheh');

  console.log('\n═══ 5. KTHIMI MBRAPSHT ═══');
  await rpc('kds_bump', { p_token: oTok, p_order: ord.id, p_status: 'preparing', p_station: 'oven' });
  const s3 = await st();
  ok(s3.status === 'preparing' && !s3.station_ready.oven,
     'furra e kthen → porosia del nga «gati»', s3.status);
  ok(!!s3.station_ready.kitchen, 'kuzhina mban të vetën — nuk rigatuhet kot');

  console.log('\n═══ 6. KUFIJTË ═══');
  const refuz = async (msg, fn) => {
    try { await fn(); ok(false, msg + ' — NUK u refuzua'); }
    catch (e) { ok(true, msg, '(' + e.message.slice(0, 46) + ')'); }
  };
  await refuz('furra nuk e hap ekranin e kuzhinës',
    () => rpc('kds_orders', { p_token: oTok, p_station: 'kitchen' }));
  await refuz('kuzhinieri nuk e hap furrën',
    () => rpc('kds_orders', { p_token: kTok, p_station: 'oven' }));
  await refuz('motorristi nuk hap asnjë prej të dyjave',
    () => rpc('kds_orders', { p_token: dTok, p_station: 'oven' }));
  await refuz('gatimi nuk e shpall porosinë të dorëzuar',
    () => rpc('kds_bump', { p_token: kTok, p_order: ord.id, p_status: 'done', p_station: 'kitchen' }));

  console.log('\n═══ 7. POROSI VETËM ME PICË ═══');
  const p2 = (await call('/rest/v1/orders', {
    method: 'POST', headers: H({ Prefer: 'return=representation' }),
    body: JSON.stringify([{ kind: 'pickup', customer_name: 'Vetëm Picë', phone: '069 555 0202',
      status: 'accepted', total: 320,
      items: [{ id: 'pz03', name: 'Pica Margarita', qty: 1, price: 320 },
              { id: 'pj01', name: 'Ujë 0.5L', qty: 1, price: 60 }] }]) }))[0];
  ok(!(await rpc('kds_orders', { p_token: kTok, p_station: 'kitchen' })).some((o) => o.id === p2.id),
     'kuzhina nuk e sheh fare një porosi vetëm me picë');
  ok((await rpc('kds_orders', { p_token: oTok, p_station: 'oven' })).some((o) => o.id === p2.id),
     'furra e sheh');
  await rpc('kds_bump', { p_token: oTok, p_order: p2.id, p_status: 'ready', p_station: 'oven' });
  const s4 = (await call('/rest/v1/orders?select=status&id=eq.' + p2.id, { headers: H() }))[0];
  ok(s4.status === 'ready', 'një stacion i vetëm mjafton kur porosia është vetëm e tij', s4.status);

  console.log('\n═══ 8. PRONARI NDRYSHON NDARJEN ═══');
  await call('/rest/v1/menu_items?id=eq.fs01', {
    method: 'PATCH', headers: H({ Prefer: 'return=minimal' }),
    body: JSON.stringify({ station: 'kitchen' }) });
  const p3 = (await call('/rest/v1/orders', {
    method: 'POST', headers: H({ Prefer: 'return=representation' }),
    body: JSON.stringify([{ kind: 'pickup', customer_name: 'Sufllaqe', phone: '069 555 0303',
      status: 'accepted', total: 250,
      items: [{ id: 'fs01', name: 'Sufllaqe pule', qty: 1, price: 250 }] }]) }))[0];
  ok((await rpc('kds_orders', { p_token: kTok, p_station: 'kitchen' })).some((o) => o.id === p3.id),
     'përjashtimi për një pjatë e zhvendos atë te kuzhina');
  ok(!(await rpc('kds_orders', { p_token: oTok, p_station: 'oven' })).some((o) => o.id === p3.id),
     'furra nuk e sheh më');

  /* Pastrim edhe në dalje, jo vetëm në hyrje: kodet 1199/1155/4821 i përdorin
     edhe prova të tjera, dhe dy veta nuk mbajnë dot të njëjtin kod. */
  for (const n of ['Kuzhina Provë', 'Furra Provë', 'Andrea Provë']) {
    await call('/rest/v1/staff?name=eq.' + encodeURIComponent(n),
      { method: 'DELETE', headers: H() }).catch(() => {});
  }

  console.log(fails ? `\n✗ ${fails} dështime\n` : '\n═══ TË GJITHA KALUAN ═══\n');
  process.exit(fails ? 1 : 0);
})().catch((e) => { console.error('\nGABIM:', e.message); process.exit(1); });
