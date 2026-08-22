/* ============================================================================
   SPRINT — Pamjet e gatimit brenda aplikacionit të stafit.

   Dy stacione, i njëjti ekran: kuzhina (SPRINT.views.kds) dhe furra e picës
   (SPRINT.views.oven). Secili sheh vetëm rreshtat e vet; rreshtat e stacionit
   tjetër shfaqen të zbehta, vetëm si kontekst — që furra ta dijë se pica del
   bashkë me një tavë, dhe të mos e nxjerrë dhjetë minuta para saj.

   Guaska te staf.js e nis dhe e ndal atë që i takon rolit.
   ========================================================================== */
(function () {
  const S = window.SPRINT;
  const store = S.store;
  const $ = (s) => document.querySelector(s);
  const esc = (t) => String(t == null ? '' : t)
    .replace(/[&<>"']/g, (c) => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c]));

  const LS_TICK = 'sprint-kds-ticks';
  const LS_SND  = 'sprint-kds-sound';

  const STATION_NAME = { kitchen: 'kuzhinën', oven: 'furrën' };

  let sound = true;
  let ticked = {};
  try { ticked = JSON.parse(localStorage.getItem(LS_TICK) || '{}') || {}; } catch (e) {}
  try { sound = localStorage.getItem(LS_SND) !== '0'; } catch (e) {}

  /* ---------- zilja ---------- */
  let ac;
  function beep() {
    if (!sound) return;
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

  const KIND = { pickup: 'Marr vetë', delivery: 'Dërgesë' };

  /* Cili stacion është aktiv tani — te ky shkojnë klikimet. */
  let active = null;

  /* ---------- një stacion ---------- */
  function makeStation(station, label, icon) {
    const K = { orders: [], phases: [], seen: new Set(),
                lastBump: null, timer: null, undoT: null, live: false };

    const mine = (o) => (Array.isArray(o.items) ? o.items : [])
      .filter((x) => (x.station || 'kitchen') === station);
    const theirs = (o) => (Array.isArray(o.items) ? o.items : [])
      .filter((x) => (x.station || 'kitchen') !== station && x.station !== 'none');

    function targetFor(status) {
      const p = K.phases.find((x) => x.key === status);
      return (p && p.target_minutes) || (status === 'preparing' ? 20 : 5);
    }
    function clockOf(o) {
      const since = new Date(o.kitchen_at || o.accepted_at || o.created_at).getTime();
      const mins = (Date.now() - since) / 60000;
      const t = targetFor(o.station_done ? 'ready' : 'preparing');
      return { txt: mmss(Date.now() - since),
               cls: mins > t ? 'late' : mins > t * 0.7 ? 'warn' : '' };
    }

    function render() {
      const list = K.orders;
      if (!list.length) {
        $('#v-kds').innerHTML = `<p class="empty">Asnjë porosi në pritje. ${icon}</p>`;
      } else {
        $('#v-kds').innerHTML = list.map((o) => {
          const c = clockOf(o);
          const tk = ticked[station + ':' + o.id] || [];
          const items = mine(o).map((it, i) =>
            `<div class="t-line${tk.indexOf(i) >= 0 ? ' done' : ''}" data-tick="${esc(o.id)}" data-i="${i}">
               <span class="q">${Number(it.qty) || 1}×</span><span>${esc(it.name || it.id || '')}</span></div>`).join('');

          // Rreshtat e stacionit tjetër: kontekst, jo punë. Nuk klikohen.
          const other = theirs(o);
          const otherHtml = other.length
            ? `<div class="t-other">edhe: ${other.map((it) =>
                 `${Number(it.qty) || 1}× ${esc(it.name || it.id || '')}`).join(' · ')}</div>`
            : '';

          // Pritja e stacionit tjetër: e jona u dha, porosia ende jo gati.
          const waiting = (o.waiting_on || []).filter((s) => s !== station);
          const wait = o.station_done && waiting.length
            ? `<div class="t-wait">⏳ Pret ${waiting.map((s) => STATION_NAME[s] || s).join(' dhe ')}</div>`
            : '';

          const act = o.station_done
            ? `<button class="big b-start" data-bump="${esc(o.id)}" data-to="preparing">↩ Kthe mbrapsht</button>`
            : `<button class="big b-ready" data-bump="${esc(o.id)}" data-to="ready">GATI</button>
               <button class="b-back" data-bump="${esc(o.id)}" data-to="preparing" title="Rinis kohën">↺</button>`;

          return `<article class="tick s-${o.station_done ? 'ready' : esc(o.status)} ${c.cls}" data-ord="${esc(o.id)}">
            <div class="t-hd">
              <span class="t-no">#${o.number}</span>
              <span class="t-kind${o.kind === 'pickup' ? ' pick' : ''}">${KIND[o.kind] || ''}</span>
              <span class="t-clock" data-clock="${esc(o.id)}">${c.txt}</span>
            </div>
            <div class="t-items">${items}${o.note ? `<p class="t-note">📝 ${esc(o.note)}</p>` : ''}${otherHtml}${wait}</div>
            <div class="t-act">${act}</div>
          </article>`;
        }).join('');
      }
      $('#cPrep').textContent = list.filter((o) => !o.station_done).length;
      $('#cReady').textContent = list.filter((o) => o.station_done).length;
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
        const rows = (await store.kdsOrders(station)) || [];
        S.staf.offline(false);
        const fresh = rows.filter((o) => !K.seen.has(o.id) && !o.station_done);
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
      const was = o.station_done;
      o.station_done = to === 'ready';
      if (to === 'preparing') o.kitchen_at = o.kitchen_at || new Date().toISOString();
      render();
      try {
        await store.kdsBump(id, to, station);
        if (to === 'ready') {
          K.lastBump = { id };
          $('#undoNo').textContent = '#' + o.number;
          $('#undo').classList.add('on');
          clearTimeout(K.undoT);
          K.undoT = setTimeout(() => $('#undo').classList.remove('on'), 7000);
        }
        load(true);
      } catch (e) {
        o.station_done = was; render();
        S.staf.offline(true);
      }
    }

    return {
      label, station, bump,
      tick(id, i) {
        const key = station + ':' + id;
        const arr = ticked[key] || (ticked[key] = []);
        const at = arr.indexOf(i);
        if (at >= 0) arr.splice(at, 1); else arr.push(i);
        try { localStorage.setItem(LS_TICK, JSON.stringify(ticked)); } catch (err) {}
        return at < 0;
      },
      undo() {
        if (!K.lastBump) return;
        bump(K.lastBump.id, 'preparing');
        K.lastBump = null;
        $('#undo').classList.remove('on');
      },
      start() {
        K.live = true;
        active = this;
        $('#v-kds').classList.remove('hide');
        $('#kdsCount').classList.remove('hide');
        $('#sndBtn').classList.remove('hide');
        $('#sndBtn').classList.toggle('off', !sound);
        store.fetchPhases().then((p) => { K.phases = p || []; }).catch(() => {});
        load();
        clearInterval(K.timer);
        K.timer = setInterval(tickClocks, 1000);
      },
      stop() {
        K.live = false;
        if (active === this) active = null;
        clearInterval(K.timer);
        $('#v-kds').classList.add('hide');
        $('#kdsCount').classList.add('hide');
        $('#sndBtn').classList.add('hide');
        $('#undo').classList.remove('on');
      },
      refresh: () => load(true),
    };
  }

  /* ---------- lidhjet: një dëgjues, i drejtuar te stacioni aktiv ---------- */
  document.addEventListener('click', (e) => {
    if (e.target.closest('#sndBtn')) {
      sound = !sound;
      try { localStorage.setItem(LS_SND, sound ? '1' : '0'); } catch (err) {}
      $('#sndBtn').classList.toggle('off', !sound);
      if (sound) beep();
      return;
    }
    if (!active) return;

    const b = e.target.closest('[data-bump]');
    if (b) return active.bump(b.dataset.bump, b.dataset.to);

    const t = e.target.closest('[data-tick]');
    if (t) t.classList.toggle('done', active.tick(t.dataset.tick, Number(t.dataset.i)));
  });

  $('#undoBtn').addEventListener('click', () => { if (active) active.undo(); });

  S.views = S.views || {};
  S.views.kds  = makeStation('kitchen', 'Kuzhina', '🍳');
  S.views.oven = makeStation('oven', 'Furra e picës', '🍕');
})();
