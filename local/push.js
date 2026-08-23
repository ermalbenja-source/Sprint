/* ============================================================================
   SPRINT — Njoftimet push, pa asnjë varësi.

   Web Push do dy gjëra: një çelës VAPID që e identifikon serverin te shërbimi
   i njoftimeve (Google, Mozilla, Apple), dhe një mesazh të fshehtëzuar që as
   shërbimi vetë nuk e lexon dot. Të dyja bëhen me node:crypto.

   RFC 8291 (fshehtëzimi aes128gcm) dhe RFC 8292 (VAPID).

   KUFIRI QË DUHET DITUR: shfletuesi e regjistron «service worker»-in vetëm mbi
   HTTPS ose te localhost. Në një rrjet lokal me http://192.168.x.x njoftimet
   NUK ndizen dot — kjo nuk është zgjedhje e programit, është rregull i
   shfletuesit. Prandaj ekziston edhe rruga e dytë: zilja dhe dridhja brenda
   faqes, që punon kudo sa kohë ekrani është hapur.
   ========================================================================== */
'use strict';
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const https = require('node:https');

const b64u = (buf) => Buffer.from(buf).toString('base64')
  .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const unb64u = (s) => Buffer.from(String(s).replace(/-/g, '+').replace(/_/g, '/'), 'base64');

/* ---------- çelësat VAPID ---------- */

/** Krijon një palë çelësash P-256 dhe i kthen në formën që pret Web Push. */
function newKeys() {
  const { publicKey, privateKey } = crypto.generateKeyPairSync('ec', { namedCurve: 'prime256v1' });
  const jwk = publicKey.export({ format: 'jwk' });
  const raw = Buffer.concat([Buffer.from([4]), unb64u(jwk.x), unb64u(jwk.y)]);
  return {
    publicKey: b64u(raw),
    privateKey: b64u(unb64u(privateKey.export({ format: 'jwk' }).d)),
  };
}

/** Lexon çelësat nga dosja e të dhënave, ose i krijon herën e parë. */
function keys(dir) {
  const file = path.join(dir, 'vapid.json');
  try {
    const k = JSON.parse(fs.readFileSync(file, 'utf8'));
    if (k && k.publicKey && k.privateKey) return k;
  } catch (e) {}
  const k = newKeys();
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(file, JSON.stringify(k, null, 2));
  // Çelësi privat është sekret: kush e ka, dërgon njoftime në emrin tënd.
  try { fs.chmodSync(file, 0o600); } catch (e) {}
  return k;
}

/** Rindërton çelësin privat nga `d`, që të mund të nënshkruajë. */
function privKey(k) {
  const pub = unb64u(k.publicKey);          // 0x04 || x(32) || y(32)
  return crypto.createPrivateKey({
    key: {
      kty: 'EC', crv: 'P-256',
      x: b64u(pub.subarray(1, 33)),
      y: b64u(pub.subarray(33, 65)),
      d: k.privateKey,
    },
    format: 'jwk',
  });
}

/* ---------- VAPID JWT ---------- */

function jwt(k, audience, subject) {
  const head = b64u(JSON.stringify({ typ: 'JWT', alg: 'ES256' }));
  const body = b64u(JSON.stringify({
    aud: audience,
    exp: Math.floor(Date.now() / 1000) + 12 * 3600,
    sub: subject || 'mailto:admin@sprint.local',
  }));
  // Nënshkrimi duhet r||s i papërpunuar, jo DER — prandaj ieee-p1363.
  const sig = crypto.sign('sha256', Buffer.from(head + '.' + body),
    { key: privKey(k), dsaEncoding: 'ieee-p1363' });
  return head + '.' + body + '.' + b64u(sig);
}

/* ---------- fshehtëzimi i mesazhit ---------- */

const hmac = (key, data) => crypto.createHmac('sha256', key).update(data).digest();
const hkdf = (salt, ikm, info, len) =>
  hmac(hmac(salt, ikm), Buffer.concat([info, Buffer.from([1])])).subarray(0, len);

/** Mesazhi fshehtëzohet për këtë pajisje të vetme. Shërbimi i njoftimeve e
    përcjell pa e lexuar dot — as ne nuk mund ta lexojmë pas nisjes. */
function encrypt(payload, p256dh, auth) {
  const uaPublic = unb64u(p256dh);
  const authSecret = unb64u(auth);

  const ecdh = crypto.createECDH('prime256v1');
  ecdh.generateKeys();
  const asPublic = ecdh.getPublicKey();
  const shared = ecdh.computeSecret(uaPublic);

  const salt = crypto.randomBytes(16);
  const keyInfo = Buffer.concat([
    Buffer.from('WebPush: info\0'), uaPublic, asPublic]);
  const ikm = hkdf(authSecret, shared, keyInfo, 32);

  const cek = hkdf(salt, ikm, Buffer.from('Content-Encoding: aes128gcm\0'), 16);
  const nonce = hkdf(salt, ikm, Buffer.from('Content-Encoding: nonce\0'), 12);

  const c = crypto.createCipheriv('aes-128-gcm', cek, nonce);
  const body = Buffer.concat([
    c.update(Buffer.concat([Buffer.from(payload, 'utf8'), Buffer.from([2])])),
    c.final(), c.getAuthTag()]);

  const rs = Buffer.alloc(4);
  rs.writeUInt32BE(4096, 0);
  return Buffer.concat([salt, rs, Buffer.from([asPublic.length]), asPublic, body]);
}

/* ---------- dërgimi ---------- */

/** Dërgon një njoftim te një pajisje.
    Kthen { ok, status }. 404 ose 410 do të thotë që pajisja nuk e pranon më
    këtë abonim — thirrësi duhet ta fshijë. */
function send(k, sub, payload, opt) {
  return new Promise((resolve) => {
    let u;
    try { u = new URL(sub.endpoint); } catch (e) { return resolve({ ok: false, status: 0 }); }

    let bodyBuf, headers;
    try {
      bodyBuf = encrypt(JSON.stringify(payload), sub.p256dh, sub.auth);
      headers = {
        TTL: String((opt && opt.ttl) || 600),
        Urgency: (opt && opt.urgency) || 'high',
        'Content-Encoding': 'aes128gcm',
        'Content-Type': 'application/octet-stream',
        'Content-Length': bodyBuf.length,
        Authorization: 'vapid t=' + jwt(k, u.origin, opt && opt.subject)
          + ', k=' + k.publicKey,
      };
    } catch (e) { return resolve({ ok: false, status: 0, error: e.message }); }

    const req = https.request({
      hostname: u.hostname, port: u.port || 443, path: u.pathname + u.search,
      method: 'POST', headers, timeout: 10000,
    }, (res) => {
      res.resume();
      resolve({ ok: res.statusCode >= 200 && res.statusCode < 300, status: res.statusCode });
    });
    req.on('timeout', () => { req.destroy(); resolve({ ok: false, status: 0 }); });
    req.on('error', (e) => resolve({ ok: false, status: 0, error: e.message }));
    req.end(bodyBuf);
  });
}

module.exports = { keys, newKeys, send, jwt, encrypt, b64u, unb64u };
