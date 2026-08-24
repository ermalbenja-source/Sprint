/* ============================================================================
   Fshirja e të dhënave, kundër serverit lokal të vërtetë.
   Provon se fjala FSHIJ është vërtet e detyrueshme, se secila shkallë fshin
   saktësisht atë që premton, se llogaria e hyrjes nuk preket, dhe se programi
   punon normalisht menjëherë pas fshirjes.
   Nisje:  node test/fshirja.js [http://127.0.0.1:8787]
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
const rpc = (name, args, hdr) =>
  call('/rest/v1/rpc/' + name, { method: 'POST', headers: hdr || H(), body: JSON.stringify(args || {}) });

const sa = async (tabela) =>
  (await call('/rest/v1/' + tabela + '?select=id', { headers: H() }) || []).length;

let fails = 0;
function ok(cond, msg, extra) {
  console.log((cond ? '  ✓ ' : '  ✗ ') + msg + (extra ? '  ' + extra : ''));
  if (!cond) fails++;
}

(async () => {
  const creds = fs.readFileSync(process.env.SPRINT_DATA + '/hyrja.txt', 'utf8');
  const email = (creds.match(/Email:\s*(\S+)/) || [])[1];
  const pass  = (creds.match(/Fjalëkalimi:\s*(\S+)/) || [])[1];
  const hyr = () => call('/auth/v1/token?grant_type=password', {
    method: 'POST', headers: { 'Content-Type': 'application/json', apikey: 'local' },
    body: JSON.stringify({ email, password: pass }) });
  admin = (await hyr()).access_token;

  /* ---------- mbush bazën me diçka për të fshirë ---------- */
  console.log('\n═══ 1. PËRGATITJA ═══');
  await call('/rest/v1/menu_items', { method: 'POST', headers: H(),
    body: JSON.stringify([
      { id: 'w-pica', category: 'pizza', name_sq: 'Pica Prove', price: 700, updated_at: new Date().toISOString() },
      { id: 'w-tave', category: 'trad', name_sq: 'Tavë Prove', price: 400, updated_at: new Date().toISOString() }]) });
  const [s1] = await call('/rest/v1/staff', { method: 'POST', headers: H({ Prefer: 'return=representation' }),
    body: JSON.stringify({ name: 'Fshirje Provë', role: 'driver', active: true }) });
  await rpc('set_staff_pin', { p_staff_id: s1.id, p_pin: '515151' });
  for (let i = 1; i <= 3; i++) {
    await call('/rest/v1/orders', { method: 'POST', headers: H(),
      body: JSON.stringify([{ kind: 'delivery', customer_name: 'Klient ' + i, phone: '069 900 000' + i,
        address: 'Rruga e Provës ' + i, total: 700,
        items: [{ id: 'w-pica', name: 'Pica Prove', qty: 1, price: 700 }] }]) });
  }
  await call('/rest/v1/customers', { method: 'POST', headers: H(),
    body: JSON.stringify([{ phone: '069 900 0009', name: 'Klient i Ruajtur' }]) });
  ok((await sa('orders')) >= 3, 'porositë u krijuan', (await sa('orders')) + ' porosi');
  ok((await sa('menu_items')) >= 2, 'menuja u mbush');
  ok((await sa('staff')) >= 1, 'stafi u krijua');

  /* ---------- fjala duhet të jetë e saktë ---------- */
  console.log('\n═══ 2. FJALA FSHIJ ËSHTË E DETYRUESHME ═══');
  for (const fjala of ['fshij', 'Fshij', 'FSHIJ ', '', 'FSHI', 'DELETE']) {
    let kaloi = false;
    try { await rpc('wipe_data', { p_confirm: fjala }); kaloi = true; } catch (e) { /* pritet */ }
    ok(!kaloi, 'u refuzua «' + fjala + '»');
  }
  ok((await sa('orders')) >= 3, 'asnjë porosi nuk u prek nga provat e gabuara');

  let ndaluar = false;
  try { await rpc('wipe_data', { p_confirm: 'FSHIJ', p_scope: 'gjithe-fare' }); }
  catch (e) { ndaluar = true; }
  ok(ndaluar, 'shkallë e panjohur refuzohet');

  console.log('\n═══ 3. PA HYRJE NUK FSHIHET ═══');
  let publike = false;
  try {
    await rpc('wipe_data', { p_confirm: 'FSHIJ' },
              { 'Content-Type': 'application/json', apikey: 'local' });
    publike = true;
  } catch (e) { /* pritet */ }
  ok(!publike, 'kërkesa pa hyrje nuk e fshin bazën');
  ok((await sa('orders')) >= 3, 'porositë janë ende aty');

  /* ---------- shkalla e parë ---------- */
  console.log('\n═══ 4. FSHIRJA E LËVIZJEVE ═══');
  const n1 = await rpc('wipe_data', { p_confirm: 'FSHIJ', p_scope: 'levizjet' });
  const r1 = Array.isArray(n1) ? n1[0] : n1;
  console.log('   ' + JSON.stringify(r1));
  ok((await sa('orders')) === 0, 'porositë u fshinë');
  ok((await sa('customers')) === 0, 'klientët u fshinë');
  ok((await sa('runs')) === 0, 'nisjet u fshinë');
  ok((await sa('menu_items')) >= 2, 'menuja MBETI', (await sa('menu_items')) + ' pjata');
  ok((await sa('staff')) >= 1, 'stafi MBETI');
  ok((await sa('zones')) > 0, 'zonat MBETËN');
  ok((await sa('order_phases')) === 7, 'fazat MBETËN');

  console.log('\n═══ 5. LLOGARIA E HYRJES NUK PREKET ═══');
  let hyri = false;
  try { await hyr(); hyri = true; } catch (e) { /* s\'duhet */ }
  ok(hyri, 'pronari hyn ende me të njëjtin email dhe fjalëkalim');

  console.log('\n═══ 6. PROGRAMI PUNON MENJËHERË PAS FSHIRJES ═══');
  const [p] = await call('/rest/v1/orders', { method: 'POST', headers: H({ Prefer: 'return=representation' }),
    body: JSON.stringify([{ kind: 'delivery', customer_name: 'Pas Fshirjes', phone: '069 900 1111',
      address: 'Plazh, pallati 2', total: 700,
      items: [{ id: 'w-pica', name: 'Pica Prove', qty: 1, price: 700 }] }]) });
  ok(!!p && !!p.number, 'porosia e re u regjistrua', '#' + (p && p.number));
  ok(p && p.number === 1000, 'numërimi nisi nga 1000, jo nga aty ku mbeti', '#' + (p && p.number));
  ok(!!(p && p.token), 'kodi i gjurmimit u dha');
  ok(!!(p && p.zone), 'zona u caktua ende', p && p.zone);
  const staf = await rpc('staff_login', { p_pin: '515151', p_device: 'pas-fshirjes' },
                         { 'Content-Type': 'application/json', apikey: 'local' });
  ok(!!(Array.isArray(staf) ? staf[0] : staf).token, 'kodi i stafit punon ende');

  /* ---------- shkalla e dytë ---------- */
  console.log('\n═══ 7. FSHIRJA E PLOTË ═══');
  const n2 = await rpc('wipe_data', { p_confirm: 'FSHIJ', p_scope: 'gjithcka' });
  const r2 = Array.isArray(n2) ? n2[0] : n2;
  console.log('   ' + JSON.stringify(r2));
  ok((await sa('menu_items')) === 0, 'menuja u fshi');
  ok((await sa('staff')) === 0, 'stafi u fshi');
  ok((await sa('stock_items')) === 0, 'magazina u fshi');
  ok((await sa('zones')) > 0, 'zonat MBETËN edhe këtu');
  ok((await sa('order_phases')) === 7, 'fazat MBETËN edhe këtu');
  ok((await sa('role_screens')) > 0, 'tabela e lejeve MBETI');

  let hyri2 = false;
  try { await hyr(); hyri2 = true; } catch (e) { /* s\'duhet */ }
  ok(hyri2, 'edhe pas fshirjes së plotë, pronari hyn');

  console.log(fails ? '\n  ' + fails + ' provë(a) dështuan\n' : '\n  Të gjitha kaluan.\n');
  process.exit(fails ? 1 : 0);
})().catch((e) => { console.error('\n  Gabim:', e.message, '\n'); process.exit(1); });
