/* ============================================================================
   Manuali → PDF.
       node doc/bej-pdf.js  [dalja.pdf]

   Kërkon Playwright. Fontet e faqes vijnë nga Google; këtu shkarkohen një herë
   dhe futen brenda një kopjeje të përkohshme si data: URI, sepse Chromium që
   printon nuk del gjithnjë në rrjet — dhe pa to PDF-ja del me shkronja krejt
   të tjera. Pa internet, skripti vazhdon me shkronjat e sistemit dhe e thotë.
   ========================================================================== */
const fs = require('fs');
const path = require('path');
const os = require('os');

const rrenja = path.join(__dirname, '..');
const burimi = path.join(__dirname, 'manuali.html');
const dalja  = process.argv[2] || path.join(rrenja, 'dist', 'SPRINT-Manuali.pdf');

const FONTET = 'https://fonts.googleapis.com/css2'
  + '?family=Bakbak+One&family=Outfit:wght@300;400;500;600;700'
  + '&family=IBM+Plex+Mono:wght@400;500;600&display=swap';

/* Google e kthen woff2 vetëm kur kërkuesi duket si shfletues i ri. */
const SI_SHFLETUES = {
  'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) '
    + 'AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36',
};

async function fontetBrenda() {
  const r = await fetch(FONTET, { headers: SI_SHFLETUES });
  if (!r.ok) throw new Error('CSS-ja e fonteve: ' + r.status);
  const css = await r.text();

  /* Vetëm latin dhe latin-ext: shqipja nuk ka nevojë për devanagari a
     cirilike, dhe pa këtë PDF-ja do të mbante fonte që nuk përdoren kurrë. */
  const blloqe = [...css.matchAll(/\/\*\s*([a-z-]+)\s*\*\/\s*(@font-face\s*\{[^}]*\})/g)]
    .filter((m) => m[1] === 'latin' || m[1] === 'latin-ext')
    .map((m) => m[2]);
  let dale = blloqe.join('\n');

  const lidhjet = [...new Set([...dale.matchAll(/url\((https:\/\/fonts\.gstatic\.com\/[^)]+)\)/g)]
    .map((m) => m[1]))];
  for (const u of lidhjet) {
    const f = await fetch(u, { headers: SI_SHFLETUES });
    if (!f.ok) throw new Error('fonti ' + u + ': ' + f.status);
    const b64 = Buffer.from(await f.arrayBuffer()).toString('base64');
    dale = dale.split(u).join('data:font/woff2;base64,' + b64);
  }
  return { css: dale, sa: lidhjet.length };
}

(async () => {
  let html = fs.readFileSync(burimi, 'utf8');

  let sa = 0;
  try {
    const f = await fontetBrenda();
    html = html
      .replace(/<link rel="preconnect"[^>]*>\s*/g, '')
      .replace(/<link rel="stylesheet" href="https:\/\/fonts\.googleapis\.com[^>]*>\s*/g, '')
      .replace('<style>', '<style>\n' + f.css + '\n');
    sa = f.sa;
    console.log('  ✓ ' + sa + ' fonte u futën brenda');
  } catch (e) {
    console.log('  ! fontet nuk u morën (' + e.message + ') — vazhdoj me ato të sistemit');
  }

  const tmp = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'sprint-pdf-')), 'manuali.html');
  fs.writeFileSync(tmp, html);

  const { chromium } = require('playwright');
  const b = await chromium.launch();
  const p = await (await b.newContext({ colorScheme: 'light' })).newPage();
  await p.goto('file://' + tmp, { waitUntil: 'load' });
  await p.evaluate(() => document.fonts.ready);
  await p.waitForTimeout(600);
  await p.emulateMedia({ media: 'print', colorScheme: 'light' });

  fs.mkdirSync(path.dirname(dalja), { recursive: true });
  await p.pdf({
    path: dalja,
    format: 'A4',
    printBackground: true,
    displayHeaderFooter: true,
    headerTemplate: '<div></div>',
    footerTemplate:
      '<div style="width:100%;font-size:8pt;font-family:sans-serif;color:#7A6B65;'
      + 'padding:0 13mm;display:flex;justify-content:space-between">'
      + '<span>SPRINT · Manuali i përdorimit</span><span class="pageNumber"></span></div>',
    margin: { top: '14mm', bottom: '15mm', left: '13mm', right: '13mm' },
  });
  await b.close();
  fs.rmSync(path.dirname(tmp), { recursive: true, force: true });

  const kb = Math.round(fs.statSync(dalja).size / 1024);
  console.log('  ✓ ' + dalja + '  (' + kb + ' KB)');
})().catch((e) => { console.error('  Gabim:', e.message); process.exit(1); });
