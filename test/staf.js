const { chromium } = require('playwright');
const out = '/tmp/claude-0/-home-user-Sprint/c53b462c-5ae8-5e47-bcb5-d1a2a85c1602/scratchpad/';
const B = 'http://127.0.0.1:8899';

async function seed(p) {
  await p.goto(B + '/admin/', { waitUntil: 'load' });
  await p.click('#localBtn'); await p.waitForTimeout(1200);
  // ekipi shembull krijohet vetë nga shtresa; testi vetëm e prek një herë
  await p.evaluate(() => SPRINT.store.ensureLocalStaff());
  await p.evaluate(async () => {
    const s = SPRINT.store;
    for (let n = 1; n <= 3; n++) {
      const r = await s.createOrder({
        kind: 'delivery', name: 'Klient ' + n, phone: '06955500' + n,
        address: 'Rruga ' + n + ', pallati ' + n, note: n === 2 ? 'pa qepë' : null,
        items: [{ id: 'pz03', name: 'Pica Margarita', qty: n, price: 320 }],
        subtotal: 320 * n, total: 320 * n, channel: 'phone',
        payment: n === 3 ? 'card' : 'cash', lat: 41.32 + n / 100, lng: 19.44 + n / 100,
      });
      await s.updateOrder(r.id, { status: n === 1 ? 'preparing' : 'ready',
                                  ready_at: new Date().toISOString() });
    }
  });
}

async function login(p, code) {
  for (const d of code) await p.click(`[data-k="${d}"]`);
  if (code.length < 8) await p.click('[data-k="ok"]');
  await p.waitForTimeout(1500);
}

(async () => {
  const b = await chromium.launch();
  const ctx = await b.newContext({ viewport: { width: 430, height: 900 },
    permissions: ['geolocation'], geolocation: { latitude: 41.32, longitude: 19.44, accuracy: 15 } });
  const p = await ctx.newPage();
  const errs = [];
  p.on('pageerror', e => errs.push('ERR ' + e.message));
  p.on('console', m => { if (m.type() === 'error' && !/ERR_CONNECTION|Failed to load/.test(m.text())) errs.push('C ' + m.text()); });

  await seed(p);

  // ---------- adresa e vjetër çon te e reja ----------
  await p.goto(B + '/kuzhina/', { waitUntil: 'load' });
  await p.waitForTimeout(900);
  console.log('RIDREJTIMI ->', await p.evaluate(() => location.pathname));

  // ---------- kuzhinieri ----------
  await login(p, '1199');
  console.log('KUZHINIERI', await p.evaluate(() => ({
    kush: document.querySelector('#whoTxt').textContent,
    kds: !document.querySelector('#v-kds').classList.contains('hide'),
    runs: !document.querySelector('#v-runs').classList.contains('hide'),
    ndërrues: !document.querySelector('#switcher').classList.contains('hide'),
    karta: document.querySelectorAll('.tick').length,
  })).then(JSON.stringify));
  await p.screenshot({ path: out + 'st-kds.png' });
  await p.click('#outBtn'); await p.waitForTimeout(800);

  // ---------- motorristi ----------
  await login(p, '4821');
  console.log('MOTORRISTI', await p.evaluate(() => ({
    kush: document.querySelector('#whoTxt').textContent,
    kds: !document.querySelector('#v-kds').classList.contains('hide'),
    runs: !document.querySelector('#v-runs').classList.contains('hide'),
    ndërrues: !document.querySelector('#switcher').classList.contains('hide'),
    gati: document.querySelectorAll('#v-runs .stop').length,
  })).then(JSON.stringify));
  await p.screenshot({ path: out + 'st-pick.png' });

  // zgjedh dy porosi dhe niset
  // rreshtat rivizatohen pas çdo zgjedhjeje, ndaj merren sërish çdo herë
  await p.click('#v-runs [data-pickit]'); await p.waitForTimeout(350);
  const second = await p.$$('#v-runs [data-pickit]');
  if (second[1]) { await second[1].click(); await p.waitForTimeout(350); }
  console.log('BUTONI I NISJES ->', await p.evaluate(() =>
    document.querySelector('#goRun').textContent.trim()));
  await p.screenshot({ path: out + 'st-picked.png' });

  await p.click('#goRun'); await p.waitForTimeout(2000);
  console.log('PAS NISJES', await p.evaluate(() => ({
    ndalesa: document.querySelectorAll('#v-runs .stop').length,
    titulli: (document.querySelector('#v-runs h2') || {}).textContent,
    navigo: !!document.querySelector('.s-nav'),
    telefono: (document.querySelector('.s-call') || {}).getAttribute('href'),
  })).then(JSON.stringify));
  await p.screenshot({ path: out + 'st-run.png' });

  // dorëzimi i parë
  await p.click('[data-deliver]'); await p.waitForTimeout(600);
  console.log('DRITARJA E DORËZIMIT', await p.evaluate(() => ({
    titulli: document.querySelector('#dlvTitle').textContent,
    nën: document.querySelector('#dlvSub').textContent.slice(0, 30),
    arka: document.querySelector('#dlvCash').value,
  })).then(JSON.stringify));
  await p.screenshot({ path: out + 'st-dlv.png' });
  await p.click('#dlvOk'); await p.waitForTimeout(1800);
  console.log('PAS DORËZIMIT', await p.evaluate(() => ({
    mbetur: document.querySelectorAll('.stop:not(.gone)').length,
    dorezuar: document.querySelectorAll('.stop.gone').length,
    sot: [...document.querySelectorAll('.daybox b')].map(x => x.textContent).join(' | '),
  })).then(JSON.stringify));

  // nuk u gjend
  await p.click('[data-fail]'); await p.waitForTimeout(500);
  await p.selectOption('#failReason', 'Adresa nuk u gjet');
  await p.click('#failOk'); await p.waitForTimeout(1800);
  console.log('PAS «NUK U GJEND»', await p.evaluate(() => ({
    titulli: (document.querySelector('#v-runs h2') || {}).textContent,
    gati: document.querySelectorAll('#v-runs [data-pickit]').length,
  })).then(JSON.stringify));

  await p.click('#outBtn'); await p.waitForTimeout(800);

  // ---------- pronari sheh të dyja ----------
  await login(p, '7000');
  console.log('PRONARI', await p.evaluate(() => ({
    kush: document.querySelector('#whoTxt').textContent,
    ndërrues: [...document.querySelectorAll('#switcher button')].map(b => b.textContent.trim()),
    aktiv: (document.querySelector('#switcher button.on') || {}).textContent,
  })).then(JSON.stringify));
  await p.screenshot({ path: out + 'st-owner.png' });

  // ndërro pamjen
  await p.click('#switcher button:nth-child(2)'); await p.waitForTimeout(1400);
  console.log('PAS NDËRRIMIT', await p.evaluate(() => ({
    aktiv: (document.querySelector('#switcher button.on') || {}).textContent,
    kds: !document.querySelector('#v-kds').classList.contains('hide'),
    runs: !document.querySelector('#v-runs').classList.contains('hide'),
  })).then(JSON.stringify));

  console.log('MBIRRJEDHJE-X', await p.evaluate(() =>
    document.documentElement.scrollWidth - document.documentElement.clientWidth));
  errs.slice(0, 6).forEach(e => console.log('  !', e));
  await b.close();
})();
