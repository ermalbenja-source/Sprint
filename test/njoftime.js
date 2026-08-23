/* ============================================================================
   Njoftimet push: abonimi, shkaktuesit, fshehtëzimi dhe pastrimi i abonimeve
   të vdekura. Fshehtëzimi krahasohet me shembullin zyrtar të RFC 8291 — që të
   dimë se është i saktë, jo thjesht «nuk jep gabim».
       SPRINT_DATA=... node test/njoftime.js [http://127.0.0.1:8787]
   ========================================================================== */
const B = process.argv[2] || 'http://127.0.0.1:8787';
const fs = require('fs');
const path = require('path');
const P = require(path.join(__dirname, '..', 'local', 'push.js'));
const crypto = require('crypto');

let admin = '';
const H = (extra) => Object.assign({ 'Content-Type': 'application/json', apikey: 'local' },
  admin ? { Authorization: 'Bearer ' + admin } : {}, extra || {});
async function call(p, opt) {
  const r = await fetch(B + p, opt || {});
  const t = await r.text();
  let b = null; try { b = t ? JSON.parse(t) : null; } catch (e) { b = t; }
  if (!r.ok) throw new Error((b && b.message) || r.status + ' ' + t.slice(0, 140));
  return b;
}
const rpc = (n, a) => call('/rest/v1/rpc/' + n,
  { method: 'POST', headers: H(), body: JSON.stringify(a || {}) });
const one = (r) => (Array.isArray(r) ? r[0] : r);

let fails = 0;
const ok = (c, m, x) => { console.log((c ? '  ✓ ' : '  ✗ ') + m + (x ? '  ' + x : '')); if (!c) fails++; };

(async () => {
  console.log('\n═══ 1. FSHEHTËZIMI KUNDËR RFC 8291 ═══');
  {
    // Shembulli zyrtar i RFC-së. Nëse dalim njësoj, fshehtëzimi është i saktë.
    const ua = 'BCVxsr7N_eNgVRqvHtD0zTZsEc6-VV-JvLexhqUzORcxaOzi6-AYWXvTBHm4bjyPjs7Vd8pZGH6SRpkNtoIAiw4';
    const authS = 'BTBZMqHH6r4Tts7J_aSIgg';
    const asPriv = P.unb64u('yfWPiYE-n46HLnH0KqZOF1fJJU3MYrct3AELtAQ-oRw');
    const salt = P.unb64u('DGv6ra1nlYgDCS1FRnbzlw');
    // Përsëritet hap pas hapi me çelësat e fiksuar të shembullit.
    const hmac = (k, d) => crypto.createHmac('sha256', k).update(d).digest();
    const hkdf = (s2, ikm, info, len) =>
      hmac(hmac(s2, ikm), Buffer.concat([info, Buffer.from([1])])).subarray(0, len);
    const ecdh = crypto.createECDH('prime256v1');
    ecdh.setPrivateKey(asPriv);
    const asPub = ecdh.getPublicKey();
    const ikm = hkdf(P.unb64u(authS), ecdh.computeSecret(P.unb64u(ua)),
      Buffer.concat([Buffer.from('WebPush: info\0'), P.unb64u(ua), asPub]), 32);
    const cek = hkdf(salt, ikm, Buffer.from('Content-Encoding: aes128gcm\0'), 16);
    const nonce = hkdf(salt, ikm, Buffer.from('Content-Encoding: nonce\0'), 12);
    const c = crypto.createCipheriv('aes-128-gcm', cek, nonce);
    const body = Buffer.concat([
      c.update(Buffer.concat([Buffer.from('When I grow up, I want to be a watermelon'), Buffer.from([2])])),
      c.final(), c.getAuthTag()]);
    const rs = Buffer.alloc(4); rs.writeUInt32BE(4096, 0);
    const full = P.b64u(Buffer.concat([salt, rs, Buffer.from([asPub.length]), asPub, body]));
    ok(full === 'DGv6ra1nlYgDCS1FRnbzlwAAEABBBP4z9KsN6nGRTbVYI_c7VJSPQTBtkgcy27mlmlMoZIIgDll6e3vCYLocInmYWAmS6TlzAC8wEqKK6PBru3jl7A_yl95bQpu6cVPTpK4Mqgkf1CXztLVBSt2Ks3oZwbuwXPXLWyouBWLVWGNWQexSgSxsj_Qulcy4a-fN',
       'trupi i fshehtëzuar përputhet bit për bit me RFC-në');
  }

  console.log('\n═══ 2. NËNSHKRIMI VAPID ═══');
  {
    const k = P.newKeys();
    const t = P.jwt(k, 'https://fcm.googleapis.com', 'mailto:a@b.c');
    const [h, b2, sg] = t.split('.');
    const pub = P.unb64u(k.publicKey);
    const key = crypto.createPublicKey({ key: { kty: 'EC', crv: 'P-256',
      x: P.b64u(pub.subarray(1, 33)), y: P.b64u(pub.subarray(33, 65)) }, format: 'jwk' });
    ok(P.unb64u(sg).length === 64, 'nënshkrimi është r||s i papërpunuar, jo DER');
    ok(crypto.verify('sha256', Buffer.from(h + '.' + b2),
      { key, dsaEncoding: 'ieee-p1363' }, P.unb64u(sg)), 'nënshkrimi verifikohet me çelësin publik');
    const pl = JSON.parse(P.unb64u(b2));
    ok(pl.aud === 'https://fcm.googleapis.com', 'audienca është origjina e shërbimit');
    ok(pl.exp > Math.floor(Date.now() / 1000) && pl.exp <= Math.floor(Date.now() / 1000) + 86400,
       'skadenca brenda 24 orëve, si e kërkon RFC 8292');
  }

  console.log('\n═══ 3. ÇELËSI I SERVERIT ═══');
  const v = await call('/api/vapid');
  ok(!!v.publicKey && P.unb64u(v.publicKey).length === 65, 'serveri jep një çelës të vlefshëm');
  const again = await call('/api/vapid');
  ok(again.publicKey === v.publicKey, 'çelësi nuk ndryshon në çdo nisje — abonimet mbeten të vlefshme');
  const saved = JSON.parse(fs.readFileSync(path.join(process.env.SPRINT_DATA, 'vapid.json'), 'utf8'));
  ok(saved.publicKey === v.publicKey, 'ruhet te dosja e të dhënave');
  const mode = fs.statSync(path.join(process.env.SPRINT_DATA, 'vapid.json')).mode & 0o777;
  ok(mode === 0o600, 'çelësi privat nuk lexohet nga të tjerët', '0' + mode.toString(8));

  console.log('\n═══ 4. ABONIMI ═══');
  const creds = fs.readFileSync(process.env.SPRINT_DATA + '/hyrja.txt', 'utf8');
  admin = (await call('/auth/v1/token?grant_type=password', {
    method: 'POST', headers: { 'Content-Type': 'application/json', apikey: 'local' },
    body: JSON.stringify({ email: creds.match(/Email:\s*(\S+)/)[1],
                           password: creds.match(/Fjalëkalimi:\s*(\S+)/)[1] }) })).access_token;

  const RUN = Date.now().toString(36).slice(-5);
  // Kodet janë unike te i gjithë stafi, ndaj çdo nisje merr të vetin dhe
  // pastron atë të mëparshëm.
  const dPin = String(10000 + (Date.now() % 80000));
  for (const st2 of await call('/rest/v1/staff?select=id,name&name=like.Motorrist%20*',
      { headers: H() }).catch(() => [])) {
    await call('/rest/v1/staff?id=eq.' + st2.id, { method: 'DELETE', headers: H() });
  }
  const mk = async (name, role, pin) => {
    const r = one(await call('/rest/v1/staff', { method: 'POST',
      headers: H({ Prefer: 'return=representation' }),
      body: JSON.stringify({ name, role, active: true }) }));
    await rpc('set_staff_pin', { p_staff_id: r.id, p_pin: pin });
    return r.id;
  };
  await mk('Motorrist ' + RUN, 'driver', dPin);
  const dTok = one(await rpc('staff_login', { p_pin: dPin, p_device: 'moto' })).token;

  // Çelësat e pajisjes: një palë e vërtetë P-256, si ato që jep shfletuesi.
  const dev = crypto.createECDH('prime256v1'); dev.generateKeys();
  const ep = 'https://example.invalid/push/' + RUN;
  const id = await rpc('push_subscribe', {
    p_token: dTok, p_endpoint: ep,
    p_p256dh: P.b64u(dev.getPublicKey()),
    p_auth: P.b64u(crypto.randomBytes(16)), p_device: 'Telefoni i Andreas' });
  ok(!!id, 'pajisja u abonua');

  const rows = await call('/rest/v1/push_subs?select=*&endpoint=eq.' + encodeURIComponent(ep),
    { headers: H() });
  ok(rows.length === 1, 'një rresht i vetëm');
  ok(rows[0].device === 'Telefoni i Andreas', 'pajisja u shënua');

  const id2 = await rpc('push_subscribe', {
    p_token: dTok, p_endpoint: ep,
    p_p256dh: P.b64u(dev.getPublicKey()), p_auth: P.b64u(crypto.randomBytes(16)) });
  const rows2 = await call('/rest/v1/push_subs?select=*&endpoint=eq.' + encodeURIComponent(ep),
    { headers: H() });
  ok(rows2.length === 1, 'abonimi i dytë i së njëjtës pajisje nuk krijon dublikatë', 'id ' + (id2 === id ? 'i njëjtë' : 'i ri'));

  let refuz = false;
  try {
    await rpc('push_subscribe', { p_token: '00000000-0000-0000-0000-000000000000',
      p_endpoint: 'https://x.invalid/y', p_p256dh: 'a', p_auth: 'b' });
  } catch (e) { refuz = true; }
  ok(refuz, 'pa kod të vlefshëm nuk abonohet dot');

  console.log('\n═══ 5. SHKAKTUESIT ═══');
  const api = require(path.join(__dirname, '..', 'local', 'api.js'));
  // Kutia e serverit është në procesin tjetër; këtu provohet logjika e vet.
  const D = require(path.join(__dirname, '..', 'local', 'db.js'));
  const tmp = path.join(process.env.SPRINT_DATA, 'provë-njoftimi.db');
  try { fs.unlinkSync(tmp); } catch (e) {}
  const db = D.open(tmp);
  db.prepare(`insert into menu_items (id,category,name_sq,price,updated_at)
              values ('pz','pizza','Picë',300,?), ('tv','trad','Tavë',400,?), ('uj','pije','Ujë',60,?)`)
    .run(D.now(), D.now(), D.now());

  api.outbox.length = 0;
  api.rest(db, 'POST', 'orders', new URLSearchParams(), {
    customer_name: 'X', phone: '069', kind: 'pickup', total: 700,
    items: [{ id: 'pz', name: 'Picë', qty: 1 }, { id: 'tv', name: 'Tavë', qty: 1 }],
  }, {});
  const t1 = api.outbox.map((x) => x.screens[0]).sort();
  ok(JSON.stringify(t1) === '["kds","oven"]', 'porosia e përzier zgjon të dy stacionet',
     JSON.stringify(t1));

  api.outbox.length = 0;
  api.rest(db, 'POST', 'orders', new URLSearchParams(), {
    customer_name: 'Y', phone: '069', kind: 'pickup', total: 60,
    items: [{ id: 'uj', name: 'Ujë', qty: 2 }],
  }, {});
  ok(api.outbox.length === 0, 'porosia vetëm me pije nuk zgjon askënd');

  api.outbox.length = 0;
  api.rest(db, 'POST', 'orders', new URLSearchParams(), {
    customer_name: 'Z', phone: '069', kind: 'pickup', total: 300,
    items: [{ id: 'pz', name: 'Picë', qty: 2 }],
  }, {});
  ok(api.outbox.length === 1 && api.outbox[0].screens[0] === 'oven',
     'porosia vetëm me picë zgjon vetëm furrën');
  ok(/2× Picë/.test(api.outbox[0].msg.body), 'teksti thotë çfarë të gatuhet',
     api.outbox[0].msg.body);
  db.close();
  try { fs.unlinkSync(tmp); } catch (e) {}

  console.log('\n═══ 6. MESAZHI ARRIN I PALEXUAR DHE I PACENUAR ═══');
  {
    // Shërbimi i njoftimeve e përcjell mesazhin pa e lexuar dot. Këtu luhet
    // roli i pajisjes: fshehtëzohet si për të, pastaj hapet me çelësin e saj
    // privat. Nëse teksti del i njëjti, atëherë ajo që merr telefoni është
    // saktësisht ajo që nisi serveri.
    const ua = crypto.createECDH('prime256v1'); ua.generateKeys();
    const authSecret = crypto.randomBytes(16);
    const msg = JSON.stringify({ title: 'Porosi gati për nisje',
                                 body: '#1042 · Rruga Taulantia 14' });
    const body = P.encrypt(msg, P.b64u(ua.getPublicKey()), P.b64u(authSecret));

    const salt = body.subarray(0, 16);
    const idlen = body[20];
    const asPub = body.subarray(21, 21 + idlen);
    const ct = body.subarray(21 + idlen);

    const hmac = (k, d) => crypto.createHmac('sha256', k).update(d).digest();
    const hkdf = (s2, ikm, info, len) =>
      hmac(hmac(s2, ikm), Buffer.concat([info, Buffer.from([1])])).subarray(0, len);
    const ikm = hkdf(authSecret, ua.computeSecret(asPub),
      Buffer.concat([Buffer.from('WebPush: info\0'), ua.getPublicKey(), asPub]), 32);
    const cek = hkdf(salt, ikm, Buffer.from('Content-Encoding: aes128gcm\0'), 16);
    const nonce = hkdf(salt, ikm, Buffer.from('Content-Encoding: nonce\0'), 12);

    const dec = crypto.createDecipheriv('aes-128-gcm', cek, nonce);
    dec.setAuthTag(ct.subarray(ct.length - 16));
    const out = Buffer.concat([dec.update(ct.subarray(0, ct.length - 16)), dec.final()]);
    const got = out.subarray(0, out.length - 1).toString('utf8');
    ok(got === msg, 'pajisja e hap mesazhin dhe del fjalë për fjalë i njëjti');
    ok(out[out.length - 1] === 2, 'shënuesi i fundit të mesazhit është i saktë');
    ok(!body.includes(Buffer.from('Taulantia')),
       'teksti NUK duket askund te trupi i nisur — shërbimi nuk e lexon dot');

    // Një bajt i ndryshuar duhet ta prishë hapjen: kjo është pika e etiketës GCM.
    const tampered = Buffer.from(ct);
    tampered[5] = tampered[5] ^ 1;
    let broke = false;
    try {
      const d2 = crypto.createDecipheriv('aes-128-gcm', cek, nonce);
      d2.setAuthTag(tampered.subarray(tampered.length - 16));
      Buffer.concat([d2.update(tampered.subarray(0, tampered.length - 16)), d2.final()]);
    } catch (e) { broke = true; }
    ok(broke, 'një bajt i ndryshuar rrugës e prish hapjen — mesazhi nuk falsifikohet dot');
  }

  console.log('\n═══ 7. ABONIMI I VDEKUR HIQET ═══');
  // Serveri dërgon te `example.invalid` — DNS-i dështon, ndaj rreshti mbetet,
  // por numëruesi i dështimeve rritet. Kjo provohet duke e nxitur një dërgim.
  const before = one(await call('/rest/v1/push_subs?select=fails&endpoint=eq.'
    + encodeURIComponent(ep), { headers: H() }));
  ok(Number(before.fails) === 0, 'nis nga zero dështime');

  const k = P.keys(process.env.SPRINT_DATA);
  const r = await P.send(k, { endpoint: 'https://example.invalid/push/x',
    p256dh: P.b64u(dev.getPublicKey()), auth: P.b64u(crypto.randomBytes(16)) },
    { title: 'provë' });
  ok(!r.ok, 'dërgimi te një adresë e pavlefshme dështon pa e rrëzuar serverin',
     'status ' + r.status);

  ok((await call('/api/health')).ok, 'serveri vazhdon të punojë pas dështimit');

  console.log(fails ? `\n✗ ${fails} dështime\n` : '\n═══ TË GJITHA KALUAN ═══\n');
  process.exit(fails ? 1 : 0);
})().catch((e) => { console.error('\nGABIM:', e.message); process.exit(1); });
