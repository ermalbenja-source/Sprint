/* ============================================================================
   Fshirja e të dhënave në shfletues: portat para saj dhe rrjedha e plotë.
   Niset kundër serverit lokal.
       node test/fshirja-ekrani.js [http://127.0.0.1:8787]
   ========================================================================== */
const { chromium } = require('playwright');
const fs = require('fs');
const B = process.argv[2] || 'http://127.0.0.1:8787';
const out = '/tmp/claude-0/-home-user-Sprint/c53b462c-5ae8-5e47-bcb5-d1a2a85c1602/scratchpad/';

const creds = fs.readFileSync(process.env.SPRINT_DATA + '/hyrja.txt', 'utf8');
const EMAIL = (creds.match(/Email:\s*(\S+)/) || [])[1];
const PASS  = (creds.match(/Fjalëkalimi:\s*(\S+)/) || [])[1];

let fails = 0;
const ok = (cond, msg, extra) => {
  console.log((cond ? '  ✓ ' : '  ✗ ') + msg + (extra ? '  ' + extra : ''));
  if (!cond) fails++;
};

(async () => {
  const b = await chromium.launch();
  const ctx = await b.newContext({ viewport: { width: 1280, height: 950 } });
  const p = await ctx.newPage();
  const errs = [];
  p.on('pageerror', (e) => errs.push('ERR ' + e.message));

  await p.goto(B + '/admin/', { waitUntil: 'load' });
  await p.fill('#em', EMAIL); await p.fill('#pw', PASS);
  await p.click('#loginBtn'); await p.waitForTimeout(2000);

  /* diçka për të fshirë */
  await p.evaluate(async () => {
    const s = SPRINT.store;
    if (((await s.fetchAll()) || {}).menu || 0) { /* ka menu */ }
    await s.saveItems(SPRINT.menu.slice(0, 20).map((m, i) => Object.assign({ sort: i }, m)));
    for (let i = 1; i <= 2; i++) {
      await s.createOrder({ kind: 'delivery', name: 'Klient ' + i, phone: '069 800 000' + i,
        address: 'Rruga e Ekranit ' + i, total: 700, subtotal: 700, channel: 'phone', payment: 'cash',
        items: [{ id: 'pz03', name: 'Pica Margarita', qty: 1, price: 700 }] });
    }
  });

  await p.click('[data-tab=set]'); await p.waitForTimeout(900);
  await p.evaluate(() => document.querySelector('#wipeGo').scrollIntoView({ block: 'center' }));
  await p.waitForTimeout(300);

  console.log('\n═══ PORTAT ═══');
  ok(await p.isDisabled('#wipeGo'), 'butoni nis i fikur');

  await p.fill('#wipeWord', 'fshij'); await p.waitForTimeout(250);
  ok(await p.isDisabled('#wipeGo'), 'me shkronja të vogla mbetet i fikur');
  ok(/shkronja të mëdha/.test(await p.textContent('#wipeMsg')), 'e thotë pse');

  await p.fill('#wipeWord', 'FSHIJ'); await p.waitForTimeout(250);
  ok(!(await p.isDisabled('#wipeGo')), 'me FSHIJ hapet');

  const sipas = await p.evaluate(() =>
    [...document.querySelectorAll('.wipe-opt')].map((x) => x.querySelector('b').textContent));
  ok(sipas.length === 2, 'të dyja shkallët janë aty', sipas.join(' | '));
  ok(await p.isChecked('[name=wipeScope][value=levizjet]'), 'ajo më e butë është e zgjedhur si parazgjedhje');

  await p.screenshot({ path: out + 'fshirja.png', clip: { x: 0, y: 250, width: 1280, height: 640 } });
  ok(await p.evaluate(() => document.documentElement.scrollWidth
                          - document.documentElement.clientWidth) === 0, 'pa mbirrjedhje anash');

  console.log('\n═══ PYETJA E FUNDIT ═══');
  let teksti = '';
  p.once('dialog', (d) => { teksti = d.message(); d.dismiss(); });
  await p.click('#wipeGo'); await p.waitForTimeout(700);
  ok(/Nuk kthehet mbrapsht/.test(teksti), 'pyetja e fundit e thotë se nuk kthehet');
  ok(/Menuja, stafi dhe cilësimet mbeten/.test(teksti), 'dhe thotë ç\'mbetet', '');

  const ende = await p.evaluate(async () => (await SPRINT.store.fetchOrders()).length);
  ok(ende >= 2, 'me «Anulo» asgjë nuk u fshi', ende + ' porosi');

  console.log('\n═══ FSHIRJA ═══');
  p.once('dialog', (d) => d.accept());
  await p.click('#wipeGo'); await p.waitForTimeout(1500);
  const rap = await p.textContent('#wipeMsg');
  console.log('   mesazhi: «' + rap + '»');
  ok(/U fshinë|Nuk kishte/.test(rap), 'raporton çfarë u fshi');

  await p.waitForTimeout(3500);   // paneli ringarkohet vetë
  const pas = await p.evaluate(async () => ({
    porosi: (await SPRINT.store.fetchOrders()).length,
    menu: ((await SPRINT.store.fetchAll()) || {}).menu.length,
  }));
  ok(pas.porosi === 0, 'porositë ikën');
  ok(pas.menu >= 20, 'menuja mbeti', pas.menu + ' pjata');

  console.log('\n  gabime në faqe: ' + errs.length);
  errs.slice(0, 4).forEach((e) => console.log('   ' + e));
  if (errs.length) fails++;

  await b.close();
  console.log(fails ? '\n  ' + fails + ' provë(a) dështuan\n' : '\n  Të gjitha kaluan.\n');
  process.exit(fails ? 1 : 0);
})().catch((e) => { console.error('\n  Gabim:', e.message, '\n'); process.exit(1); });
