const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch();
  const p = await (await b.newContext()).newPage();
  const errs = [];
  p.on('pageerror', e => errs.push('ERR ' + e.message));
  p.on('console', m => { if (m.type() === 'error') errs.push('C ' + m.text()); });
  await p.goto('http://127.0.0.1:8899/admin/', { waitUntil: 'load' });
  await p.waitForTimeout(1500);

  console.log('MODULI', await p.evaluate(() => {
    const s = SPRINT.store;
    return JSON.stringify({
      fazat: typeof s.fetchPhases,
      klientet: typeof s.lookupCustomer,
      stafi: typeof s.staffLogin,
      vend: typeof s.getLocation,
      parazgjedhje: s.DEFAULT_PHASES.length,
    });
  }));

  console.log('FAZAT', await p.evaluate(async () => {
    const ph = await SPRINT.store.fetchPhases();
    return ph.map(x => x.key + ':' + x.label_sq).join(' → ');
  }));

  console.log('HAPAT E KLIENTIT', await p.evaluate(async () => {
    const pub = await SPRINT.store.publicPhases();
    return JSON.stringify(SPRINT.store.customerSteps(pub, 'sq').map(s => s.label + '(' + s.keys.join('+') + ')'));
  }));

  console.log('RUAJTJE + FIKJE', await p.evaluate(async () => {
    const ph = await SPRINT.store.fetchPhases();
    ph.find(x => x.key === 'kitchen').label_sq = 'Në zjarr';
    ph.find(x => x.key === 'confirmed').enabled = false;
    await SPRINT.store.savePhases(ph);
    const back = await SPRINT.store.fetchPhases();
    return JSON.stringify({
      riemertuar: back.find(x => x.key === 'kitchen').label_sq,
      fikur: back.find(x => x.key === 'confirmed').enabled,
    });
  }));

  console.log('FAZA BAZË S\'FIKET DOT', await p.evaluate(async () => {
    const ph = await SPRINT.store.fetchPhases();
    ph.find(x => x.key === 'done').enabled = false;      // is_core
    await SPRINT.store.savePhases(ph);
    const back = await SPRINT.store.fetchPhases();
    return String(back.find(x => x.key === 'done').enabled);
  }));

  console.log('LIBRI I ADRESAVE', await p.evaluate(async () => {
    const s = SPRINT.store;
    await s.upsertCustomer({ phone: '069 123 4567', name: 'Ermal Benja', address: 'Rruga Taulantia 12', lat: 41.3231, lng: 19.4414, accuracy: 12 });
    await s.upsertCustomer({ phone: '0691234567', name: 'Ermal Benja', address: 'rruga taulantia 12' });
    await s.upsertCustomer({ phone: '069 123 4567', name: 'Ermal Benja', address: 'Plazh, pallati 4' });
    const c = await s.lookupCustomer('069-123-4567');
    return JSON.stringify({ emri: c.name, adresa: c.addresses.length, pini: !!c.addresses.find(a => a.lat) });
  }));

  console.log('STAFI', await p.evaluate(async () => {
    const s = SPRINT.store;
    await s.saveStaff({ name: 'Motorrist A', role: 'driver' });
    await s.saveStaff({ name: 'Kuzhina', role: 'kitchen' });
    const all = await s.fetchStaff();
    await s.setStaffPin(all[0].id, '4821');
    let dup = 'lejoi';
    try { await s.setStaffPin(all[1].id, '4821'); } catch (e) { dup = 'refuzoi'; }
    const ok = await s.staffLogin('4821');
    let bad = 'lejoi';
    try { await s.staffLogin('0000'); } catch (e) { bad = 'refuzoi'; }
    return JSON.stringify({ veta: all.length, hyri: ok.name, kodDyfishte: dup, kodGabuar: bad });
  }));

  console.log('CILËSIA E VENDNDODHJES', await p.evaluate(() => {
    const q = SPRINT.store.locationQuality;
    return [q(10), q(40), q(120)].join(' / ');
  }));

  console.log('LINKU I NAVIGIMIT', await p.evaluate(() =>
    SPRINT.store.navLink({ lat: 41.32, lng: 19.44 }).slice(0, 62)));

  errs.slice(0, 6).forEach(e => console.log('  !', e));
  await b.close();
})();
