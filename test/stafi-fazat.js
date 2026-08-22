const { chromium } = require('playwright');
const out = '/tmp/claude-0/-home-user-Sprint/c53b462c-5ae8-5e47-bcb5-d1a2a85c1602/scratchpad/';
(async () => {
  const b = await chromium.launch();
  const p = await (await b.newContext({ viewport: { width: 1300, height: 1000 } })).newPage();
  const errs = [];
  p.on('pageerror', e => errs.push('ERR ' + e.message));
  p.on('console', m => { if (m.type() === 'error' && !/ERR_CONNECTION|Failed to load/.test(m.text())) errs.push('C ' + m.text()); });

  await p.goto('http://127.0.0.1:8899/admin/', { waitUntil: 'load' });
  await p.click('#localBtn'); await p.waitForTimeout(1200);

  // ---------- STAFI ----------
  await p.click('[data-tab=staff]'); await p.waitForTimeout(900);
  console.log('STAFI', await p.evaluate(() => JSON.stringify(
    [...document.querySelectorAll('.srow')].map(r => ({
      rol: r.querySelector('.rolechip').textContent,
      emri: r.querySelector('.who-n b').textContent,
      kod: r.querySelector('.pinst').textContent.trim(),
    })))));
  await p.screenshot({ path: out + 's-staff.png', clip: { x: 0, y: 90, width: 1300, height: 430 } });

  // vendos kodin
  await p.click('.srow [data-pin]'); await p.waitForTimeout(400);
  console.log('MODALI', await p.evaluate(() => document.querySelector('#pinTitle').textContent));
  await p.fill('#pinIn', '12');
  await p.click('#pinSave'); await p.waitForTimeout(300);
  console.log('KOD I SHKURTËR ->', await p.evaluate(() => document.querySelector('#pinErr').textContent));
  await p.fill('#pinIn', '5150');
  await p.screenshot({ path: out + 's-pin.png' });
  await p.click('#pinSave'); await p.waitForTimeout(700);
  console.log('PAS KODIT', await p.evaluate(() =>
    document.querySelector('.srow .pinst').textContent.trim()));

  // kod i dyfishtë te personi i dytë — 5150 sapo u zu nga i pari
  await p.click('.srow:nth-child(2) [data-pin]'); await p.waitForTimeout(400);
  await p.fill('#pinIn', '5150');
  await p.click('#pinSave'); await p.waitForTimeout(500);
  console.log('KOD I DYFISHTË ->', await p.evaluate(() => document.querySelector('#pinErr').textContent));
  await p.keyboard.press('Escape'); await p.waitForTimeout(300);

  // ndrysho emrin
  await p.click('.srow [data-edit]'); await p.waitForTimeout(400);
  await p.fill('#edName', 'Andrea Hoxha');
  await p.click('#edSave'); await p.waitForTimeout(800);
  console.log('PAS NDRYSHIMIT', await p.evaluate(() =>
    document.querySelector('.srow .who-n b').textContent));

  // shto person
  await p.click('#addStaff'); await p.waitForTimeout(800);
  console.log('PAS SHTIMIT', await p.evaluate(() => document.querySelectorAll('.srow').length));
  await p.click('#edCancel').catch(() => {}); await p.waitForTimeout(400);

  // ---------- FAZAT ----------
  await p.click('[data-tab=phase]'); await p.waitForTimeout(900);
  console.log('FAZAT', await p.evaluate(() => document.querySelectorAll('.phrow').length));
  console.log('PARAPAMJA', await p.evaluate(() =>
    [...document.querySelectorAll('#phasePreview .st')].map(s => s.textContent.trim()).join(' → ')));
  console.log('BRAVAT', await p.evaluate(() =>
    [...document.querySelectorAll('.phrow')].map(r =>
      r.dataset.ph + (r.querySelector('.lockmark').textContent.includes('🔒') ? '🔒' : '')).join(' ')));
  await p.screenshot({ path: out + 's-phase.png', clip: { x: 0, y: 90, width: 1300, height: 700 } });

  // riemërto dhe shiko parapamjen
  await p.fill('.phrow[data-ph=preparing] [data-f=customer_label_sq]', 'Po piqet');
  await p.waitForTimeout(300);
  console.log('PAS RIEMËRTIMIT', await p.evaluate(() =>
    [...document.querySelectorAll('#phasePreview .st')].map(s => s.textContent.trim()).join(' → ')));

  // fik një fazë jo-bazë
  await p.click('.phrow[data-ph=accepted] [data-en]'); await p.waitForTimeout(300);
  console.log('PAS FIKJES', await p.evaluate(() =>
    [...document.querySelectorAll('#phasePreview .st')].map(s => s.textContent.trim()).join(' → ')));

  // faza bazë s'fiket dot
  console.log('BUTONI I FAZËS BAZË', await p.evaluate(() =>
    document.querySelector('.phrow[data-ph=done] [data-en]').disabled ? 'i çaktivizuar' : 'i klikueshëm'));

  await p.click('#savePhases'); await p.waitForTimeout(700);
  console.log('RUAJTJA ->', await p.evaluate(() => document.querySelector('#toast').textContent));

  await p.reload({ waitUntil: 'load' });
  await p.click('#localBtn').catch(() => {}); await p.waitForTimeout(1000);
  await p.click('[data-tab=phase]'); await p.waitForTimeout(800);
  console.log('PAS RINGARKIMIT', await p.evaluate(() =>
    [...document.querySelectorAll('#phasePreview .st')].map(s => s.textContent.trim()).join(' → ')));

  await p.click('#resetPhases'); await p.waitForTimeout(700);
  console.log('PAS RIKTHIMIT', await p.evaluate(() =>
    [...document.querySelectorAll('#phasePreview .st')].map(s => s.textContent.trim()).join(' → ')));

  console.log('MBIRRJEDHJE-X', await p.evaluate(() =>
    document.documentElement.scrollWidth - document.documentElement.clientWidth));
  errs.slice(0, 6).forEach(e => console.log('  !', e));
  await b.close();
})();
