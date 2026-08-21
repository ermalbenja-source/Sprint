const { chromium } = require('playwright');
const out = '/tmp/claude-0/-home-user-Sprint/c53b462c-5ae8-5e47-bcb5-d1a2a85c1602/scratchpad/';
(async () => {
  const b = await chromium.launch();
  const p = await (await b.newContext({ viewport: { width: 1300, height: 1050 } })).newPage();
  const errs = [];
  p.on('pageerror', e => errs.push('ERR ' + e.message));
  p.on('console', m => { if (m.type() === 'error' && !/ERR_CONNECTION|Failed to load/.test(m.text())) errs.push('C ' + m.text()); });

  await p.goto('http://127.0.0.1:8899/admin/', { waitUntil: 'load' });
  await p.click('#localBtn'); await p.waitForTimeout(1200);
  await p.click('[data-tab=new]'); await p.waitForTimeout(500);

  // ---- kërkimi i pjatës ----
  await p.fill('#nSearch', 'mar'); await p.waitForTimeout(400);
  console.log('PROPOZIME', await p.evaluate(() =>
    [...document.querySelectorAll('#nSugg button')].map(x => x.querySelector('b').textContent).join(' | ')));

  await p.press('#nSearch', 'Enter'); await p.waitForTimeout(300);
  await p.fill('#nSearch', 'burger'); await p.waitForTimeout(400);
  await p.press('#nSearch', 'ArrowDown'); await p.waitForTimeout(150);
  await p.press('#nSearch', 'Enter'); await p.waitForTimeout(300);
  console.log('RRESHTAT', await p.evaluate(() => JSON.stringify({
    n: document.querySelectorAll('.nline').length,
    emrat: [...document.querySelectorAll('.nline .ln')].map(x => x.textContent),
    totali: document.querySelector('#nTotal').textContent,
  })));

  // shto sasi
  await p.click('.nline [data-q="1"]'); await p.waitForTimeout(250);
  console.log('PAS +1', await p.evaluate(() => document.querySelector('#nTotal').textContent));

  // ---- klienti i ri ----
  await p.fill('#nPhone', '069 555 1234'); await p.waitForTimeout(700);
  console.log('KLIENT I RI ->', await p.evaluate(() => document.querySelector('#nFound').textContent));

  await p.fill('#nName', 'Ermal Benja');
  await p.fill('#nAddr', 'Rruga Taulantia 12');
  await p.screenshot({ path: out + 'p-form.png', clip: { x: 0, y: 90, width: 1300, height: 830 } });

  await p.click('#nSend'); await p.waitForTimeout(1200);
  const ok1 = await p.evaluate(() => ({
    hapur: !document.querySelector('#nOk').classList.contains('hide'),
    nr: document.querySelector('#nOkNo').textContent,
    kodi: document.querySelector('#nOkCode').textContent,
    wa: decodeURIComponent(document.querySelector('#nOkWa').getAttribute('href') || '').slice(0, 46),
  }));
  console.log('POROSIA 1', JSON.stringify(ok1));
  await p.screenshot({ path: out + 'p-ok.png', clip: { x: 0, y: 90, width: 1300, height: 560 } });

  // ---- klienti i njohur: adresa duhet të vijë vetë ----
  await p.click('#nOkNew'); await p.waitForTimeout(300);
  await p.fill('#nPhone', '0695551234'); await p.waitForTimeout(900);
  console.log('KLIENT I NJOHUR ->', await p.evaluate(() => document.querySelector('#nFound').textContent));
  console.log('EMRI VETVETIU ->', await p.evaluate(() => document.querySelector('#nName').value));
  console.log('LIBRI I ADRESAVE', await p.evaluate(() =>
    [...document.querySelectorAll('#nAddrBook button')].map(x => x.textContent.trim().replace(/\s+/g, ' ')).join(' ‖ ')));
  await p.screenshot({ path: out + 'p-known.png', clip: { x: 0, y: 90, width: 660, height: 700 } });

  // klikimi i adresës
  await p.click('#nAddrBook [data-addr="0"]'); await p.waitForTimeout(300);
  console.log('ADRESA U VU ->', await p.evaluate(() => document.querySelector('#nAddr').value));

  // përsërit porosinë e fundit
  const again = await p.$('#nAddrBook [data-again]');
  if (again) {
    await again.click(); await p.waitForTimeout(400);
    console.log('PËRSËRITJA', await p.evaluate(() => JSON.stringify({
      rreshta: document.querySelectorAll('.nline').length,
      totali: document.querySelector('#nTotal').textContent,
    })));
  } else console.log('PËRSËRITJA -> pa porosi të mbyllur ende (pritet)');

  // ---- vërtetimet ----
  await p.click('#nClear'); await p.waitForTimeout(300);
  await p.click('#nSend'); await p.waitForTimeout(300);
  console.log('PA PJATË ->', await p.evaluate(() => document.querySelector('#nMsg').textContent));

  await p.fill('#nSearch', 'pica'); await p.waitForTimeout(350);
  await p.press('#nSearch', 'Enter'); await p.waitForTimeout(250);
  await p.click('#nSend'); await p.waitForTimeout(300);
  console.log('PA EMËR ->', await p.evaluate(() => document.querySelector('#nMsg').textContent));

  await p.fill('#nName', 'Test');
  await p.fill('#nPhone', '069');
  await p.click('#nSend'); await p.waitForTimeout(300);
  console.log('TELEFON I SHKURTËR ->', await p.evaluate(() => document.querySelector('#nMsg').textContent));

  await p.fill('#nPhone', '069 777 8888');
  await p.click('#nSend'); await p.waitForTimeout(400);
  console.log('PA ADRESË ->', await p.evaluate(() => document.querySelector('#nMsg').textContent));

  // marr vetë duhet ta heqë adresën
  await p.click('[data-kind=pickup]'); await p.waitForTimeout(250);
  console.log('MARR VETË — adresa e fshehur:', await p.evaluate(() =>
    document.querySelector('#nAddrWrap').classList.contains('hide')));
  await p.click('#nSend'); await p.waitForTimeout(1000);
  console.log('POROSI MARR VETË ->', await p.evaluate(() => document.querySelector('#nOkNo').textContent));

  // porosia duhet të dalë te tabela
  await p.click('[data-tab=ord]'); await p.waitForTimeout(1200);
  console.log('TE TABELA', await p.evaluate(() => JSON.stringify({
    karta: document.querySelectorAll('#ordList .ord').length,
    e_para: (document.querySelector('#ordList .ord .ord-no') || {}).textContent,
  })));

  console.log('MBIRRJEDHJE-X', await p.evaluate(() =>
    document.documentElement.scrollWidth - document.documentElement.clientWidth));
  errs.slice(0, 6).forEach(e => console.log('  !', e));
  await b.close();
})();
