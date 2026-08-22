/* ============================================================================
   Ekranet e gatimit në shfletues: paneli (skeda «Gatimi») dhe të dy stacionet
   te /staf. Niset kundër serverit lokal.
       node test/stacionet-ekrani.js [http://127.0.0.1:8787]
   ========================================================================== */
const { chromium } = require('playwright');
const fs = require('fs');
const B = process.argv[2] || 'http://127.0.0.1:8787';
const out = '/tmp/claude-0/-home-user-Sprint/c53b462c-5ae8-5e47-bcb5-d1a2a85c1602/scratchpad/';

const creds = fs.readFileSync(process.env.SPRINT_DATA + '/hyrja.txt', 'utf8');
const EMAIL = (creds.match(/Email:\s*(\S+)/) || [])[1];
const PASS  = (creds.match(/Fjalëkalimi:\s*(\S+)/) || [])[1];

const login = async (p, code) => {
  for (const d of code) await p.click(`[data-k="${d}"]`);
  if (code.length < 8) await p.click('[data-k="ok"]');
  await p.waitForTimeout(1600);
};

(async () => {
  const b = await chromium.launch();
  const ctx = await b.newContext({ viewport: { width: 1280, height: 950 } });
  const p = await ctx.newPage();
  const errs = [];
  p.on('pageerror', (e) => errs.push('ERR ' + e.message));
  p.on('console', (m) => { if (m.type() === 'error' && !/ERR_CONNECTION|Failed to load/.test(m.text())) errs.push('C ' + m.text()); });

  /* ═══ PANELI: skeda «Gatimi» ═══ */
  await p.goto(B + '/admin/', { waitUntil: 'load' });
  await p.fill('#em', EMAIL); await p.fill('#pw', PASS);
  await p.click('#loginBtn'); await p.waitForTimeout(2000);

  await p.click('[data-tab=cook]'); await p.waitForTimeout(1500);
  console.log('KATEGORITË', await p.evaluate(() => JSON.stringify(
    [...document.querySelectorAll('.ckrow')].map((r) => ({
      kat: r.querySelector('.who-n b').textContent,
      ku: (r.querySelector('.stbtn.on') || {}).textContent.trim(),
    })))));
  console.log('NUMËRIMI', await p.evaluate(() =>
    [...document.querySelectorAll('#cookStats .st')].map((s) => s.textContent.trim()).join(' | ')));
  console.log('MBIRRJEDHJE-PANEL', await p.evaluate(() =>
    document.documentElement.scrollWidth - document.documentElement.clientWidth));
  await p.screenshot({ path: out + 'ck-cats.png', clip: { x: 0, y: 90, width: 1280, height: 620 } });

  // zhvendos një kategori dhe shiko numërimin
  await p.click('.ckrow[data-cat=trad] [data-catsta=oven]'); await p.waitForTimeout(400);
  console.log('PAS ZHVENDOSJES', await p.evaluate(() =>
    [...document.querySelectorAll('#cookStats .st')].map((s) => s.textContent.trim()).join(' | ')));
  await p.click('.ckrow[data-cat=trad] [data-catsta=kitchen]'); await p.waitForTimeout(400);

  // përjashtim për një pjatë
  await p.fill('#cookSearch', 'Sufllaqe'); await p.waitForTimeout(500);
  console.log('KËRKIMI', await p.evaluate(() => document.querySelectorAll('#cookItems tbody tr').length));
  await p.screenshot({ path: out + 'ck-items.png', clip: { x: 0, y: 300, width: 1280, height: 500 } });
  await p.click('#cookItems [data-itemsta=fs01][data-sta=""]'); await p.waitForTimeout(300);
  console.log('PA PËRJASHTIM', await p.evaluate(() =>
    document.querySelector('#cookItems .stbtn.on').textContent.trim()));

  await p.click('#saveCook'); await p.waitForTimeout(900);
  console.log('RUAJTJA ->', await p.evaluate(() => document.querySelector('#toast').textContent));

  await p.reload({ waitUntil: 'load' }); await p.waitForTimeout(2200);
  await p.click('[data-tab=cook]'); await p.waitForTimeout(1400);
  console.log('PAS RINGARKIMIT', await p.evaluate(() =>
    [...document.querySelectorAll('#cookStats .st')].map((s) => s.textContent.trim()).join(' | ')));

  // lejet: a doli roli i ri?
  await p.click('[data-tab=staff]'); await p.waitForTimeout(1400);
  console.log('KOLONAT E LEJEVE', await p.evaluate(() =>
    [...document.querySelectorAll('#permTable thead th')].map((t) => t.textContent.trim()).join(' | ')));
  console.log('RRESHTAT E LEJEVE', await p.evaluate(() =>
    [...document.querySelectorAll('#permTable tbody th')].map((t) => t.textContent.trim()).join(' | ')));
  await p.screenshot({ path: out + 'ck-perm.png', clip: { x: 0, y: 200, width: 1280, height: 700 } });

  /* ═══ POROSIA E PËRZIER ═══ */
  await p.evaluate(async () => {
    await SPRINT.store.createOrder({
      kind: 'delivery', name: 'Klient Ekrani', phone: '069 777 0101',
      address: 'Rruga e Ekranit 9', note: 'pa qepë',
      items: [{ id: 'pz03', name: 'Pica Margarita', qty: 2, price: 320 },
              { id: 'tr01', name: 'Tavë kosi', qty: 1, price: 400 },
              { id: 'pj01', name: 'Ujë 0.5L', qty: 3, price: 60 }],
      subtotal: 1220, total: 1220, channel: 'phone', payment: 'cash',
    });
  });
  await p.waitForTimeout(700);

  /* ═══ EKRANI I KUZHINËS ═══ */
  const mob = await b.newContext({ viewport: { width: 430, height: 900 } });
  const q = await mob.newPage();
  q.on('pageerror', (e) => errs.push('ERR-staf ' + e.message));

  await q.goto(B + '/staf/', { waitUntil: 'load' });
  await q.waitForTimeout(700);
  await login(q, '1199');
  console.log('\nKUZHINIERI', await q.evaluate(() => JSON.stringify({
    kush: document.querySelector('#whoTxt').textContent,
    ndërrues: !document.querySelector('#switcher').classList.contains('hide'),
    karta: document.querySelectorAll('.tick').length,
    imet: [...document.querySelectorAll('.tick .t-line span:last-child')].map((x) => x.textContent),
    tjetra: (document.querySelector('.t-other') || {}).textContent,
  })));
  await q.screenshot({ path: out + 'ck-kuzhina.png' });

  await q.click('.tick [data-to=ready]'); await q.waitForTimeout(1800);
  console.log('KUZHINA DHA GATI', await q.evaluate(() => JSON.stringify({
    pret: (document.querySelector('.t-wait') || {}).textContent,
    butoni: (document.querySelector('.tick .big') || {}).textContent.trim(),
    gati: document.querySelector('#cReady').textContent,
  })));
  await q.screenshot({ path: out + 'ck-pret.png' });
  await q.click('#outBtn'); await q.waitForTimeout(900);

  /* ═══ EKRANI I FURRËS ═══ */
  await login(q, '1155');
  console.log('\nPICERI', await q.evaluate(() => JSON.stringify({
    kush: document.querySelector('#whoTxt').textContent,
    karta: document.querySelectorAll('.tick').length,
    imet: [...document.querySelectorAll('.tick .t-line span:last-child')].map((x) => x.textContent),
    tjetra: (document.querySelector('.t-other') || {}).textContent,
  })));
  await q.screenshot({ path: out + 'ck-furra.png' });

  await q.click('.tick [data-to=ready]'); await q.waitForTimeout(1800);
  console.log('FURRA DHA GATI', await q.evaluate(() => JSON.stringify({
    pret: (document.querySelector('.t-wait') || {}).textContent || '(asnjë)',
    butoni: (document.querySelector('.tick .big') || {}).textContent.trim(),
  })));
  await q.click('#outBtn'); await q.waitForTimeout(900);

  /* ═══ MOTORRISTI E SHEH TANI ═══ */
  await login(q, '4821');
  console.log('\nMOTORRISTI', await q.evaluate(() => JSON.stringify({
    kush: document.querySelector('#whoTxt').textContent,
    gati: document.querySelectorAll('#v-runs [data-pickit]').length,
  })));
  await q.screenshot({ path: out + 'ck-moto.png' });

  console.log('\nMBIRRJEDHJE-X', await q.evaluate(() =>
    document.documentElement.scrollWidth - document.documentElement.clientWidth));
  errs.slice(0, 8).forEach((e) => console.log('  !', e));
  await b.close();
})();
