/* ============================================================================
   Magazina, blerjet, recetat dhe raportet — kundër serverit lokal të vërtetë.
   Zinxhiri: furnitor → artikull → blerje → pranim → gjendje → recetë →
   shitje → gjendja zbret → raporti i ditës.
       SPRINT_DATA=... node test/magazina.js [http://127.0.0.1:8787]
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
const rpc = (n, a) => call('/rest/v1/rpc/' + n,
  { method: 'POST', headers: H(), body: JSON.stringify(a || {}) });
const one = (r) => (Array.isArray(r) ? r[0] : r);

let fails = 0;
const ok = (c, m, x) => { console.log((c ? '  ✓ ' : '  ✗ ') + m + (x ? '  ' + x : '')); if (!c) fails++; };
const near = (a, b) => Math.abs(Number(a) - Number(b)) < 0.001;

(async () => {
  const creds = fs.readFileSync(process.env.SPRINT_DATA + '/hyrja.txt', 'utf8');
  admin = (await call('/auth/v1/token?grant_type=password', {
    method: 'POST', headers: { 'Content-Type': 'application/json', apikey: 'local' },
    body: JSON.stringify({ email: creds.match(/Email:\s*(\S+)/)[1],
                           password: creds.match(/Fjalëkalimi:\s*(\S+)/)[1] }) })).access_token;

  const level = async (id) =>
    one(await call('/rest/v1/stock_levels?select=*&id=eq.' + id, { headers: H() }));

  console.log('\n═══ 1. FURNITORI DHE ARTIKUJT ═══');
  // Çdo nisje përdor kodet e veta: artikujt me histori blerjeje nuk fshihen
  // dot — dhe kjo është e drejtë, ndaj testi nuk përpiqet t'i fshijë.
  const RUN = Date.now().toString(36).toUpperCase().slice(-5);
  const sup = one(await call('/rest/v1/suppliers', {
    method: 'POST', headers: H({ Prefer: 'return=representation' }),
    body: JSON.stringify({ name: 'Bloja ' + RUN, nipt: 'K12345678L', phone: '069 444 0001' }) }));
  ok(!!sup.id, 'furnitori u krijua');

  const mk = async (sku, name, unit, min, cost) => one(await call('/rest/v1/stock_items', {
    method: 'POST', headers: H({ Prefer: 'return=representation' }),
    body: JSON.stringify({ sku, name, unit, min_qty: min, cost }) }));
  const miell  = await mk('MIELL-' + RUN, 'Miell tip 00', 'kg', 20, 55);
  const djathe = await mk('DJATHE-' + RUN, 'Djathë mocarela', 'kg', 5, 900);
  const kuti   = await mk('KUTI-' + RUN, 'Kuti pice 32cm', 'copë', 50, 22);

  const l0 = await level(miell.id);
  ok(near(l0.qty, 0), 'artikulli i ri nis nga zero', 'qty=' + l0.qty);
  ok(l0.low === true, 'shënohet si «po mbaron» sepse 0 ≤ kufiri', 'low=' + l0.low);

  console.log('\n═══ 2. BLERJA ═══');
  const pur = one(await call('/rest/v1/purchases', {
    method: 'POST', headers: H({ Prefer: 'return=representation' }),
    body: JSON.stringify({ supplier_id: sup.id, date: new Date().toISOString().slice(0, 10),
                           doc_ref: '2026/114', status: 'draft' }) }));
  await call('/rest/v1/purchase_lines', {
    method: 'POST', headers: H({ Prefer: 'return=minimal' }),
    body: JSON.stringify([
      { purchase_id: pur.id, item_id: miell.id,  qty: 100, unit_cost: 58, total: 5800 },
      { purchase_id: pur.id, item_id: djathe.id, qty: 20,  unit_cost: 950, total: 19000 },
      { purchase_id: pur.id, item_id: kuti.id,   qty: 500, unit_cost: 20, total: 10000 },
    ]) });
  ok(near((await level(miell.id)).qty, 0), 'skica nuk prek magazinën ende');

  const n = await rpc('receive_purchase', { p_id: pur.id });
  ok(Number(n) === 3, 'pranimi krijoi tri hyrje', 'n=' + n);
  const l1 = await level(miell.id);
  ok(near(l1.qty, 100), 'gjendja u rrit', 'qty=' + l1.qty);
  ok(near(l1.cost, 58), 'kostoja mori çmimin e fundit të blerë', 'cost=' + l1.cost);
  ok(near(l1.value, 5800), 'vlera e magazinës u llogarit', 'value=' + l1.value);
  ok(l1.low === false, 'nuk është më «po mbaron»');

  const again = await rpc('receive_purchase', { p_id: pur.id });
  ok(Number(again) === 0 && near((await level(miell.id)).qty, 100),
     'pranimi i dytë nuk e fut faturën dy herë', 'n=' + again);

  console.log('\n═══ 3. LËVIZJET ME DORË ═══');
  ok(near(await rpc('stock_adjust', { p_item: miell.id, p_qty: 5, p_kind: 'waste',
                                      p_note: 'ra thesi' }), 95), 'prishja zbret gjithmonë');
  ok(near(await rpc('stock_adjust', { p_item: miell.id, p_qty: -7, p_kind: 'out' }), 88),
     'dalja zbret edhe kur numri shkruhet me minus');
  ok(near(await rpc('stock_adjust', { p_item: miell.id, p_qty: 3, p_kind: 'in' }), 91),
     'hyrja shton');
  ok(near(await rpc('stock_adjust', { p_item: miell.id, p_qty: 84, p_kind: 'count' }), 84),
     'numërimi e barazon me atë që u gjet në raft');

  const mv = await call('/rest/v1/stock_moves?select=kind,qty&item_id=eq.' + miell.id
    + '&order=at.desc&limit=1', { headers: H() });
  ok(mv[0].kind === 'count' && near(mv[0].qty, -7),
     'numërimi la gjurmë si rresht i ri, jo si fshirje', JSON.stringify(mv[0]));

  let refuz = false;
  try { await rpc('stock_adjust', { p_item: miell.id, p_qty: 1, p_kind: 'hajde' }); }
  catch (e) { refuz = true; }
  ok(refuz, 'lloji i panjohur i lëvizjes refuzohet');

  console.log('\n═══ 4. RECETA ZBRET GJENDJEN ═══');
  await call('/rest/v1/menu_items?on_conflict=id', {
    method: 'POST', headers: H({ Prefer: 'resolution=merge-duplicates,return=minimal' }),
    body: JSON.stringify([{ id: 'pz03', category: 'pizza', name_sq: 'Pica Margarita',
                            price: 320, updated_at: new Date().toISOString() }]) });
  await call('/rest/v1/recipes?menu_item_id=eq.pz03', { method: 'DELETE', headers: H() });
  await call('/rest/v1/recipes', {
    method: 'POST', headers: H({ Prefer: 'return=minimal' }),
    body: JSON.stringify([
      { menu_item_id: 'pz03', stock_item_id: miell.id,  qty: 0.25 },
      { menu_item_id: 'pz03', stock_item_id: djathe.id, qty: 0.15 },
      { menu_item_id: 'pz03', stock_item_id: kuti.id,   qty: 1 },
    ]) });

  const ord = one(await call('/rest/v1/orders', {
    method: 'POST', headers: H({ Prefer: 'return=representation' }),
    body: JSON.stringify([{ kind: 'delivery', customer_name: 'Klient Magazine',
      phone: '069 555 7001', address: 'Rruga e Provës 1', status: 'done',
      payment: 'cash', total: 1280, channel: 'phone',
      items: [{ id: 'pz03', name: 'Pica Margarita', qty: 4, price: 320 }] }]) }));

  const used = await rpc('consume_stock_for_order', { p_order_id: ord.id });
  ok(Number(used) === 3, 'u zbritën tre përbërës', 'n=' + used);
  ok(near((await level(miell.id)).qty, 83), 'miell: 84 − 4×0.25 = 83',
     'qty=' + (await level(miell.id)).qty);
  ok(near((await level(djathe.id)).qty, 19.4), 'djathë: 20 − 4×0.15 = 19.4');
  ok(near((await level(kuti.id)).qty, 496), 'kuti: 500 − 4 = 496');

  const twice = await rpc('consume_stock_for_order', { p_order_id: ord.id });
  ok(Number(twice) === 0 && near((await level(kuti.id)).qty, 496),
     'e njëjta porosi nuk zbret dy herë');

  console.log('\n═══ 5. RAPORTI I DITËS ═══');
  // Baza mund të mbajë porosi nga testet e tjera, ndaj matet ndryshimi që
  // solli kjo porosi — jo shuma e përgjithshme e ditës.
  const day = one(await rpc('report_day', {}));
  ok(Number(day.orders_count) >= 1, 'porosia u numërua', 'n=' + day.orders_count);
  ok(near(day.revenue, Number(day.cash) + Number(day.card)),
     'xhiroja është shuma e arkës dhe e kartës', L(day.revenue));
  ok(Number(day.phone_count) >= 1, 'kanali u dallua', 'telefon=' + day.phone_count);

  const before = one(await rpc('report_day', {}));

  // porosi e anuluar nuk numërohet si xhiro
  await call('/rest/v1/orders', {
    method: 'POST', headers: H({ Prefer: 'return=minimal' }),
    body: JSON.stringify([{ kind: 'pickup', customer_name: 'E anuluar', phone: '069 555 7002',
      status: 'cancelled', payment: 'cash', total: 9999, channel: 'web',
      items: [{ id: 'pz03', name: 'Pica Margarita', qty: 1, price: 320 }] }]) });
  const day2 = one(await rpc('report_day', {}));
  ok(near(day2.revenue, before.revenue), 'porosia e anuluar nuk e ndryshoi xhiron',
     L(before.revenue) + ' → ' + L(day2.revenue));
  ok(Number(day2.cancelled_count) === Number(before.cancelled_count) + 1,
     'por u numërua si e anuluar');
  ok(Number(day2.orders_count) === Number(before.orders_count),
     'dhe nuk u numërua si porosi');

  const items = await rpc('report_items', { p_from: new Date().toISOString().slice(0, 10),
                                            p_to: new Date().toISOString().slice(0, 10) });
  const pz = items.find((x) => x.item_id === 'pz03');
  ok(pz && Number(pz.qty) >= 4 && near(pz.revenue, Number(pz.qty) * 320),
     'pjata u nxor me sasi dhe xhiro që përputhen', JSON.stringify(pz));
  ok(pz && pz.station === 'oven', 'raporti e di se pica del nga furra', pz && pz.station);

  const range = await rpc('report_range', {
    p_from: new Date(Date.now() - 6 * 864e5).toISOString().slice(0, 10),
    p_to: new Date().toISOString().slice(0, 10) });
  const last = range[range.length - 1];
  ok(range.length >= 1 && String(last.day).slice(0, 10) === new Date().toISOString().slice(0, 10)
     && near(last.revenue, day2.revenue),
     'shtatë ditët e fundit përputhen me raportin e ditës', JSON.stringify(last));

  console.log(fails ? `\n✗ ${fails} dështime\n` : '\n═══ TË GJITHA KALUAN ═══\n');
  process.exit(fails ? 1 : 0);

  function L(v) { return String(Math.round(Number(v) * 100) / 100); }
})().catch((e) => { console.error('\nGABIM:', e.message); process.exit(1); });
