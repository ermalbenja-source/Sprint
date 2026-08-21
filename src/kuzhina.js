/* ============================================================================
   SPRINT — Logjika e ekranit të kuzhinës.
   Një ekran i vetëm, i prekur me duar të zëna: pak butona, të mëdhenj, dhe
   asnjë veprim që s'kthehet dot mbrapsht.
   ========================================================================== */
(function () {
  const S = window.SPRINT;
  const store = S.store;
  const $ = (s) => document.querySelector(s);
  const $$ = (s) => Array.from(document.querySelectorAll(s));
  const esc = (t) => String(t == null ? '' : t)
    .replace(/[&<>"']/g, (c) => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c]));

  const K = {
    orders: [],
    phases: [],
    ticked: {},        // { orderId: [indeksat e pjatëve të bëra] }
    sound: true,
    seen: new Set(),
    lastBump: null,
    timer: null,
    poll: null,
  };

  const LS_TICK = 'sprint-kds-ticks';
  const LS_SND  = 'sprint-kds-sound';

  try { K.ticked = JSON.parse(localStorage.getItem(LS_TICK) || '{}') || {}; } catch (e) {}
  try { K.sound = localStorage.getItem(LS_SND) !== '0'; } catch (e) {}

  /* ══════════════════ HYRJA ══════════════════ */

  let pin = '';
  const showPin = () => { $('#pinShow').textContent = '•'.repeat(pin.length); };

  function gateErr(m) {
    $('#gateErr').textContent = m || '';
    if (m) { $('#pinShow').classList.add('err'); setTimeout(() => $('#pinShow').classList.remove('err'), 320); }
  }

  async function tryLogin() {
    if (pin.length < 4) return gateErr('Kodi ka të paktën 4 shifra.');
    try {
      const sess = await store.staffLogin(pin, 'kuzhina');
      if (['kitchen', 'manager', 'owner'].indexOf(sess.role) < 0) {
        await store.staffLogout();
        pin = ''; showPin();
        return gateErr('Ky kod nuk e hap ekranin e kuzhinës.');
      }
      start(sess);
    } catch (e) {
      pin = ''; showPin();
      gateErr(e.message);
    }
  }

  $('.keys').addEventListener('click', (e) => {
    const b = e.target.closest('[data-k]');
    if (!b) return;
    const k = b.dataset.k;
    gateErr('');
    if (k === 'del') pin = pin.slice(0, -1);
    else if (k === 'ok') return tryLogin();
    else if (pin.length < 8) pin += k;
    showPin();
    if (pin.length === 8) tryLogin();
  });

  document.addEventListener('keydown', (e) => {
    if (!$('#gate').classList.contains('hide')) {
      if (/^[0-9]$/.test(e.key) && pin.length < 8) { pin += e.key; showPin(); gateErr(''); }
      else if (e.key === 'Backspace') { pin = pin.slice(0, -1); showPin(); }
      else if (e.key === 'Enter') tryLogin();
    }
  });

  /* ══════════════════ ZILJA ══════════════════ */

  let ac;
  function beep() {
    if (!K.sound) return;
    try {
      ac = ac || new (window.AudioContext || window.webkitAudioContext)();
      [0, 0.18].forEach((t, i) => {
        const o = ac.createOscillator(), g = ac.createGain();
        o.type = 'sine';
        o.frequency.value = i ? 1180 : 880;
        g.gain.setValueAtTime(0.0001, ac.currentTime + t);
        g.gain.exponentialRampToValueAtTime(0.32, ac.currentTime + t + 0.02);
        g.gain.exponentialRampToValueAtTime(0.0001, ac.currentTime + t + 0.16);
        o.connect(g); g.connect(ac.destination);
        o.start(ac.currentTime + t); o.stop(ac.currentTime + t + 0.18);
      });
    } catch (e) {}
  }

  /* ══════════════════ KOHA ══════════════════ */

  const mmss = (ms) => {
    const s = Math.max(0, Math.round(ms / 1000));
    return String(Math.floor(s / 60)).padStart(2, '0') + ':' + String(s % 60).padStart(2, '0');
  };

  /** Sa minuta i ka premtuar kjo fazë; përdoret për ngjyrat. */
  function targetFor(status) {
    const p = K.phases.find((x) => x.key === status);
    return (p && p.target_minutes) || (status === 'preparing' ? 20 : 5);
  }

  /* Ngjyra flet para se të lexosh: e qetë → e verdhë → e kuqe që pulson. */
  function clockOf(o) {
    const since = new Date(o.kitchen_at || o.accepted_at || o.created_at).getTime();
    const mins = (Date.now() - since) / 60000;
    const t = targetFor(o.status === 'ready' ? 'ready' : 'preparing');
    return {
      txt: mmss(Date.now() - since),
      cls: mins > t ? 'late' : mins > t * 0.7 ? 'warn' : '',
    };
  }

  /* ══════════════════ VIZATIMI ══════════════════ */

  const KIND = { pickup: 'Marr vetë', delivery: 'Dërgesë' };

  function itemsOf(o) {
    const arr = Array.isArray(o.items) ? o.items : [];
    return arr.map((x) => ({ q: Number(x.qty) || 1, n: x.name || x.id || '' }));
  }

  function render() {
    const list = K.orders;
    if (!list.length) {
      $('#grid').innerHTML = '<p class="empty">Asnjë porosi në pritje. 🍕</p>';
    } else {
      $('#grid').innerHTML = list.map((o) => {
        const c = clockOf(o);
        const ticks = K.ticked[o.id] || [];
        const items = itemsOf(o).map((it, i) =>
          `<div class="t-line${ticks.indexOf(i) >= 0 ? ' done' : ''}" data-tick="${esc(o.id)}" data-i="${i}">
             <span class="q">${it.q}×</span><span>${esc(it.n)}</span></div>`).join('');

        const act = o.status === 'ready'
          ? `<button class="big b-start" data-bump="${esc(o.id)}" data-to="preparing">↩ Kthe në furrë</button>`
          : o.status === 'preparing'
            ? `<button class="big b-ready" data-bump="${esc(o.id)}" data-to="ready">GATI</button>
               <button class="b-back" data-bump="${esc(o.id)}" data-to="preparing" title="Rinis kohën">↺</button>`
            : `<button class="big b-start" data-bump="${esc(o.id)}" data-to="preparing">Fillo</button>`;

        return `<article class="tick s-${esc(o.status)} ${c.cls}" data-ord="${esc(o.id)}">
          <div class="t-hd">
            <span class="t-no">#${o.number}</span>
            <span class="t-kind${o.kind === 'pickup' ? ' pick' : ''}">${KIND[o.kind] || ''}</span>
            <span class="t-clock" data-clock="${esc(o.id)}">${c.txt}</span>
          </div>
          <div class="t-items">
            ${items}
            ${o.note ? `<p class="t-note">📝 ${esc(o.note)}</p>` : ''}
          </div>
          <div class="t-act">${act}</div>
        </article>`;
      }).join('');
    }
    $('#cPrep').textContent = list.filter((o) => o.status === 'preparing').length;
    $('#cReady').textContent = list.filter((o) => o.status === 'ready').length;
  }

  /* Vetëm orët rifreskohen çdo sekondë — jo gjithë ekrani, që prekja të mos humbasë. */
  function tickClocks() {
    K.orders.forEach((o) => {
      const el = document.querySelector(`[data-clock="${CSS.escape(o.id)}"]`);
      if (!el) return;
      const c = clockOf(o);
      el.textContent = c.txt;
      const card = el.closest('.tick');
      card.classList.toggle('warn', c.cls === 'warn');
      card.classList.toggle('late', c.cls === 'late');
    });
  }

  /* ══════════════════ TË DHËNAT ══════════════════ */

  async function load(silent) {
    try {
      const rows = (await store.kdsOrders()) || [];
      $('#offline').classList.remove('on');

      // zilja vetëm për porosi që s'i kemi parë ende
      const fresh = rows.filter((o) => !K.seen.has(o.id) && o.status !== 'ready');
      rows.forEach((o) => K.seen.add(o.id));
      if (!silent && fresh.length) beep();

      K.orders = rows;
      render();
    } catch (e) {
      // Interneti bie shpesh në dyqan. Ekrani mban atë që ka, dhe e thotë hapur.
      $('#offline').classList.add('on');
      if (/kod|Hyr|sesion/i.test(e.message)) logout();
    }
  }

  async function bump(id, to) {
    const o = K.orders.find((x) => x.id === id);
    if (!o) return;
    const from = o.status;
    o.status = to;                       // përgjigje e menjëhershme; rifreskimi e vërteton
    if (to === 'preparing') o.kitchen_at = new Date().toISOString();
    render();

    try {
      await store.kdsBump(id, to);
      if (to === 'ready') {
        K.lastBump = { id, from };
        $('#undoNo').textContent = '#' + o.number;
        $('#undo').classList.add('on');
        clearTimeout(K.undoT);
        K.undoT = setTimeout(() => $('#undo').classList.remove('on'), 7000);
      }
      load(true);
    } catch (e) {
      o.status = from; render();
      $('#offline').classList.add('on');
    }
  }

  /* ══════════════════ NISJA ══════════════════ */

  function start(sess) {
    $('#gate').classList.add('hide');
    $('#app').classList.remove('hide');
    $('#whoTxt').textContent = sess.name;
    $('#sndBtn').classList.toggle('off', !K.sound);

    store.publicPhases().catch(() => []).then(() => {});
    store.fetchPhases().then((p) => { K.phases = p || []; }).catch(() => {});

    load();
    clearInterval(K.poll); clearInterval(K.timer);
    K.poll = setInterval(() => { if (!document.hidden) load(true); }, 8000);
    K.timer = setInterval(tickClocks, 1000);
    document.addEventListener('visibilitychange', () => { if (!document.hidden) load(true); });
  }

  async function logout() {
    clearInterval(K.poll); clearInterval(K.timer);
    await store.staffLogout();
    K.seen.clear(); pin = ''; showPin();
    $('#app').classList.add('hide');
    $('#gate').classList.remove('hide');
  }

  /* ══════════════════ LIDHJET ══════════════════ */

  $('#app').addEventListener('click', (e) => {
    const b = e.target.closest('[data-bump]');
    if (b) return bump(b.dataset.bump, b.dataset.to);

    const t = e.target.closest('[data-tick]');
    if (t) {
      const id = t.dataset.tick, i = Number(t.dataset.i);
      const arr = K.ticked[id] || (K.ticked[id] = []);
      const at = arr.indexOf(i);
      if (at >= 0) arr.splice(at, 1); else arr.push(i);
      try { localStorage.setItem(LS_TICK, JSON.stringify(K.ticked)); } catch (err) {}
      t.classList.toggle('done', at < 0);
      return;
    }

    if (e.target.closest('#sndBtn')) {
      K.sound = !K.sound;
      try { localStorage.setItem(LS_SND, K.sound ? '1' : '0'); } catch (err) {}
      $('#sndBtn').classList.toggle('off', !K.sound);
      if (K.sound) beep();
      return;
    }
    if (e.target.closest('#outBtn')) return logout();
  });

  $('#undoBtn').addEventListener('click', () => {
    if (!K.lastBump) return;
    bump(K.lastBump.id, 'preparing');
    K.lastBump = null;
    $('#undo').classList.remove('on');
  });

  /* Sesioni i ruajtur e kalon hyrjen — tableti nuk e shkruan kodin çdo turn. */
  store.staffSession().then((sess) => {
    if (sess && ['kitchen', 'manager', 'owner'].indexOf(sess.role) >= 0) start(sess);
    else showPin();
  }).catch(() => showPin());
})();
