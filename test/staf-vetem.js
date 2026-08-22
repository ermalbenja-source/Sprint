/* Prova që i mungoi herën e parë: faqja e stafit E VETME, pa server dhe pa
   asnjë hap përgatitor — pikërisht ashtu si e hap përdoruesi parapamjen. */
const { chromium } = require('playwright');
const out = '/tmp/claude-0/-home-user-Sprint/c53b462c-5ae8-5e47-bcb5-d1a2a85c1602/scratchpad/';

const type = async (p, code) => {
  for (const d of code) await p.click(`[data-k="${d}"]`);
  if (code.length < 8) await p.click('[data-k="ok"]');
  await p.waitForTimeout(1500);
};

(async () => {
  const b = await chromium.launch();

  for (const [emri, kodi, pret] of [
    ['Kuzhina', '1199', 'kds'],
    ['Andrea',  '4821', 'runs'],
    ['Pronari', '7000', 'të dyja'],
  ]) {
    // konteks krejt i pastër çdo herë — asnjë gjurmë nga prova e mëparshme
    const ctx = await b.newContext({ viewport: { width: 1240, height: 900 } });
    const p = await ctx.newPage();
    const errs = [];
    p.on('pageerror', e => errs.push('ERR ' + e.message));

    await p.goto('http://127.0.0.1:8899/staf/', { waitUntil: 'load' });
    await p.waitForTimeout(1200);

    if (emri === 'Kuzhina') {
      console.log('KODET NË EKRAN ->', await p.evaluate(() => {
        const el = [...document.querySelectorAll('.gate-card p')].pop();
        return el ? el.textContent.replace(/\s+/g, ' ').trim() : '(asnjë)';
      }));
      await p.screenshot({ path: out + 'v-gate.png' });
    }

    await type(p, kodi);
    const r = await p.evaluate(() => ({
      hyri: !document.querySelector('#app').classList.contains('hide'),
      gabimi: document.querySelector('#gateErr').textContent,
      kush: document.querySelector('#whoTxt').textContent,
      kds: !document.querySelector('#v-kds').classList.contains('hide'),
      runs: !document.querySelector('#v-runs').classList.contains('hide'),
      karta: document.querySelectorAll('.tick').length,
      ndalesa: document.querySelectorAll('#v-runs [data-pickit]').length,
      ndërrues: [...document.querySelectorAll('#switcher button')].map(x => x.textContent.trim()),
    }));
    console.log(`${emri} (${kodi}) ->`, JSON.stringify(r));
    if (emri === 'Kuzhina') await p.screenshot({ path: out + 'v-kds.png' });
    if (emri === 'Andrea') await p.screenshot({ path: out + 'v-runs.png' });
    errs.slice(0, 3).forEach(e => console.log('   !', e));
    await ctx.close();
  }

  // kod i gabuar duhet të mbetet i gabuar
  const ctx = await b.newContext();
  const p = await ctx.newPage();
  await p.goto('http://127.0.0.1:8899/staf/', { waitUntil: 'load' });
  await p.waitForTimeout(1000);
  await type(p, '0000');
  console.log('KOD I GABUAR ->', await p.evaluate(() =>
    document.querySelector('#gateErr').textContent));

  await b.close();
})();
