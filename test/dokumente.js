/* ============================================================================
   Fletët e brendshme: përmbajtja, ndarja sipas stacionit dhe shënimi që i dallon
   nga fatura tatimore. Niset kundër serverit lokal.
       SPRINT_DATA=... node test/dokumente.js [http://127.0.0.1:8787]
   ========================================================================== */
const { chromium } = require('playwright');
const fs = require('fs');
const B = process.argv[2] || 'http://127.0.0.1:8787';
const out = '/tmp/claude-0/-home-user-Sprint/c53b462c-5ae8-5e47-bcb5-d1a2a85c1602/scratchpad/';
const creds = fs.readFileSync(process.env.SPRINT_DATA + '/hyrja.txt', 'utf8');

let fails = 0;
const ok = (c, m, x) => { console.log((c ? '  ✓ ' : '  ✗ ') + m + (x ? '  ' + x : '')); if (!c) fails++; };

(async () => {
  const b = await chromium.launch();
  const p = await (await b.newContext({ viewport: { width: 1280, height: 1000 } })).newPage();
  const errs = [];
  p.on('pageerror', (e) => errs.push('ERR ' + e.message));

  await p.goto(B + '/admin/', { waitUntil: 'load' });
  await p.fill('#em', creds.match(/Email:\s*(\S+)/)[1]);
  await p.fill('#pw', creds.match(/Fjalëkalimi:\s*(\S+)/)[1]);
  await p.click('#loginBtn'); await p.waitForTimeout(2200);

  // porosi e përzier: picë (furrë), tavë (kuzhinë), ujë (askund)
  await p.evaluate(async () => {
    await SPRINT.store.saveItems([
      { id: 'pz03', c: 'pizza', sq: 'Pica Margarita', p: 320, sort: 1, art: 'pizza' },
      { id: 'tr01', c: 'trad', sq: 'Tavë kosi', p: 400, sort: 2, art: 'tave' },
      { id: 'pj01', c: 'pije', sq: 'Ujë 0.5L', p: 60, sort: 3, art: 'drink' },
    ]);
    window.__ord = await SPRINT.store.createOrder({
      kind: 'delivery', name: 'Arben Hoxha', phone: '069 555 1001',
      address: 'Rruga Taulantia 14, kati 2', note: 'pa qepë, kambana s’punon',
      items: [{ id: 'pz03', c: 'pizza', name: 'Pica Margarita', qty: 2, price: 320 },
              { id: 'tr01', c: 'trad', name: 'Tavë kosi', qty: 1, price: 400 },
              { id: 'pj01', c: 'pije', name: 'Ujë 0.5L', qty: 3, price: 60 }],
      subtotal: 1220, total: 1220, channel: 'phone', payment: 'cash',
      lat: 41.3231, lng: 19.4414,
    });
  });
  await p.waitForTimeout(600);

  // Printimi hap dritaren e sistemit; testi e zëvendëson që të lexojë fletën.
  await p.evaluate(() => { window.print = () => { window.__printed = true; }; });

  // Kthen edhe tekstin e plotë edhe VETËM rreshtat e punës — «Bashkë me:» është
  // kontekst, jo punë, ndaj nuk duhet ngatërruar me listën që gatuhet.
  const sheet = async (fn) => {
    await p.evaluate(fn);
    await p.waitForTimeout(400);
    return p.evaluate(() => ({
      txt: document.querySelector('#printBox').innerText.replace(/\n+/g, '\n'),
      pune: [...document.querySelectorAll('#printBox .dk-t tr')]
        .map((r) => r.innerText.replace(/\s+/g, ' ').trim()),
    }));
  };

  console.log('\n═══ 1. FLETË KUZHINE ═══');
  const K = await sheet(async () => {
    const r = await SPRINT.store.loadRouter();
    const o = Object.assign({}, window.__ord, { items: r.tag(window.__ord.items) });
    await SPRINT.docs.printStationTicket(o, 'kitchen');
  });
  const k = K.txt;
  console.log('rreshtat e punës:', JSON.stringify(K.pune));
  ok(/KUZHINA/.test(k), 'titulli thotë KUZHINA');
  ok(K.pune.some((r) => /Tavë kosi/.test(r)), 'tava është rresht pune');
  ok(!K.pune.some((r) => /Pica/.test(r)), 'pica NUK është rresht pune');
  ok(/Bashkë me:.*Pica Margarita/s.test(k), 'por përmendet si kontekst');
  ok(/pa qepë/.test(k), 'shënimi i klientit doli');
  ok(!/069 555|Taulantia|Arben/.test(k), 'pa emër, telefon ose adresë te kuzhina');
  ok(/NUK ËSHTË FATURË TATIMORE/.test(k), 'shënimi ligjor është aty');

  console.log('\n═══ 2. FLETË FURRE ═══');
  const F = await sheet(async () => {
    const r = await SPRINT.store.loadRouter();
    const o = Object.assign({}, window.__ord, { items: r.tag(window.__ord.items) });
    await SPRINT.docs.printStationTicket(o, 'oven');
  });
  const f = F.txt;
  console.log('rreshtat e punës:', JSON.stringify(F.pune));
  ok(/FURRA E PICËS/.test(f), 'titulli thotë FURRA E PICËS');
  ok(F.pune.some((r) => /Pica Margarita/.test(r)), 'pica është rresht pune');
  ok(!F.pune.some((r) => /Tavë/.test(r)), 'tava nuk është punë e furrës');
  ok(/Bashkë me:.*Tavë kosi/s.test(f), 'por përmendet si kontekst');
  ok(!/Ujë/.test(f), 'uji nuk shfaqet askund — nuk gatuhet');

  console.log('\n═══ 3. FLETË DORËZIMI ═══');
  const d = (await sheet(async () => { await SPRINT.docs.printDelivery(window.__ord); })).txt;
  console.log(d.split('\n').slice(0, 16).join(' | '));
  ok(/Arben Hoxha/.test(d) && /069 555 1001/.test(d), 'motorristi i sheh të dhënat e klientit');
  ok(/Taulantia 14/.test(d), 'adresa është aty');
  ok(/41\.32310, 19\.44140/.test(d), 'pika në hartë doli');
  ok(/ARKËTO/.test(d) && /1,220 L/.test(d), 'sa para të arkëtohen');
  ok(/Dorëzoi/.test(d) && /Mori/.test(d), 'ka vend për firma');

  console.log('\n═══ 4. FLETË POROSIE E PLOTË ═══');
  const s = (await sheet(async () => { await SPRINT.docs.printOrder(window.__ord); })).txt;
  ok(/Pica Margarita/.test(s) && /Tavë kosi/.test(s) && /Ujë/.test(s),
     'të gjitha rreshtat, edhe pijet');
  ok(/GJITHSEJ/.test(s) && /1,220 L/.test(s), 'totali doli');
  ok(/Në dorë/.test(s), 'mënyra e pagesës');

  console.log('\n═══ 5. NUMRAT E DOKUMENTEVE ═══');
  const docs = await p.evaluate(() => SPRINT.docs.fetchDocuments(20));
  ok(docs.length >= 4, 'çdo fletë u regjistrua', docs.length + ' dokumente');
  const nums = docs.map((x) => x.number);
  ok(new Set(nums).size === nums.length, 'numrat nuk përsëriten', nums.join(','));
  ok(docs.some((x) => x.kind === 'delivery_note') && docs.some((x) => x.kind === 'kitchen_ticket'),
     'llojet u ruajtën saktë');
  ok(!docs.some((x) => JSON.stringify(x).match(/NIVF|NSLF/)), 'asnjë fushë fature tatimore');

  console.log('\n═══ 6. PAMJA NËN PRINTER ═══');
  await p.evaluate(async () => { await SPRINT.docs.printDelivery(window.__ord); });
  await p.waitForTimeout(300);
  await p.emulateMedia({ media: 'print' });
  await p.waitForTimeout(300);
  const vis = await p.evaluate(() => ({
    kutia: getComputedStyle(document.querySelector('#printBox')).display,
    paneli: getComputedStyle(document.querySelector('#panel')).display,
  }));
  ok(vis.kutia === 'block' && vis.paneli === 'none',
     'nën printer del vetëm fleta, jo paneli', JSON.stringify(vis));
  await p.screenshot({ path: out + 'dk-fleta.png', clip: { x: 0, y: 0, width: 420, height: 700 } });
  await p.emulateMedia({ media: 'screen' });
  const onScreen = await p.evaluate(() =>
    getComputedStyle(document.querySelector('#printBox')).display);
  ok(onScreen === 'none', 'në ekran fleta rri e fshehur', onScreen);

  errs.slice(0, 6).forEach((e) => console.log('  !', e));
  console.log(fails ? `\n✗ ${fails} dështime\n` : '\n═══ TË GJITHA KALUAN ═══\n');
  await b.close();
  process.exit(fails ? 1 : 0);
})();
