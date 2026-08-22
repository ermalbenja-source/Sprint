const { chromium } = require('playwright');
const out = '/tmp/claude-0/-home-user-Sprint/c53b462c-5ae8-5e47-bcb5-d1a2a85c1602/scratchpad/';
const B = 'http://127.0.0.1:8787';

const login = async (p, code) => {
  for (const d of code) await p.click(`[data-k="${d}"]`);
  if (code.length < 8) await p.click('[data-k="ok"]');
  await p.waitForTimeout(1600);
};

(async () => {
  const b = await chromium.launch();
  const ctx = await b.newContext({ viewport: { width: 1280, height: 950 },
    permissions: ['geolocation'], geolocation: { latitude: 41.32, longitude: 19.44, accuracy: 14 } });
  const p = await ctx.newPage();
  const errs = [];
  p.on('pageerror', e => errs.push('ERR ' + e.message));
  p.on('console', m => { if (m.type() === 'error' && !/ERR_CONNECTION|Failed to load|favicon/.test(m.text())) errs.push('C ' + m.text()); });

  // ---------- 1. faqja e njeh serverin lokal ----------
  await p.goto(B + '/', { waitUntil: 'load' }); await p.waitForTimeout(1800);
  console.log('MODALITETI', await p.evaluate(() => ({
    local: !!window.SPRINT_LOCAL,
    configured: SPRINT.store.configured,
    url: SPRINT_CONFIG.SUPABASE_URL || '(e njëjta adresë)',
  })).then(JSON.stringify));

  // ---------- 2. hyrja te paneli ----------
  await p.goto(B + '/admin/', { waitUntil: 'load' }); await p.waitForTimeout(1200);
  await p.fill('#em', 'pronar@sprint.local');
  await p.fill('#pw', 'fjalekalim123');
  await p.click('#loginBtn'); await p.waitForTimeout(2500);
  console.log('PANELI', await p.evaluate(() => ({
    hyri: !document.querySelector('#panel').classList.contains('hide'),
    kush: (document.querySelector('#whoTxt') || {}).textContent,
    modaliteti: (document.querySelector('#modePill') || {}).textContent,
  })).then(JSON.stringify));

  // ---------- 3. dërgo menunë në bazë ----------
  const pushed = await p.evaluate(async () => {
    const s = SPRINT.store;
    // saveItems e bën vetë përkthimin nga forma e menusë te rreshtat e bazës
    await s.saveItems(SPRINT.menu.map((m, i) => Object.assign({ sort: i }, m)));
    const back = await s.fetchAll();
    return back.menu.length;
  });
  console.log('MENUJA NË BAZË ->', pushed, 'artikuj');

  // ---------- 4. stafi ----------
  await p.click('[data-tab=staff]'); await p.waitForTimeout(1200);
  const staff = await p.evaluate(async () => {
    const s = SPRINT.store;
    const want = [['Kuzhina','kitchen','1199'], ['Andrea','driver','4821'], ['Gito','driver','4822']];
    for (const [name, role] of want) {
      const all = await s.fetchStaff();
      if (!all.find(x => x.name === name)) await s.saveStaff({ name, role });
    }
    const all = await s.fetchStaff();
    for (const [name, , pin] of want) {
      const x = all.find(y => y.name === name);
      if (x) await s.setStaffPin(x.id, pin);
    }
    return (await s.fetchStaff()).map(x => x.name + ':' + x.role).join(', ');
  });
  console.log('STAFI ->', staff);

  console.log('LEJET', await p.evaluate(async () =>
    JSON.stringify(await SPRINT.store.fetchRoleScreens())));

  // ---------- 5. porosi me telefon ----------
  await p.click('[data-tab=new]'); await p.waitForTimeout(700);
  await p.fill('#nSearch', 'mar'); await p.waitForTimeout(500);
  await p.press('#nSearch', 'Enter'); await p.waitForTimeout(400);
  await p.fill('#nPhone', '069 777 8888'); await p.waitForTimeout(900);
  await p.fill('#nName', 'Ermal Benja');
  await p.fill('#nAddr', 'Rruga Taulantia 12');
  await p.click('#nSend'); await p.waitForTimeout(2000);
  const ord = await p.evaluate(() => ({
    nr: document.querySelector('#nOkNo').textContent,
    kodi: document.querySelector('#nOkCode').textContent,
  }));
  console.log('POROSIA', JSON.stringify(ord));

  // klienti duhet të jetë ruajtur për herën tjetër
  await p.click('#nOkNew'); await p.waitForTimeout(400);
  await p.fill('#nPhone', '0697778888'); await p.waitForTimeout(1200);
  console.log('KLIENTI I NJOHUR ->', await p.evaluate(() => ({
    gjetja: document.querySelector('#nFound').textContent,
    emri: document.querySelector('#nName').value,
    adresa: (document.querySelector('#nAddrBook button') || {}).textContent.trim(),
  })).then(JSON.stringify));

  // ---------- 6. tabela dhe pranimi ----------
  await p.click('[data-tab=ord]'); await p.waitForTimeout(1800);
  console.log('TABELA ->', await p.evaluate(() => document.querySelectorAll('#ordList .ord').length), 'kartë');
  await p.click('#ordList [data-accept]').catch(() => {});
  await p.waitForTimeout(400);
  const acc = await p.$('#ordList [data-mins]');
  if (acc) { await acc.click(); await p.waitForTimeout(1500); }
  console.log('PAS PRANIMIT ->', await p.evaluate(() =>
    (document.querySelector('#ordList .ord .badge') || {}).textContent));
  await p.screenshot({ path: out + 'l-admin.png', clip: { x: 0, y: 100, width: 1280, height: 560 } });

  // ---------- 7. kuzhina ----------
  await p.goto(B + '/staf/', { waitUntil: 'load' }); await p.waitForTimeout(1200);
  await login(p, '1199');
  console.log('KUZHINA', await p.evaluate(() => ({
    kush: document.querySelector('#whoTxt').textContent,
    karta: document.querySelectorAll('.tick').length,
    pa_te_dhena: !/Ermal|0697778888|Taulantia/.test(document.querySelector('#app').textContent),
  })).then(JSON.stringify));

  await p.click('.tick [data-to="preparing"]'); await p.waitForTimeout(1200);
  await p.click('.tick [data-to="ready"]'); await p.waitForTimeout(1500);
  console.log('PAS GATI ->', await p.evaluate(() =>
    'furrë=' + document.querySelector('#cPrep').textContent +
    ' gati=' + document.querySelector('#cReady').textContent));
  await p.screenshot({ path: out + 'l-kds.png', clip: { x: 0, y: 0, width: 1280, height: 460 } });
  await p.click('#outBtn'); await p.waitForTimeout(900);

  // ---------- 8. motorristi ----------
  await login(p, '4821');
  console.log('MOTORRISTI', await p.evaluate(() => ({
    kush: document.querySelector('#whoTxt').textContent,
    gati: document.querySelectorAll('#v-runs [data-pickit]').length,
  })).then(JSON.stringify));

  await p.click('#v-runs [data-pickit]'); await p.waitForTimeout(500);
  await p.click('#goRun'); await p.waitForTimeout(2200);
  console.log('PAS NISJES ->', await p.evaluate(() =>
    (document.querySelector('#v-runs h2') || {}).textContent));

  await p.click('[data-deliver]'); await p.waitForTimeout(700);
  await p.click('#dlvOk'); await p.waitForTimeout(2200);
  console.log('PAS DORËZIMIT', await p.evaluate(() => ({
    titulli: (document.querySelector('#v-runs h2') || {}).textContent,
    sot: [...document.querySelectorAll('.daybox b')].map(x => x.textContent).join(' | '),
  })).then(JSON.stringify));
  await p.screenshot({ path: out + 'l-runs.png', clip: { x: 0, y: 0, width: 1280, height: 620 } });

  // ---------- 9. klienti e gjurmon ----------
  await p.goto(B + '/?kodi=' + ord.kodi.replace('-', ''), { waitUntil: 'load' });
  await p.waitForTimeout(2500);
  console.log('GJURMIMI', await p.evaluate(() => ({
    hapur: document.querySelector('#track').classList.contains('on'),
    nr: document.querySelector('#trNo').textContent,
    faza: document.querySelector('#trStatus').textContent,
  })).then(JSON.stringify));

  // ---------- 10. të dhënat mbijetojnë rinisjes ----------
  console.log('SHËNDETI ->', await p.evaluate(async () =>
    JSON.stringify(await (await fetch('/api/health')).json())));

  errs.slice(0, 8).forEach(e => console.log('  !', e));
  await b.close();
})();
