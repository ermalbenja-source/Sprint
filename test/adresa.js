/* ============================================================================
   Adresa e vërtetë e klientit, nga fillimi në fund.

       «Rruga Juba Isha këneta banes private pranë klinikës shëndetësore»

   Kjo adresë nuk gjendej: fjala shkruhet «këneta» (e shquar), ndërsa fjala
   kyçe ishte «kënetë» (e pashquar). Dhe edhe me zonën e gjetur, mbetej pa pikë
   mbi hartë — sepse vendndodhësi i vërtetë është klinika, jo rruga.
       SPRINT_DATA=... node test/adresa.js [http://127.0.0.1:8787]
   ========================================================================== */
const { chromium } = require('playwright');
const fs = require('fs');
const B = process.argv[2] || 'http://127.0.0.1:8787';
const out = '/tmp/claude-0/-home-user-Sprint/c53b462c-5ae8-5e47-bcb5-d1a2a85c1602/scratchpad/';
const creds = fs.readFileSync(process.env.SPRINT_DATA + '/hyrja.txt', 'utf8');

const ADRESA = 'Rruga Juba Isha këneta banes private pranë klinikës shëndetësore';

let fails = 0;
const ok = (c, m, x) => { console.log((c ? '  ✓ ' : '  ✗ ') + m + (x ? '  ' + x : '')); if (!c) fails++; };

(async () => {
  const b = await chromium.launch();
  const p = await (await b.newContext({ viewport: { width: 1280, height: 1000 } })).newPage();
  const errs = [];
  p.on('pageerror', (e) => errs.push('ERR ' + e.message));
  p.on('dialog', (d) => d.accept());
  await p.route('**/tile.openstreetmap.org/**', (r) => r.abort());

  await p.goto(B + '/admin/', { waitUntil: 'load' });
  await p.fill('#em', creds.match(/Email:\s*(\S+)/)[1]);
  await p.fill('#pw', creds.match(/Fjalëkalimi:\s*(\S+)/)[1]);
  await p.click('#loginBtn'); await p.waitForTimeout(2200);
  await p.click('[data-tab=zone]'); await p.waitForTimeout(1600);

  console.log('\n═══ 1. FORMAT E FJALËS ═══');
  const forma = await p.evaluate((a) => {
    const s = SPRINT.store;
    return {
      rrenja: s.stemSq('kënetë'),
      eShquar: s.kwHit(a, 'kënetë'),
      variantet: ['Këneta, pallati 3', 'te kënetës', 'Kenete afër urës', 'KËNETA']
        .map((x) => [x, !!s.kwHit(x, 'kënetë')]),
      gabime: ['raporti i ditës', 'transporti', 'sporti']
        .map((x) => [x, !!s.kwHit(x, 'port')]),
    };
  }, ADRESA);
  console.log('   rrënja e «kënetë»:', forma.rrenja);
  ok(forma.eShquar === 'keneta', 'adresa jote kapet nga «kënetë»', forma.eShquar);
  forma.variantet.forEach(([x, hit]) => ok(hit, 'kapet edhe: ' + x));
  forma.gabime.forEach(([x, hit]) => ok(!hit, '«port» NUK e kap më: ' + x));

  console.log('\n═══ 2. ZONA ═══');
  await p.fill('#ztest', ADRESA); await p.waitForTimeout(500);
  const prova1 = await p.evaluate(() => document.querySelector('#ztestOut').textContent.trim());
  console.log('   provoje →', prova1);
  ok(/Kënetë/.test(prova1), 'zona doli Kënetë');
  ok(/pa pikë referimi/.test(prova1), 'por ende pa pikë mbi hartë — kjo është pjesa e dytë');

  console.log('\n═══ 3. MOTORRISTI RUAN KLINIKËN ═══');
  const pin = String(60000 + (Date.now() % 20000));
  await p.evaluate(async (pin) => {
    const s = SPRINT.store;
    const r = await s.saveStaff({ name: 'Motorrist Adrese', role: 'driver' });
    await s.setStaffPin((Array.isArray(r) ? r[0] : r).id, pin);
  }, pin);

  const mob = await b.newContext({ viewport: { width: 430, height: 900 },
    permissions: ['geolocation'], geolocation: { latitude: 41.3148, longitude: 19.4622, accuracy: 14 } });
  const q = await mob.newPage();
  q.on('pageerror', (e) => errs.push('ERR-staf ' + e.message));
  await q.goto(B + '/staf/', { waitUntil: 'load' }); await q.waitForTimeout(900);
  for (const ch of pin) await q.click(`[data-k="${ch}"]`);
  await q.click('[data-k=ok]'); await q.waitForTimeout(2000);

  // porosia e parë — pa pikë, sepse libri është bosh
  const e1 = await p.evaluate(async (a) => {
    const r = await SPRINT.store.createOrder({
      kind: 'delivery', name: 'Klienti i Kënetës', phone: '069 700 5555', address: a,
      items: [{ id: 'pz03', c: 'pizza', name: 'Picë', qty: 1, price: 320 }],
      subtotal: 320, total: 320, channel: 'phone', payment: 'cash' });
    await SPRINT.store.updateOrder(r.id, { status: 'ready' });
    return { nr: r.number, zona: r.zone, pika: r.landmark || null, lat: r.lat || null };
  }, ADRESA);
  console.log('   porosia e parë:', JSON.stringify(e1));
  ok(e1.zona === 'Kënetë', 'porosia e parë e ka zonën');
  ok(!e1.lat, 'por ende pa pikë — askush nuk e ka shkelur atë vend');

  // motorristi shkon, dorëzon, dhe e ruan klinikën me një prekje
  await q.click('#refBtn'); await q.waitForTimeout(1400);
  const items = await q.$$('#v-runs [data-pickit]');
  await items[0].click(); await q.waitForTimeout(400);
  await q.click('#goRun'); await q.waitForTimeout(2200);
  await q.click('[data-deliver]'); await q.waitForTimeout(700);

  ok(await q.evaluate(() => !!document.querySelector('#dlvLmOn')), 'dritarja ka kutinë e pikës');
  await q.check('#dlvLmOn'); await q.waitForTimeout(400);
  ok(await q.evaluate(() => !document.querySelector('#dlvLmName').classList.contains('hide')),
     'kutia e emrit shfaqet vetëm kur zgjidhet');
  await q.fill('#dlvLmName', 'Klinika shëndetësore Kënetë');
  await q.screenshot({ path: out + 'ad-dlv.png' });
  await q.click('#dlvOk'); await q.waitForTimeout(2500);

  const pikat = await p.evaluate(() => SPRINT.store.fetchLandmarks());
  console.log('   libri tani:', pikat.map((x) => x.name + ' @ '
    + Number(x.lat).toFixed(4) + ',' + Number(x.lng).toFixed(4)).join(' · '));
  ok(pikat.length >= 1, 'pika u ruajt me një prekje');
  ok(Math.abs(Number(pikat[0].lat) - 41.3148) < 0.001, 'në vendin ku ishte motorristi');

  console.log('\n═══ 4. POROSIA TJETËR E NJEH VENDIN ═══');
  const e2 = await p.evaluate(async (a) => {
    const r = await SPRINT.store.createOrder({
      kind: 'delivery', name: 'Klient tjetër', phone: '069 700 6666', address: a,
      items: [{ id: 'pz03', c: 'pizza', name: 'Picë', qty: 1, price: 320 }],
      subtotal: 320, total: 320, channel: 'phone', payment: 'cash' });
    return { nr: r.number, zona: r.zone, pika: r.landmark || null,
             lat: r.lat, lng: r.lng, saktesia: r.accuracy };
  }, ADRESA);
  console.log('   porosia e dytë:', JSON.stringify(e2));
  ok(e2.pika === 'Klinika shëndetësore Kënetë', 'e njeh pikën e referimit');
  ok(e2.lat && Math.abs(e2.lat - 41.3148) < 0.001, 'dhe merr koordinatën e saj');
  ok(e2.zona === 'Kënetë', 'zona mbetet e njëjtë');
  ok(Number(e2.saktesia) >= 100,
     'saktësia thotë hapur që është e përafërt, jo dera', e2.saktesia + ' m');

  console.log('\n═══ 5. PIKA E KLIENTIT NUK MBISHKRUHET ═══');
  const e3 = await p.evaluate(async (a) => {
    const r = await SPRINT.store.createOrder({
      kind: 'delivery', name: 'Klient me pin', phone: '069 700 7777', address: a,
      lat: 41.32000, lng: 19.45000, accuracy: 11,
      items: [{ id: 'pz03', c: 'pizza', name: 'Picë', qty: 1, price: 320 }],
      subtotal: 320, total: 320, channel: 'web', payment: 'cash' });
    return { lat: r.lat, saktesia: r.accuracy, pika: r.landmark || null };
  }, ADRESA);
  ok(Math.abs(e3.lat - 41.32) < 0.0001 && Number(e3.saktesia) === 11,
     'kur klienti ndan vendndodhjen, ajo mbetet e paprekur', JSON.stringify(e3));

  console.log('\n═══ 6. PROVA TE PANELI ═══');
  await p.reload({ waitUntil: 'load' }); await p.waitForTimeout(2300);
  await p.click('[data-tab=zone]'); await p.waitForTimeout(1700);
  await p.fill('#ztest', ADRESA); await p.waitForTimeout(600);
  const prova2 = await p.evaluate(() => document.querySelector('#ztestOut').textContent.trim());
  console.log('   provoje →', prova2);
  ok(/Kënetë/.test(prova2) && /Klinika/.test(prova2),
     'paneli e tregon zonën dhe pikën bashkë');
  await p.screenshot({ path: out + 'ad-panel.png', clip: { x: 0, y: 90, width: 1280, height: 900 } });

  errs.slice(0, 6).forEach((e) => console.log('  !', e));
  console.log(fails ? `\n✗ ${fails} dështime\n` : '\n═══ TË GJITHA KALUAN ═══\n');
  await b.close();
  process.exit(fails ? 1 : 0);
})();
