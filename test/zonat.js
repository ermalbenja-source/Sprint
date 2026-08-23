/* ============================================================================
   Zonat e dërgesës, harta që mëson dhe radha e ndalesave.
       SPRINT_DATA=... node test/zonat.js [http://127.0.0.1:8787]
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
  p.on('console', (m) => { if (m.type() === 'error' && !/Failed to load|ERR_|tile\./.test(m.text())) errs.push('C ' + m.text()); });
  p.on('dialog', (d) => d.accept());
  // Pllakat e hartës nuk arrihen nga ky kompjuter; nuk kanë lidhje me logjikën.
  await p.route('**/tile.openstreetmap.org/**', (r) => r.abort());

  await p.goto(B + '/admin/', { waitUntil: 'load' });
  await p.fill('#em', creds.match(/Email:\s*(\S+)/)[1]);
  await p.fill('#pw', creds.match(/Fjalëkalimi:\s*(\S+)/)[1]);
  await p.click('#loginBtn'); await p.waitForTimeout(2200);

  console.log('\n═══ 1. SKEDA E ZONAVE ═══');
  await p.click('[data-tab=zone]'); await p.waitForTimeout(1600);
  const zs = await p.evaluate(() => [...document.querySelectorAll('.zrow')].map((r) => ({
    emri: r.querySelector('[data-zf=name]').value,
    fjalet: r.querySelector('[data-zf=keywords]').value,
    kufi: r.querySelector('.zmark').textContent.trim(),
  })));
  console.log('  zonat:', zs.map((z) => z.emri).join(', '));
  ok(zs.length >= 5, 'ndarja fillestare e Durrësit doli', zs.length + ' zona');
  ok(zs.every((z) => z.kufi === 'pa kufi'), 'asnjëra nuk ka kufi ende — i vizaton pronari');
  ok(zs.some((z) => /plazh/.test(z.fjalet)), 'fjalët kyçe janë aty');

  console.log('\n═══ 2. KUFIRI I DURRËSIT SI ORIENTIM ═══');
  const d = await p.evaluate(() => ({
    pika: SPRINT_DURRES.kufiri.length,
    burimi: SPRINT_DURRES.burimi,
    forma: document.querySelectorAll('#zoneMap .smap-over polygon').length,
    dyqani: document.querySelectorAll('#zoneMap .smap-over circle').length,
  }));
  console.log('  ', JSON.stringify(d));
  ok(d.pika > 20, 'kufiri i vërtetë u ngarkua', d.pika + ' pika');
  ok(/geoBoundaries/.test(d.burimi), 'burimi është i shënuar (CC BY kërkon falënderim)');
  ok(d.forma >= 1, 'vizatohet mbi hartë');
  ok(d.dyqani >= 1, 'dyqani shënohet me pikë');

  console.log('\n═══ 3. VIZATIMI I NJË ZONE ═══');
  // Zgjidh «Plazh» dhe kliko katër qoshe mbi hartë.
  await p.click('.zrow:nth-child(2)'); await p.waitForTimeout(400);
  const box = await p.evaluate(() => {
    const r = document.querySelector('#zoneMap').getBoundingClientRect();
    return { x: r.x, y: r.y, w: r.width, h: r.height };
  });
  // Pika mirë të ndara: dy klikime që bien te i njëjti piksel do të jepnin
  // qoshe të mbivendosura dhe një provë që s'provon gjë.
  const pts = [[0.25, 0.22], [0.72, 0.22], [0.72, 0.72], [0.25, 0.72]];
  await p.waitForTimeout(500);
  for (const [fx, fy] of pts) {
    await p.mouse.click(box.x + box.w * fx, box.y + box.h * fy);
    await p.waitForTimeout(300);
  }
  const after = await p.evaluate(() => ({
    shenja: document.querySelector('.zrow.on .zmark').textContent.trim(),
    doreza: document.querySelectorAll('#zoneMap .smap-over circle[data-vertex]').length,
    titulli: document.querySelector('#zmTitle').textContent,
  }));
  console.log('  ', JSON.stringify(after));
  ok(/4 pika/.test(after.shenja), 'katër qoshet u vendosën', after.shenja);
  ok(after.doreza === 4, 'dorezat janë të prekshme për t\'i hequr');
  await p.screenshot({ path: out + 'zn-harta.png', clip: { x: 0, y: 90, width: 1280, height: 700 } });

  // hiq një qoshe duke e klikuar — e fundit, që të mos ketë mbivendosje
  await p.locator('#zoneMap .smap-over circle[data-vertex]').last().click();
  await p.waitForTimeout(400);
  ok(/3 pika/.test(await p.evaluate(() =>
    document.querySelector('.zrow.on .zmark').textContent)), 'klikimi mbi qoshe e heq atë');
  await p.click('#zmUndo'); await p.waitForTimeout(300);
  ok(/2 pika/.test(await p.evaluate(() =>
    document.querySelector('.zrow.on .zmark').textContent)), '«hiq të fundit» punon');

  console.log('\n═══ 4. PROVA E ADRESËS ═══');
  const provo = async (v) => {
    await p.fill('#ztest', v); await p.waitForTimeout(350);
    return p.evaluate(() => document.querySelector('#ztestOut').textContent.trim());
  };
  ok(/Plazh/.test(await provo('Te plazhi, pallati 7')), 'adresa me «plazh» → Plazh');
  ok(/Qendra/.test(await provo('Rruga Taulantia 14')), 'adresa me «taulantia» → Qendra');
  ok(/Shkozet/.test(await provo('Shkozet, prapa shkollës')), 'adresa me «shkozet» → Shkozet');
  const pa = await provo('Diku fare pa emër');
  ok(/pa zonë/.test(pa), 'adresa e panjohur e thotë hapur që s\'ka zonë', pa);

  console.log('\n═══ 5. RUAJTJA ═══');
  // Fillo nga e para dhe vizato një katërkëndësh të rregullt: pas heqjeve më
  // sipër, qoshet mbetën të përziera dhe do të jepnin një formë të kryqëzuar.
  // Kufiri vendoset drejtpërdrejt: klikimi u provua më sipër, këtu provohet
  // rruga e të dhënave — ruajtje, ringarkim, dhe pika brenda kufirit.
  await p.evaluate(() => {
    const z = SPRINT.zonat.list().find((x) => x.name === 'Plazh');
    z.outline = [[41.300, 19.485], [41.300, 19.505], [41.315, 19.505], [41.315, 19.485]];
  });
  await p.click('.zrow:nth-child(2)'); await p.waitForTimeout(400);
  ok(/4 pika/.test(await p.evaluate(() =>
    document.querySelector('.zrow.on .zmark').textContent)), 'kufiri u vendos i rregullt');
  await p.click('#saveZones'); await p.waitForTimeout(1200);
  ok(/ruajtën/.test(await p.evaluate(() => document.querySelector('#toast').textContent)),
     'u ruajtën');
  await p.reload({ waitUntil: 'load' }); await p.waitForTimeout(2300);
  await p.click('[data-tab=zone]'); await p.waitForTimeout(1500);
  const back = await p.evaluate(() => [...document.querySelectorAll('.zrow')].map((r) => ({
    emri: r.querySelector('[data-zf=name]').value,
    kufi: r.querySelector('.zmark').textContent.trim() })));
  ok(back.length >= 5, 'zonat u kthyen pas ringarkimit', back.length + ' zona');
  ok(back.some((z) => /^\d+ pika$/.test(z.kufi)), 'kufiri i vizatuar mbijetoi ringarkimin',
     JSON.stringify(back.map((z) => z.kufi)));

  // Dhe kufiri duhet të vlejë vërtet: një pikë brenda tij duhet ta japë zonën,
  // edhe kur adresa nuk përmban asnjë fjalë kyçe.
  const provaPike = await p.evaluate(() => {
    const zs = SPRINT.zonat.list();
    const me = zs.find((z) => z.outline && z.outline.length >= 3);
    if (!me) return null;
    const la = me.outline.reduce((n, q) => n + q[0], 0) / me.outline.length;
    const ln = me.outline.reduce((n, q) => n + q[1], 0) / me.outline.length;
    return { zona: me.name, brenda: SPRINT.store.zoneOf(zs, 'adresë fare pa fjalë', la, ln) };
  });
  ok(provaPike && provaPike.brenda === provaPike.zona,
     'pika brenda kufirit e jep zonën edhe pa fjalë kyçe', JSON.stringify(provaPike));

  console.log('\n═══ 6. POROSIA E MERR ZONËN VETVETIU ═══');
  const zonat = await p.evaluate(async () => {
    const s = SPRINT.store;
    const mk = async (addr, lat, lng) => {
      const r = await s.createOrder({
        kind: 'delivery', name: 'Klient ' + addr.slice(0, 8), phone: '069 900 1234',
        address: addr, lat, lng,
        items: [{ id: 'pz03', c: 'pizza', name: 'Picë', qty: 1, price: 320 }],
        subtotal: 320, total: 320, channel: 'phone', payment: 'cash' });
      return { adresa: addr, zona: r.zone || null };
    };
    return [
      await mk('Rruga Taulantia 14, kati 2'),
      await mk('Te plazhi, pallati 7'),
      await mk('Shkozet, prapa shkollës'),
      await mk('Diku fare pa emër'),
    ];
  });
  zonat.forEach((z) => console.log('   ', z.adresa.padEnd(28), '→', z.zona || '(pa zonë)'));
  ok(zonat[0].zona === 'Qendra', 'porosia e parë mori zonën nga fjalët');
  ok(zonat[1].zona === 'Plazh', 'e dyta gjithashtu');
  ok(zonat[3].zona === null, 'e panjohura mbetet pa zonë, pa hamendësuar');

  console.log('\n═══ 7. RADHA E NDALESAVE TE MOTORRISTI ═══');
  // Katër dorëzime: dy te Qendra (afër dyqanit), dy te Plazhi (larg), të
  // ndërthurura me qëllim. Radha e drejtë i grupon, jo i ndjek si erdhën.
  const pin = String(50000 + (Date.now() % 30000));
  const info = await p.evaluate(async (pin) => {
    const s = SPRINT.store;
    const r = await s.saveStaff({ name: 'Motorrist Zonash', role: 'driver' });
    await s.setStaffPin((Array.isArray(r) ? r[0] : r).id, pin);

    const mk = async (nr, addr, lat, lng) => s.createOrder({
      kind: 'delivery', name: 'Klient ' + nr, phone: '069 910 000' + nr,
      address: addr, lat, lng,
      items: [{ id: 'pz03', c: 'pizza', name: 'Picë', qty: 1, price: 320 }],
      subtotal: 320, total: 320, channel: 'phone', payment: 'cash' });

    // Radha e krijimit: Plazh, Qendër, Plazh, Qendër — e përzier me qëllim.
    const a = await mk(1, 'Te plazhi, pallati 7',      41.3040, 19.4930);
    const b = await mk(2, 'Rruga Taulantia 14',        41.3245, 19.4450);
    const c = await mk(3, 'Plazh, rruga Iliria 3',     41.3010, 19.4970);
    const d = await mk(4, 'Qendër, te sheshi Liria',   41.3220, 19.4420);
    for (const o of [a, b, c, d]) await s.updateOrder(o.id, { status: 'ready' });
    return [a, b, c, d].map((o) => ({ nr: o.number, zona: o.zone }));
  }, pin);
  console.log('   krijuar:', info.map((x) => '#' + x.nr + ' ' + x.zona).join(' · '));

  const mob = await b.newContext({ viewport: { width: 430, height: 900 },
    permissions: ['geolocation'], geolocation: { latitude: 41.3236, longitude: 19.4432, accuracy: 12 } });
  const q = await mob.newPage();
  q.on('pageerror', (e) => errs.push('ERR-staf ' + e.message));
  await q.goto(B + '/staf/', { waitUntil: 'load' });
  await q.waitForTimeout(900);
  for (const ch of pin) await q.click(`[data-k="${ch}"]`);
  await q.click('[data-k=ok]'); await q.waitForTimeout(2000);

  // Merri të katërta dhe nisu.
  // Rreshtat rivizatohen pas çdo zgjedhjeje; klikimi gjithmonë te i pari do
  // ta hiqte sërish atë që sapo u zgjodh.
  const gati = await q.$$('#v-runs [data-pickit]');
  console.log('   gati për t\'u marrë:', gati.length);
  for (let i = 0; i < gati.length; i++) {
    const items = await q.$$('#v-runs [data-pickit]');
    if (!items[i]) break;
    await items[i].click(); await q.waitForTimeout(320);
  }
  await q.click('#goRun'); await q.waitForTimeout(2500);

  const radha = await q.evaluate(() => [...document.querySelectorAll('#v-runs .stop:not(.gone)')]
    .map((el) => ({
      seq: (el.querySelector('.s-seq') || {}).textContent,
      nr: (el.querySelector('.s-no') || {}).textContent,
      zona: (el.querySelector('.s-zone') || {}).textContent.trim(),
    })));
  radha.forEach((r) => console.log(`    ${r.seq}. ${r.nr}  ${r.zona}`));
  await q.screenshot({ path: out + 'zn-moto.png' });

  ok(radha.length === 4, 'të katër ndalesat janë aty');
  const zonat2 = radha.map((r) => (r.zona.match(/Qendra|Plazh/) || [''])[0]);
  ok(zonat2.join(',') === 'Qendra,Qendra,Plazh,Plazh',
     'zonat u grupuan, dhe më e afërta doli e para', zonat2.join(' → '));
  ok(radha.every((r) => /km/.test(r.zona)), 'çdo ndalesë tregon sa larg është');
  ok(radha[0].seq === '1' && radha[3].seq === '4', 'ndalesat janë të numëruara');

  const titull = await q.evaluate(() =>
    [...document.querySelectorAll('#v-runs .sub')].map((x) => x.textContent).join(' '));
  ok(/sipas zonës dhe afërsisë/.test(titull), 'motorristi e di pse është kjo radhë');
  ok(/Nuk je i detyruar/.test(titull), 'dhe se nuk është urdhër');

  errs.slice(0, 6).forEach((e) => console.log('  !', e));
  console.log(fails ? `\n✗ ${fails} dështime\n` : '\n═══ TË GJITHA KALUAN ═══\n');
  await b.close();
  process.exit(fails ? 1 : 0);
})();
