/* ============================================================================
   Kodet e hyrjes së stafit, kundër serverit lokal të vërtetë.
   Provon se një pajisje që gabon kodin nuk e mbyll derën për tërë ekipin,
   se hamendësimi me mijëra prova prapë ndalet, dhe se pronari i hap bllokimet.
   Nisje:  node test/kodet.js [http://127.0.0.1:8787]
   ========================================================================== */
const B = process.argv[2] || 'http://127.0.0.1:8787';
const fs = require('fs');

let admin = '';
const H = (extra) => Object.assign(
  { 'Content-Type': 'application/json', apikey: 'local' },
  admin ? { Authorization: 'Bearer ' + admin } : {}, extra || {});

async function call(path, opt) {
  const r = await fetch(B + path, opt || {});
  const txt = await r.text();
  let body = null;
  try { body = txt ? JSON.parse(txt) : null; } catch (e) { body = txt; }
  if (!r.ok) throw new Error((body && body.message) || r.status + ' ' + txt.slice(0, 160));
  return body;
}
const rpc = (name, args, hdr) =>
  call('/rest/v1/rpc/' + name, { method: 'POST', headers: hdr || H(), body: JSON.stringify(args || {}) });

/* Dështimi i hyrjes nuk vjen si gabim HTTP por si rresht me «problem» brenda —
   shih shënimin te staff_login: një exception do ta kthente mbrapsht numërimin. */
async function hyr(pin, pajisje) {
  try {
    const r = await rpc('staff_login', { p_pin: pin, p_device: pajisje },
                        { 'Content-Type': 'application/json', apikey: 'local' });
    const row = Array.isArray(r) ? r[0] : r;
    return { ok: !!(row && row.token), msg: (row && row.problem) || '' };
  } catch (e) { return { ok: false, msg: e.message }; }
}

let fails = 0;
function ok(cond, msg, extra) {
  console.log((cond ? '  ✓ ' : '  ✗ ') + msg + (extra ? '  ' + extra : ''));
  if (!cond) fails++;
}

(async () => {
  /* ---------- hyrja e pronarit ---------- */
  const creds = fs.readFileSync(process.env.SPRINT_DATA + '/hyrja.txt', 'utf8');
  const email = (creds.match(/Email:\s*(\S+)/) || [])[1];
  const pass  = (creds.match(/Fjalëkalimi:\s*(\S+)/) || [])[1];
  const tok = await call('/auth/v1/token?grant_type=password', {
    method: 'POST', headers: { 'Content-Type': 'application/json', apikey: 'local' },
    body: JSON.stringify({ email, password: pass }) });
  admin = tok.access_token;

  /* Çdo nisje e provës e nis nga pastër: bllokimet e mbetura nga një provë e
     mëparshme do ta bënin rezultatin të varej nga radha e nisjes. */
  await rpc('pin_unlock');

  /* ---------- një kuzhinier me kod të vetin ---------- */
  const kodi = String(200000 + Math.floor(Math.random() * 700000));
  const emri = 'Prova e kodit ' + Date.now().toString().slice(-6);
  const [s] = await call('/rest/v1/staff', {
    method: 'POST', headers: H({ Prefer: 'return=representation' }),
    body: JSON.stringify({ name: emri, role: 'kitchen', active: true }) });
  await rpc('set_staff_pin', { p_staff_id: s.id, p_pin: kodi });

  const tab = 'tableti i kuzhines ' + Date.now();
  const hua = 'telefon i huaj ' + Date.now();

  console.log('\n═══ 1. NJË PAJISJE E HUAJ NUK E MBYLL EKIPIN ═══');
  ok((await hyr(kodi, tab)).ok, 'kuzhinieri hyn me kodin e vet');

  for (let i = 0; i < 5; i++) await hyr('999999', hua);
  ok((await hyr(kodi, tab)).ok,
     'pas 5 kodeve të gabuara nga një pajisje tjetër, kuzhinieri prapë hyn');

  const bll = await hyr(kodi, hua);
  ok(!bll.ok && /bllokua/.test(bll.msg), 'pajisja që gaboi u bllokua');
  ok(/15 minuta/.test(bll.msg), 'mesazhi thotë sa duhet pritur', bll.msg);

  console.log('\n═══ 2. KODI I SAKTË E RINIS NUMËRIMIN ═══');
  const dyt = 'tablet i dyte ' + Date.now();
  for (let i = 0; i < 4; i++) await hyr('888888', dyt);
  ok((await hyr(kodi, dyt)).ok, 'pas 4 gabimeve, kodi i saktë punon');
  for (let i = 0; i < 4; i++) await hyr('888888', dyt);
  ok((await hyr(kodi, dyt)).ok, 'numërimi nisi nga zero — nuk u bllokua te e 5-ta');

  console.log('\n═══ 3. HAMENDËSIMI ME SHUMË PROVA NDALET ═══');
  let ndaloi = 0;
  for (let i = 0; i < 60; i++) {
    const x = await hyr(String(310000 + i), 'i huaj ' + Date.now() + '-' + i);
    if (/Shumë kode/.test(x.msg)) { ndaloi = i; break; }
  }
  ok(ndaloi > 0 && ndaloi < 40,
     'ndërrimi i emrit të pajisjes në çdo provë nuk i shpëton bllokimit',
     'u ndal te prova ' + ndaloi);

  console.log('\n═══ 4. PRONARI I HAP BLLOKIMET ═══');
  const lista = await rpc('pin_locked');
  ok(Array.isArray(lista) && lista.length > 0,
     'paneli i sheh pajisjet e bllokuara', lista.length + ' pajisje');

  let publike = false;
  try {
    await rpc('pin_locked', {}, { 'Content-Type': 'application/json', apikey: 'local' });
    publike = true;
  } catch (e) { /* pritet */ }
  ok(!publike, 'lista e bllokimeve nuk hapet pa hyrje');

  await rpc('pin_unlock');
  ok((await hyr(kodi, hua)).ok, 'pajisja e bllokuar hyn menjëherë pasi pronari i hapi');

  /* ---------- pastrimi ---------- */
  await call('/rest/v1/staff?id=eq.' + s.id, { method: 'DELETE', headers: H() });

  console.log(fails ? '\n  ' + fails + ' provë(a) dështuan\n' : '\n  Të gjitha kaluan.\n');
  process.exit(fails ? 1 : 0);
})().catch((e) => { console.error('\n  Gabim:', e.message, '\n'); process.exit(1); });
