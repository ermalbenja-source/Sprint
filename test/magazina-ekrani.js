/* ============================================================================
   Magazina, blerjet dhe raportet në shfletues, kundër serverit lokal.
       SPRINT_DATA=... node test/magazina-ekrani.js [http://127.0.0.1:8787]
   ========================================================================== */
const { chromium } = require('playwright');
const fs = require('fs');
const B = process.argv[2] || 'http://127.0.0.1:8787';
const out = '/tmp/claude-0/-home-user-Sprint/c53b462c-5ae8-5e47-bcb5-d1a2a85c1602/scratchpad/';
const creds = fs.readFileSync(process.env.SPRINT_DATA + '/hyrja.txt', 'utf8');

(async () => {
  const b = await chromium.launch();
  const p = await (await b.newContext({ viewport: { width: 1280, height: 1000 } })).newPage();
  const errs = [];
  p.on('pageerror', (e) => errs.push('ERR ' + e.message));
  p.on('console', (m) => { if (m.type() === 'error' && !/ERR_CONNECTION|Failed to load/.test(m.text())) errs.push('C ' + m.text()); });
  p.on('dialog', async (d) => {
    // përgjigjet e kutive: sasia për lëvizjet e magazinës
    const t = d.message();
    if (d.type() === 'confirm') return d.accept();
    if (/gjete vërtet/.test(t)) return d.accept('48');
    if (/Prishje/.test(t)) return d.accept('2');
    if (/Hyrje/.test(t)) return d.accept('10');
    if (/Dalje/.test(t)) return d.accept('3');
    return d.accept('');
  });

  await p.goto(B + '/admin/', { waitUntil: 'load' });
  await p.fill('#em', creds.match(/Email:\s*(\S+)/)[1]);
  await p.fill('#pw', creds.match(/Fjalëkalimi:\s*(\S+)/)[1]);
  await p.click('#loginBtn'); await p.waitForTimeout(2200);

  /* ═══ MAGAZINA ═══ */
  await p.click('[data-tab=stock]'); await p.waitForTimeout(1400);
  console.log('BOSH ->', await p.evaluate(() => document.querySelector('#stockList').textContent.trim().slice(0, 60)));

  // furnitor
  await p.click('#addSup'); await p.waitForTimeout(400);
  await p.fill('#fnName', 'Bloja sh.p.k.'); await p.fill('#fnNipt', 'K12345678L');
  await p.click('#fnSave'); await p.waitForTimeout(900);
  console.log('FURNITORI ->', await p.evaluate(() =>
    document.querySelector('#supList .nm b').textContent));

  // artikuj
  const addItem = async (name, sku, unit, min, cost) => {
    await p.click('#addStock'); await p.waitForTimeout(400);
    await p.fill('#skName', name); await p.fill('#skSku', sku);
    await p.fill('#skUnit', unit); await p.fill('#skMin', String(min));
    await p.fill('#skCost', String(cost));
    await p.click('#skSave'); await p.waitForTimeout(900);
  };
  await addItem('Miell tip 00', 'MIELL', 'kg', 20, 55);
  await addItem('Djathë mocarela', 'DJATHE', 'kg', 5, 900);
  await addItem('Kuti pice 32cm', 'KUTI', 'copë', 50, 22);

  console.log('ARTIKUJT', await p.evaluate(() => JSON.stringify(
    [...document.querySelectorAll('.strow[data-stk]')].map((r) => ({
      emri: r.querySelector('.nm b').textContent,
      sasia: r.querySelector('.qty').textContent.trim(),
      poMbaron: r.classList.contains('low'),
    })))));
  console.log('PËRMBLEDHJA ->', await p.evaluate(() => document.querySelector('#stkSum').textContent));
  await p.screenshot({ path: out + 'mg-stock.png', clip: { x: 0, y: 90, width: 1280, height: 560 } });

  /* ═══ BLERJA ═══ */
  await p.click('[data-tab=buy]'); await p.waitForTimeout(1200);
  await p.click('#newBuy'); await p.waitForTimeout(700);
  await p.selectOption('#buySup', { index: 1 });
  await p.fill('#buyRef', '2026/114');

  const setLine = async (i, itemLabel, qty, cost) => {
    const rows = await p.$$('#buyLines .linerow');
    while (rows.length <= i) { await p.click('#addBuyLine'); await p.waitForTimeout(250); break; }
    await p.selectOption(`[data-line="${i}"] [data-lf=item_id]`, { label: itemLabel });
    await p.waitForTimeout(200);
    await p.fill(`[data-line="${i}"] [data-lf=qty]`, String(qty)); await p.waitForTimeout(200);
    await p.fill(`[data-line="${i}"] [data-lf=unit_cost]`, String(cost)); await p.waitForTimeout(250);
  };
  await setLine(0, 'Miell tip 00 (kg)', 100, 58);
  await p.click('#addBuyLine'); await p.waitForTimeout(300);
  await setLine(1, 'Djathë mocarela (kg)', 20, 950);
  await p.click('#addBuyLine'); await p.waitForTimeout(300);
  await setLine(2, 'Kuti pice 32cm (copë)', 500, 20);

  console.log('TOTALI I BLERJES ->', await p.evaluate(() =>
    document.querySelector('#buyTotal').textContent));
  await p.screenshot({ path: out + 'mg-buy.png', clip: { x: 0, y: 90, width: 1280, height: 700 } });

  await p.click('#saveBuy'); await p.waitForTimeout(1400);
  console.log('PAS RUAJTJES ->', await p.evaluate(() => ({
    toast: document.querySelector('#toast').textContent,
    lista: [...document.querySelectorAll('#buyList .strow')].map((r) =>
      r.querySelector('.st-badge').textContent.trim() + ' ' + r.querySelector('.qty').textContent.trim()),
  })).then(JSON.stringify));

  await p.click('#recvBuy'); await p.waitForTimeout(2000);
  console.log('PAS PRANIMIT ->', await p.evaluate(() => ({
    toast: document.querySelector('#toast').textContent,
    gjendja: [...document.querySelectorAll('#buyList .strow')].map((r) =>
      r.querySelector('.st-badge').textContent.trim()),
  })).then(JSON.stringify));

  await p.click('[data-tab=stock]'); await p.waitForTimeout(1400);
  console.log('MAGAZINA PAS BLERJES', await p.evaluate(() => JSON.stringify(
    [...document.querySelectorAll('.strow[data-stk]')].map((r) => ({
      emri: r.querySelector('.nm b').textContent,
      sasia: r.querySelector('.qty').textContent.trim(),
      poMbaron: r.classList.contains('low'),
    })))));
  console.log('PËRMBLEDHJA ->', await p.evaluate(() => document.querySelector('#stkSum').textContent));

  /* ═══ LËVIZJET ═══ */
  await p.click('.strow[data-stk] [data-mv=waste]'); await p.waitForTimeout(1300);
  console.log('PAS PRISHJES ->', await p.evaluate(() => document.querySelector('#toast').textContent));
  await p.click('.strow[data-stk] [data-mv=count]'); await p.waitForTimeout(1300);
  console.log('PAS NUMËRIMIT ->', await p.evaluate(() => document.querySelector('#toast').textContent));

  /* ═══ RECETA ═══ */
  await p.selectOption('#recDish', { index: 1 }); await p.waitForTimeout(800);
  console.log('PA RECETË ->', await p.evaluate(() =>
    document.querySelector('#recList').textContent.trim().slice(0, 50)));
  for (let i = 0; i < 3; i++) { await p.click('#addRec'); await p.waitForTimeout(250); }
  const rows = await p.$$('#recList .linerow');
  for (let i = 0; i < 3; i++) {
    await p.selectOption(`[data-rec="${i}"] [data-rf=stock_item_id]`, { index: i + 1 });
    await p.waitForTimeout(200);
    await p.fill(`[data-rec="${i}"] [data-rf=qty]`, ['0.25', '0.15', '1'][i]);
    await p.waitForTimeout(250);
  }
  console.log('KOSTOJA E RECETËS ->', await p.evaluate(() =>
    document.querySelector('#recCount').textContent));
  await p.click('#saveRec'); await p.waitForTimeout(1000);
  console.log('RUAJTJA E RECETËS ->', await p.evaluate(() => document.querySelector('#toast').textContent));
  await p.screenshot({ path: out + 'mg-recipe.png', clip: { x: 0, y: 400, width: 1280, height: 560 } });

  /* ═══ RAPORTET ═══ */
  await p.evaluate(async () => {
    await SPRINT.store.createOrder({
      kind: 'delivery', name: 'Klient Raporti', phone: '069 888 0101',
      address: 'Rruga e Raportit 3',
      items: [{ id: (SPRINT.menu[0] || {}).id, name: 'Pjatë', qty: 3, price: 400 }],
      subtotal: 1200, total: 1200, channel: 'phone', payment: 'cash',
    });
  });
  await p.click('[data-tab=rep]'); await p.waitForTimeout(1800);
  console.log('KPI', await p.evaluate(() =>
    [...document.querySelectorAll('.kpi')].map((k) =>
      k.querySelector('span').textContent + '=' + k.querySelector('b').textContent).join(' | ')));
  console.log('SHTYLLAT ->', await p.evaluate(() => document.querySelectorAll('#repChart .bar').length));
  console.log('MOTORRISTËT ->', await p.evaluate(() =>
    document.querySelector('#repDrivers').textContent.trim().slice(0, 50)));
  console.log('PJATËT ->', await p.evaluate(() =>
    [...document.querySelectorAll('#repItems tbody tr')].map((r) => r.textContent.trim()).join(' ; ')));
  await p.screenshot({ path: out + 'mg-rep.png', clip: { x: 0, y: 90, width: 1280, height: 800 } });

  const m = await p.evaluate(async () => {
    window.scrollTo(9999, 0); await new Promise((r) => setTimeout(r, 120));
    const x = Math.round(window.scrollX); window.scrollTo(0, 0); return x;
  });
  console.log('MBIRRJEDHJE-X', m);
  errs.slice(0, 8).forEach((e) => console.log('  !', e));
  await b.close();
})();
