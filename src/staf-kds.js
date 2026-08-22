/* ============================================================================
   SPRINT — Pamja e kuzhinës brenda aplikacionit të stafit.
   Regjistrohet te SPRINT.views.kds; guaska e nis dhe e ndal sipas rolit.
   ========================================================================== */
(function () {
  const S = window.SPRINT;
  const store = S.store;
  const $ = (s) => document.querySelector(s);
  const esc = (t) => String(t == null ? '' : t)
    .replace(/[&<>"']/g, (c) => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c]));

  const LS_TICK = 'sprint-kds-ticks';
  const LS_SND  = 'sprint-kds-sound';

  const K = { orders: [], phases: [], ticked: {}, sound: true, seen: new Set(),
              lastBump: null, timer: null, undoT: null, live: false };

  try { K.ticked = JSON.parse(localStorage.getItem(LS_TICK) || '{}') || {}; } catch (e) {}
  try { K.sound = localStorage.getItem(LS_SND) !== '0'; } catch (e) {}

  /* ---------- zilja ---------- */
  let ac;
  function beep() {
    if (!K.sound) return;
    try {
      ac = ac || new (window.AudioContext || window.webkitAudioContext)();
      [0, 0.18].forEach((t, i) => {
        const o = ac.createOscillator(), g = ac.createGain();
        o.type = 'sine'; o.frequency.value = i ? 1180 : 880;
        g.gain.setValueAtTime(0.0001, ac.currentTime + t);
        g.gain.exponentialRampToValueAtTime(0.32, ac.currentTime + t + 0.02);
        g.gain.exponentialRampToValueAtTime(0.0001, ac.currentTime + t + 0.16);
        o.connect(g); g.connect(ac.destination);
        o.start(ac.currentTime + t); o.stop(ac.currentTime + t + 0.18);
      });
    } catch (e) {}
  }

  /* ---------- koha ---------- */
  const mmss = (ms) => {
    const s = Math.max(0, Math.round(ms / 1000));
    return String(Math.floor(s / 60)).padStart(2, '0') + ':' + String(s % 60).padStart(2, '0');
  };
  function targetFor(status) {
    const p = K.phases.find((x) => x.key === status);
    return (p && p.target_minutes) || (status === 'preparing' ? 20 : 5);
  }
  function clockOf(o) {
    const since = new Date(o.kitchen_at || o.accepted_at || o.created_at).getTime();
    const mins = (Date.now() - since) / 60000;
    const t = targetFor(o.status === 'ready' ? 'ready' : 'preparing');
    return { txt: mmss(Date.now() - since),
             cls: mins > t ? 'late' : mins > t * 0.7 ? 'warn' : '' };
  }

  /* ---------- vizatimi ---------- */
  const KIND = { pickup: 'Marr vetë', delivery: 'Dërgesë' };
  const itemsOf = (o) => (Array.isArray(o.items) ? o.items : [])
    .map((x) => ({ q: Number(x.qty) || 1, n: x.name || x.id || '' }));

  function render() {
    const list = K.orders;
    if (!list.length) {
      $('#v-kds').innerHTML = '<p class="empty">Asnjë porosi në pritje. 🍕</p>';
    } else {
      $('#v-kds').innerHTML = list.map((o) => {
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
          <div class="t-items">${items}${o.note ? `<p class="t-note">📝 ${esc(o.note)}</p>` : ''}</div>
          <div class="t-act">${act}</div>
        </article>`;
      }).join('');
    }
    $('#cPrep').textContent = list.filter((o) => o.status === 'preparing').length;
    $('#cReady').textContent = list.filter((o) => o.status === 'ready').length;
  }

  /* Vetëm orët rifreskohen çdo sekondë, që prekja të mos humbasë nën gisht. */
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

  async function load(silent) {
    if (!K.live) return;
    try {
      const rows = (await store.kdsOrders()) || [];
      S.staf.offline(false);
      const fresh = rows.filter((o) => !K.seen.has(o.id) && o.status !== 'ready');
      rows.forEach((o) => K.seen.add(o.id));
      if (!silent && fresh.length) beep();
      K.orders = rows;
      render();
    } catch (e) {
      S.staf.offline(true);
      if (/kod|Hyr|esion/i.test(e.message)) S.staf.logout();
    }
  }

  async function bump(id, to) {
    const o = K.orders.find((x) => x.id === id);
    if (!o) return;
    const from = o.status;
    o.status = to;
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
      S.staf.offline(true);
    }
  }

  /* ---------- lidhjet ---------- */
  document.addEventListener('click', (e) => {
    if (!K.live) return;
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
    }
  });

  $('#undoBtn').addEventListener('click', () => {
    if (!K.lastBump) return;
    bump(K.lastBump.id, 'preparing');
    K.lastBump = null;
    $('#undo').classList.remove('on');
  });

  S.views = S.views || {};
  S.views.kds = {
    label: 'Kuzhina',
    start() {
      K.live = true;
      $('#v-kds').classList.remove('hide');
      $('#kdsCount').classList.remove('hide');
      $('#sndBtn').classList.remove('hide');
      $('#sndBtn').classList.toggle('off', !K.sound);
      store.fetchPhases().then((p) => { K.phases = p || []; }).catch(() => {});
      load();
      clearInterval(K.timer);
      K.timer = setInterval(tickClocks, 1000);
    },
    stop() {
      K.live = false;
      clearInterval(K.timer);
      $('#v-kds').classList.add('hide');
      $('#kdsCount').classList.add('hide');
      $('#sndBtn').classList.add('hide');
      $('#undo').classList.remove('on');
    },
    refresh: () => load(true),
  };
})();
