/* Riprodhon kutinë e parapamjes: skedari i publikuar, i mbështjellë ashtu si
   e mbështjell platforma, dhe me localStorage të bllokuar — siç ndodh në disa
   kontekste të izoluara. */
const { chromium } = require('playwright');
const fs = require('fs');

const body = fs.readFileSync('/home/user/Sprint/dist/artifact/staf.html', 'utf8');
const page = `<!doctype html><html><head><meta charset="utf-8"></head><body>${body}</body></html>`;

const type = async (p, code) => {
  for (const d of code) await p.click(`[data-k="${d}"]`);
  if (code.length < 8) await p.click('[data-k="ok"]');
  await p.waitForTimeout(1200);
};

async function provo(b, emri, bllokoStorage) {
  const ctx = await b.newContext({ viewport: { width: 1000, height: 860 } });
  const p = await ctx.newPage();
  const errs = [];
  p.on('pageerror', e => errs.push('ERR ' + e.message));
  p.on('console', m => { if (m.type() === 'error') errs.push('C ' + m.text()); });

  if (bllokoStorage) {
    // ashtu si sillet një shfletues me të dhënat e faqes të ndaluara
    await p.addInitScript(() => {
      const bllok = () => { throw new DOMException('Access denied', 'SecurityError'); };
      Object.defineProperty(window, 'localStorage', {
        get() { return { getItem: bllok, setItem: bllok, removeItem: bllok, clear: bllok }; },
      });
    });
  }

  await p.route('**/dummy', r => r.abort());
  await p.setContent(page, { waitUntil: 'load' });
  await p.waitForTimeout(1200);

  const para = await p.evaluate(() => ({
    kodetNeEkran: (() => { const el = [...document.querySelectorAll('.gate-card p')].pop();
      return el ? el.textContent.replace(/\s+/g, ' ').trim().slice(0, 60) : '(asnjë)'; })(),
    gate: !document.querySelector('#gate').classList.contains('hide'),
  }));
  console.log(`\n══ ${emri} ══`);
  console.log('  para hyrjes:', JSON.stringify(para));

  for (const kodi of ['1199', '4821']) {
    await type(p, kodi);
    await p.waitForTimeout(900);
    const r = await p.evaluate(() => ({
      hyri: !document.querySelector('#app').classList.contains('hide'),
      gabimi: document.querySelector('#gateErr').textContent,
      kush: document.querySelector('#whoTxt').textContent,
      karta: document.querySelectorAll('.tick').length,
      ndalesa: document.querySelectorAll('#v-runs [data-pickit]').length,
      butoni: (document.querySelector('.big, #goRun') || {}).textContent,
    }));
    console.log(`  ${kodi} ->`, JSON.stringify(r));
    if (r.hyri) { await p.click('#outBtn'); await p.waitForTimeout(700); }
  }
  errs.slice(0, 4).forEach(e => console.log('   !', e));
  await ctx.close();
}

(async () => {
  const b = await chromium.launch();
  await provo(b, 'localStorage punon', false);
  await provo(b, 'localStorage i bllokuar', true);
  await b.close();
})();
