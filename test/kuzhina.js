const { chromium } = require('playwright');
const out = '/tmp/claude-0/-home-user-Sprint/c53b462c-5ae8-5e47-bcb5-d1a2a85c1602/scratchpad/';

/* Përgatit stafin dhe disa porosi përmes panelit, pastaj hap kuzhinën. */
async function seed(p) {
  await p.goto('http://127.0.0.1:8899/admin/', { waitUntil: 'load' });
  await p.click('#localBtn'); await p.waitForTimeout(1200);
  await p.click('[data-tab=staff]'); await p.waitForTimeout(800);
  await p.evaluate(async () => {
    const s = SPRINT.store;
    const all = await s.fetchStaff();
    let k = all.find(x => x.role === 'kitchen');
    if (!k) { await s.saveStaff({ name: 'Kuzhina', role: 'kitchen' }); k = (await s.fetchStaff()).find(x => x.role === 'kitchen'); }
    await s.setStaffPin(k.id, '1199');
    const d = (await s.fetchStaff()).find(x => x.role === 'driver');
    if (d) await s.setStaffPin(d.id, '4821');
  });
  // tri porosi në faza të ndryshme
  await p.evaluate(async () => {
    const s = SPRINT.store;
    const mk = (st, note, n) => s.createOrder({
      kind: n % 2 ? 'pickup' : 'delivery', name: 'Klient ' + n, phone: '06900000' + n,
      address: 'Rruga ' + n, note,
      items: [{ id: 'pz03', name: 'Pica Margarita', qty: n, price: 320 },
              { id: 'fs01', name: 'Patate', qty: 1, price: 150 }],
      subtotal: 320 * n + 150, total: 320 * n + 150, channel: 'phone',
    }).then(r => st !== 'new' ? s.updateOrder(r.id, { status: st }) : r);
    await mk('new', null, 1);
    await mk('accepted', 'pa qepë, mirë e pjekur', 2);
    await mk('preparing', null, 3);
  });
}

(async () => {
  const b = await chromium.launch();
  const ctx = await b.newContext({ viewport: { width: 1280, height: 900 } });
  const p = await ctx.newPage();
  const errs = [];
  p.on('pageerror', e => errs.push('ERR ' + e.message));
  p.on('console', m => { if (m.type() === 'error' && !/ERR_CONNECTION|Failed to load/.test(m.text())) errs.push('C ' + m.text()); });

  await seed(p);

  // ---------- hyrja ----------
  await p.goto('http://127.0.0.1:8899/kuzhina/', { waitUntil: 'load' });
  await p.waitForTimeout(900);
  console.log('PORTA', await p.evaluate(() => ({
    gate: !document.querySelector('#gate').classList.contains('hide'),
    app: !document.querySelector('#app').classList.contains('hide'),
  })).then(JSON.stringify));

  await p.click('[data-k="9"]'); await p.click('[data-k="9"]');
  await p.click('[data-k="9"]'); await p.click('[data-k="9"]');
  await p.click('[data-k="ok"]'); await p.waitForTimeout(700);
  console.log('KOD I GABUAR ->', await p.evaluate(() => document.querySelector('#gateErr').textContent));
  await p.screenshot({ path: out + 'k-gate.png' });

  // kodi i motorristit nuk duhet ta hapë
  for (const d of '4821') await p.click(`[data-k="${d}"]`);
  await p.click('[data-k="ok"]'); await p.waitForTimeout(900);
  console.log('KODI I MOTORRISTIT ->', await p.evaluate(() => document.querySelector('#gateErr').textContent));

  // kodi i saktë
  for (const d of '1199') await p.click(`[data-k="${d}"]`);
  await p.click('[data-k="ok"]'); await p.waitForTimeout(1500);
  console.log('PAS HYRJES', await p.evaluate(() => ({
    app: !document.querySelector('#app').classList.contains('hide'),
    kush: document.querySelector('#whoTxt').textContent,
    karta: document.querySelectorAll('.tick').length,
    nrat: [...document.querySelectorAll('.t-no')].map(x => x.textContent).join(' '),
  })).then(JSON.stringify));
  await p.screenshot({ path: out + 'k-board.png' });

  console.log('PA TË DHËNA PERSONALE', await p.evaluate(() => {
    const t = document.querySelector('#app').textContent;
    return !/Klient \d|0690000|Rruga \d/.test(t);
  }));

  console.log('SHËNIMI DUKET', await p.evaluate(() =>
    (document.querySelector('.t-note') || {}).textContent || '—'));
  console.log('NUMËRUESIT', await p.evaluate(() =>
    'furrë=' + document.querySelector('#cPrep').textContent + ' gati=' + document.querySelector('#cReady').textContent));

  // ---------- shenja mbi pjatë ----------
  await p.click('.tick [data-tick]'); await p.waitForTimeout(300);
  console.log('SHENJA MBI PJATË', await p.evaluate(() =>
    document.querySelectorAll('.t-line.done').length));

  // ---------- bump ----------
  const prepCard = '.tick.s-preparing';
  console.log('BUTONI I FURRËS', await p.evaluate((s) =>
    (document.querySelector(s + ' .b-ready') || {}).textContent, prepCard));
  await p.click(prepCard + ' [data-to="ready"]'); await p.waitForTimeout(900);
  console.log('PAS «GATI»', await p.evaluate(() => ({
    gati: document.querySelector('#cReady').textContent,
    undo: document.querySelector('#undo').classList.contains('on'),
    undoNo: document.querySelector('#undoNo').textContent,
  })).then(JSON.stringify));
  await p.screenshot({ path: out + 'k-undo.png' });

  // kthimi mbrapsht
  await p.click('#undoBtn'); await p.waitForTimeout(900);
  console.log('PAS KTHIMIT', await p.evaluate(() =>
    'furrë=' + document.querySelector('#cPrep').textContent + ' gati=' + document.querySelector('#cReady').textContent));

  // fillimi i një porosie të pranuar
  await p.click('.tick.s-accepted [data-to="preparing"]'); await p.waitForTimeout(900);
  console.log('PAS «FILLO»', await p.evaluate(() =>
    'furrë=' + document.querySelector('#cPrep').textContent));

  // ---------- sesioni mbijeton ringarkimit ----------
  await p.reload({ waitUntil: 'load' }); await p.waitForTimeout(1500);
  console.log('PAS RINGARKIMIT', await p.evaluate(() => ({
    app: !document.querySelector('#app').classList.contains('hide'),
    karta: document.querySelectorAll('.tick').length,
    shenja: document.querySelectorAll('.t-line.done').length,
  })).then(JSON.stringify));

  // ---------- dalja ----------
  await p.click('#outBtn'); await p.waitForTimeout(800);
  console.log('PAS DALJES gate:', await p.evaluate(() =>
    !document.querySelector('#gate').classList.contains('hide')));

  // ---------- mobil ----------
  const p2 = await (await b.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true })).newPage();
  await p2.goto('http://127.0.0.1:8899/kuzhina/', { waitUntil: 'load' });
  await p2.waitForTimeout(800);
  console.log('MOBIL mbirrjedhje-x:', await p2.evaluate(() =>
    document.documentElement.scrollWidth - document.documentElement.clientWidth));
  await p2.screenshot({ path: out + 'k-mobile.png' });

  errs.slice(0, 6).forEach(e => console.log('  !', e));
  await b.close();
})();
