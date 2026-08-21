const { chromium } = require('playwright');
const out = '/tmp/claude-0/-home-user-Sprint/c53b462c-5ae8-5e47-bcb5-d1a2a85c1602/scratchpad/';

async function openCheckout(p) {
  await p.evaluate(() => document.querySelectorAll('[data-menu-grid] [data-add]')[3].click());
  await p.waitForTimeout(350);
  await p.click('[data-cart-open]'); await p.waitForTimeout(450);
  await p.click('[data-cart-send]'); await p.waitForTimeout(650);
}

(async () => {
  const b = await chromium.launch();

  // ---------- me leje vendndodhjeje ----------
  const ctx = await b.newContext({
    viewport: { width: 460, height: 900 },
    permissions: ['geolocation'],
    geolocation: { latitude: 41.3231, longitude: 19.4414, accuracy: 18 },
  });
  const p = await ctx.newPage();
  const errs = [];
  p.on('pageerror', e => errs.push('ERR ' + e.message));
  // pllakat e OSM nuk arrihen nga kjo kuti prove — imitohen, që harta të provohet
  await p.route('**://tile.openstreetmap.org/**', r =>
    r.fulfill({ status: 200, contentType: 'image/svg+xml',
      body: '<svg xmlns="http://www.w3.org/2000/svg" width="256" height="256"><rect width="256" height="256" fill="#2b4a3f"/><path d="M0 128h256M128 0v256" stroke="#3d6355"/></svg>' }));

  await p.goto('http://127.0.0.1:8899/', { waitUntil: 'load' });
  await p.waitForTimeout(1800);
  await openCheckout(p);

  console.log('BUTONI', await p.evaluate(() => document.querySelector('#locBtn').textContent.trim()));
  console.log('KUTIA E FSHEHUR', await p.evaluate(() => document.querySelector('#locBox').hidden));

  await p.click('#locBtn'); await p.waitForTimeout(1600);
  const g = await p.evaluate(() => ({
    kutia: !document.querySelector('#locBox').hidden,
    mesazhi: document.querySelector('#locMsg').textContent,
    klasa: document.querySelector('#locMsg').className,
    pllaka: document.querySelectorAll('#locMap .smap-tiles img').length,
    butoni: document.querySelector('#locBtn').textContent.trim(),
  }));
  console.log('PAS KËRKESËS', JSON.stringify(g));
  await p.screenshot({ path: out + 'v-map.png' });

  // tërheqja e hartës duhet ta ndryshojë pinin
  const before = await p.evaluate(() => JSON.stringify(LOC.map.get()));
  const box = await p.$eval('#locMap', el => { const r = el.getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2 }; });
  await p.mouse.move(box.x, box.y);
  await p.mouse.down();
  await p.mouse.move(box.x - 70, box.y - 40, { steps: 8 });
  await p.mouse.up();
  await p.waitForTimeout(400);
  const after = await p.evaluate(() => JSON.stringify(LOC.map.get()));
  console.log('PARA TËRHEQJES', before);
  console.log('PAS TËRHEQJES ', after, before === after ? '← NUK LËVIZI' : '← lëvizi');
  console.log('SAKTËSIA U HOQ', await p.evaluate(() => LOC.accuracy === null));

  // zoom
  await p.click('#locMap [data-z="1"]'); await p.waitForTimeout(400);
  console.log('PAS ZOOM-IT pllaka:', await p.evaluate(() => document.querySelectorAll('#locMap .smap-tiles img').length));

  // porosia duhet ta mbajë pinin
  await p.fill('#coName', 'Ermal Benja');
  await p.fill('#coPhone', '069 123 4567');
  await p.fill('#coAddr', 'Rruga Taulantia 12, kati 3');
  await p.click('#coSend'); await p.waitForTimeout(1300);
  console.log('POROSIA', await p.evaluate(() => {
    const o = JSON.parse(localStorage.getItem('sprint-local-orders') || '[]')[0] || {};
    return JSON.stringify({ nr: o.number, kanali: o.channel, lat: o.lat, lng: o.lng, adresa: o.address });
  }));

  // heqja e pinit
  await p.click('[data-co-close]').catch(() => {});
  await p.waitForTimeout(400);

  // ---------- pa leje ----------
  const ctx2 = await b.newContext({ viewport: { width: 460, height: 900 } });
  const p2 = await ctx2.newPage();
  p2.on('pageerror', e => errs.push('ERR2 ' + e.message));
  await ctx2.setGeolocation(null).catch(() => {});
  await p2.route('**://tile.openstreetmap.org/**', r => r.fulfill({ status: 200, contentType: 'image/svg+xml', body: '<svg xmlns="http://www.w3.org/2000/svg" width="256" height="256"><rect width="256" height="256" fill="#2b4a3f"/></svg>' }));
  await p2.goto('http://127.0.0.1:8899/', { waitUntil: 'load' });
  await p2.waitForTimeout(1600);
  await openCheckout(p2);
  await p2.click('#locBtn'); await p2.waitForTimeout(2500);
  console.log('PA LEJE ->', await p2.evaluate(() => ({
    msg: document.querySelector('#locMsg').textContent.slice(0, 52),
    harta: document.querySelectorAll('#locMap .smap-tiles img').length > 0,
  })).then(JSON.stringify));

  console.log('MBIRRJEDHJE-X', await p.evaluate(() =>
    document.documentElement.scrollWidth - document.documentElement.clientWidth));
  errs.slice(0, 6).forEach(e => console.log('  !', e));
  await b.close();
})();
