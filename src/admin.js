/* ============================================================================
   SPRINT — Logjika e panelit të menaxhimit.
   Ndryshimet mbahen në një kopje pune; asgjë nuk shkon te faqja derisa
   të shtypet «Ruaj ndryshimet».
   ========================================================================== */
(function () {
  const S = window.SPRINT;
  const store = S.store;
  const $ = (s) => document.querySelector(s);
  const $$ = (s) => Array.from(document.querySelectorAll(s));
  const esc = (t) => String(t == null ? '' : t)
    .replace(/[&<>"']/g, (c) => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c]));
  const clone = (o) => JSON.parse(JSON.stringify(o));

  const ART = ['pizza','pizzaV','pizzaW','pizzaC','burger','gyros','sandwich','fries','wings',
               'steak','fish','pasta','salad','soup','tave','byrek','meze','coffee','beer',
               'dessert','drink'];
  const TAGS = ['top','new','hot','veg'];
  const TAG_SQ = { top:'I spikatur', new:'I ri', hot:'Pikante', veg:'Vegjetarian' };

  let draft = null;      // kopja e punës
  let saved = '';        // gjendja e fundit e ruajtur, si tekst, për krahasim
  let localMode = false; // pa Supabase
  let editing = null;    // id-ja e pjatës në sirtar

  /* ══════════════════ NDIHMËSA ══════════════════ */
  let toastT;
  function toast(msg, kind) {
    const el = $('#toast');
    el.textContent = msg;
    el.className = 'on ' + (kind || '');
    clearTimeout(toastT);
    toastT = setTimeout(() => { el.className = kind || ''; }, 3800);
  }
  const gateMsg = (msg, kind) => {
    const el = $('#gateMsg');
    el.textContent = msg || '';
    el.className = 'msg' + (msg ? ' on ' + (kind || 'err') : '');
  };
  const artSvg = (art) => `<svg viewBox="0 0 200 200"><use href="#art-${art || 'pizza'}"/></svg>`;
  const thumbOf = (m) => m.img
    ? `<img src="${esc(m.img)}" alt="" loading="lazy" decoding="async">`
    : artSvg(m.art);

  function markDirty() {
    const dirty = JSON.stringify(draft) !== saved;
    $('#saveBar').classList.toggle('on', dirty);
    const pill = $('#modePill');
    pill.textContent = dirty ? 'Ndryshime të paruajtura' : 'Gjithçka e ruajtur';
    pill.className = 'pill ' + (dirty ? 'dirty' : 'clean');
    if (dirty) {
      const n = countChanges();
      $('#saveTxt').textContent = n === 1 ? '1 ndryshim i paruajtur' : n + ' ndryshime të paruajtura';
    }
    try { localStorage.setItem('sprint-admin-draft', JSON.stringify(draft)); } catch (e) {}
  }
  function countChanges() {
    let old;
    try { old = JSON.parse(saved); } catch (e) { return 1; }
    let n = 0;
    const byId = {};
    (old.menu || []).forEach((m) => { byId[m.id] = JSON.stringify(m); });
    draft.menu.forEach((m) => { if (byId[m.id] !== JSON.stringify(m)) n++; delete byId[m.id]; });
    n += Object.keys(byId).length;
    if (JSON.stringify(old.settings) !== JSON.stringify(draft.settings)) n++;
    return n || 1;
  }

  /* ══════════════════ TË DHËNAT ══════════════════ */
  function seedDraft() {
    return {
      menu: clone(S.menu).map((m, i) => Object.assign({ available: true, sort: i * 10 }, m)),
      settings: {
        config: clone(S.config),
        categories: clone(S.categories),
        reviews: clone(S.reviews),
        stats: clone(S.stats),
      },
    };
  }

  async function loadData() {
    let payload = null;
    try { payload = await store.fetchAll(); }
    catch (e) { toast('Leximi nga Supabase dështoi: ' + e.message, 'err'); }

    if (payload && payload.menu && payload.menu.length) {
      const base = seedDraft();
      draft = {
        menu: payload.menu.map((m, i) => Object.assign({ available: true, sort: i * 10 }, m)),
        settings: Object.assign(base.settings, payload.settings || {}),
      };
    } else {
      draft = seedDraft();
    }
    saved = JSON.stringify(draft);
    renderAll();
    markDirty();
  }

  /* ══════════════════ HYRJA ══════════════════ */
  function showPanel() {
    $('#gate').classList.add('hide');
    $('#panel').classList.remove('hide');
    const u = store.currentUser();
    $('#whoTxt').textContent = localMode ? 'Vetëm në këtë pajisje' : (u ? u.email : '');
    $('#modeDot').className = 'dot' + (localMode ? ' local' : '');
    $('#pubMode').textContent = localMode
      ? 'Po punon pa Supabase: ndryshimet ruhen vetëm në këtë shfletues dhe NUK i shohin klientët. Lidh Supabase sipas hapave më poshtë.'
      : 'I lidhur me Supabase. Çdo ndryshim që ruan del menjëherë në faqe.';
    loadData();
    startOrderBoard();
  }

  $('#loginForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!store.configured) {
      gateMsg('Supabase nuk është konfiguruar ende te shared/config.js. Përdor «Provoje pa llogari».', 'warn');
      return;
    }
    const btn = $('#loginBtn');
    btn.disabled = true; btn.textContent = 'Po hyn…';
    try {
      await store.signIn($('#em').value.trim(), $('#pw').value);
      gateMsg(''); localMode = false; showPanel();
    } catch (err) {
      gateMsg(/invalid/i.test(err.message) ? 'Email-i ose fjalëkalimi nuk përputhen.' : err.message);
    } finally { btn.disabled = false; btn.textContent = 'Hyr në panel'; }
  });

  $('#localBtn').addEventListener('click', () => { localMode = true; showPanel(); });

  $('#outBtn').addEventListener('click', () => {
    if (JSON.stringify(draft) !== saved && !confirm('Ke ndryshime të paruajtura. Të dilet gjithsesi?')) return;
    store.signOut();
    localStorage.removeItem('sprint-admin-draft');
    location.reload();
  });

  /* ══════════════════ SKEDAT ══════════════════ */
  $$('.tab').forEach((t) => t.addEventListener('click', () => {
    $$('.tab').forEach((x) => x.classList.toggle('on', x === t));
    $$('.view').forEach((v) => v.classList.toggle('hide', v.id !== 'v-' + t.dataset.tab));
  }));

  /* ══════════════════ MENUJA ══════════════════ */
  function catName(id) {
    const c = draft.settings.categories.find((x) => x.id === id);
    return c ? c.sq : id;
  }

  function visibleItems() {
    const q = $('#q').value.trim().toLowerCase();
    const cat = $('#catFilter').value;
    return draft.menu.filter((m) => {
      if (cat !== 'all' && m.c !== cat) return false;
      if (!q) return true;
      return ((m.sq || '') + ' ' + (m.en || '') + ' ' + m.id).toLowerCase().includes(q);
    });
  }

  function renderItems() {
    const list = visibleItems();
    $('#cnt').textContent = list.length + ' nga ' + draft.menu.length;
    $('#itemList').innerHTML = list.length ? list.map((m) => `
      <div class="item${m.available === false ? ' off' : ''}" data-id="${esc(m.id)}">
        <span class="thumb">${thumbOf(m)}</span>
        <span class="nm">
          <b>${esc(m.sq)}</b>
          <span>${esc(catName(m.c))}${m.unit ? ' · ' + esc(m.unit) : ''}${m.note ? ' · ' + esc(m.note) : ''}</span>
          ${(m.tags || []).length ? `<span class="tagdots">${m.tags.map((t) =>
            `<span class="tagdot td-${t}">${esc(TAG_SQ[t] || t)}</span>`).join('')}</span>` : ''}
        </span>
        <span class="price-in"><input type="text" inputmode="numeric" value="${m.p}" data-price="${esc(m.id)}"
          aria-label="Çmimi i ${esc(m.sq)}"></span>
        <button class="sw${m.available === false ? '' : ' on'}" data-av="${esc(m.id)}"
          aria-label="Në menu" title="Shfaqet në menu"></button>
        <button class="btn btn-g btn-sm" data-edit="${esc(m.id)}">Hap</button>
      </div>`).join('') : '<p class="empty">Asnjë pjatë nuk përputhet.</p>';

    $$('[data-price]').forEach((inp) => {
      inp.addEventListener('input', () => {
        const m = draft.menu.find((x) => x.id === inp.dataset.price);
        const v = parseFloat(inp.value.replace(',', '.'));
        if (!isNaN(v) && v >= 0) { m.p = v; inp.classList.add('changed'); markDirty(); }
      });
    });
    $$('[data-av]').forEach((b) => b.addEventListener('click', () => {
      const m = draft.menu.find((x) => x.id === b.dataset.av);
      m.available = m.available === false;
      b.classList.toggle('on', m.available !== false);
      b.closest('.item').classList.toggle('off', m.available === false);
      markDirty();
    }));
    $$('[data-edit]').forEach((b) => b.addEventListener('click', () => openDrawer(b.dataset.edit)));
  }

  function fillCatSelects() {
    const opts = draft.settings.categories.map((c) => `<option value="${esc(c.id)}">${esc(c.sq)}</option>`).join('');
    $('#catFilter').innerHTML = '<option value="all">Të gjitha kategoritë</option>' + opts;
    $('#bulkCat').innerHTML = opts;
    $('#d-c').innerHTML = opts;
  }

  $('#q').addEventListener('input', renderItems);
  $('#catFilter').addEventListener('change', renderItems);

  $('#addBtn').addEventListener('click', () => {
    const id = 'x' + Date.now().toString(36);
    const maxSort = draft.menu.reduce((a, m) => Math.max(a, m.sort || 0), 0);
    draft.menu.push({
      id, c: draft.settings.categories[0].id, art: 'pizza',
      sq: 'Pjatë e re', en: 'New dish', dsq: '', den: '',
      p: 0, tags: [], available: true, sort: maxSort + 10,
    });
    markDirty(); renderItems(); openDrawer(id);
  });

  /* ---------- ndryshim çmimesh me përqindje ---------- */
  function bulk(sign) {
    const pct = parseFloat($('#bulkPct').value);
    if (isNaN(pct) || pct <= 0) return toast('Vendos një përqindje më të madhe se zero.', 'err');
    const cat = $('#bulkCat').value;
    const hit = draft.menu.filter((m) => m.c === cat);
    if (!hit.length) return toast('Kjo kategori s\'ka pjata.', 'err');
    const dir = sign > 0 ? 'rriten' : 'ulen';
    if (!confirm(`${hit.length} çmime të «${catName(cat)}» ${dir} me ${pct}%. Vazhdojmë?`)) return;
    hit.forEach((m) => { m.p = Math.max(0, Math.round(m.p * (1 + sign * pct / 100))); });
    markDirty(); renderItems();
    toast(hit.length + ' çmime u përditësuan. Shtyp «Ruaj ndryshimet».', 'ok');
  }
  $('#bulkUp').addEventListener('click', () => bulk(1));
  $('#bulkDown').addEventListener('click', () => bulk(-1));


  /* ══════════════════ POROSITË ══════════════════ */
  const ORD = {
    day: new Date().toISOString().slice(0, 10),
    filter: 'active',
    list: [],
    seen: new Set(),
    sound: localStorage.getItem('sprint-sound') !== 'off',
    tick: null, poll: null, firstLoad: true,
  };

  const ST_SQ = {
    new:'E re', accepted:'Pranuar', preparing:'Në përgatitje', ready:'Gati',
    delivering:'Në rrugë', done:'Përfunduar', cancelled:'Anuluar',
  };
  const ACTIVE = ['new','accepted','preparing','ready','delivering'];
  const NEXT_OF = (o) => ({
    accepted:'preparing', preparing:'ready',
    ready: o.kind === 'delivery' ? 'delivering' : 'done',
    delivering:'done',
  })[o.status];
  const NEXT_LABEL = (o) => ({
    accepted:'Filloi përgatitja', preparing:'Gati', 
    ready: o.kind === 'delivery' ? 'Nisi dërgesa' : 'U dorëzua',
    delivering:'U dorëzua',
  })[o.status];

  const pad = (n) => String(n).padStart(2, '0');
  const mmss = (ms) => { const t = Math.max(0, Math.round(ms / 1000));
    return pad(Math.floor(t / 60)) + ':' + pad(t % 60); };
  const money = (n) => (Number(n) || 0).toLocaleString('sq-AL') + ' L';
  const hhmm = (iso) => { const d = new Date(iso); return pad(d.getHours()) + ':' + pad(d.getMinutes()); };

  /* ---------- zilja për porosi të re ---------- */
  let audioCtx;
  function beep() {
    if (!ORD.sound) return;
    try {
      audioCtx = audioCtx || new (window.AudioContext || window.webkitAudioContext)();
      [0, 0.18].forEach((delay, i) => {
        const o = audioCtx.createOscillator(), g = audioCtx.createGain();
        o.type = 'sine'; o.frequency.value = i ? 1046 : 784;
        g.gain.setValueAtTime(0.0001, audioCtx.currentTime + delay);
        g.gain.exponentialRampToValueAtTime(0.28, audioCtx.currentTime + delay + 0.02);
        g.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + delay + 0.3);
        o.connect(g); g.connect(audioCtx.destination);
        o.start(audioCtx.currentTime + delay); o.stop(audioCtx.currentTime + delay + 0.32);
      });
    } catch (e) {}
  }

  /* ---------- porosi shembull, vetëm në modin lokal ---------- */
  function demoOrders() {
    const now = Date.now();
    const pick = (i) => draft.menu[i] || draft.menu[0];
    const line = (i, q) => ({ id: pick(i).id, name: pick(i).sq, qty: q, price: pick(i).p, sum: pick(i).p * q });
    return [
      { id:'demo1', number:1042, token:'demo1', status:'new', kind:'delivery', demo:true,
        customer_name:'Klient shembull', phone:'069 000 0001',
        address:'Rruga Taulantia 12, kati 3', note:'Pa qepë',
        items:[line(14,1), line(16,2)], subtotal:1180, delivery_fee:0, total:1180,
        payment:'cash', wanted_at:'asap', lang:'sq',
        created_at:new Date(now - 2*60000).toISOString() },
      { id:'demo2', number:1041, token:'demo2', status:'preparing', kind:'pickup', demo:true,
        customer_name:'Klient shembull', phone:'069 000 0002', address:null, note:null,
        items:[line(30,1), line(2,1)], subtotal:570, delivery_fee:0, total:570,
        payment:'card', wanted_at:'asap', lang:'sq', prep_minutes:20,
        accepted_at:new Date(now - 14*60000).toISOString(),
        created_at:new Date(now - 16*60000).toISOString() },
      { id:'demo3', number:1040, token:'demo3', status:'delivering', kind:'delivery', demo:true,
        customer_name:'Klient shembull', phone:'069 000 0003',
        address:'Lagjja 13, pallati 4', note:null,
        items:[line(45,2)], subtotal:1600, delivery_fee:0, total:1600,
        payment:'cash', wanted_at:'asap', lang:'sq', prep_minutes:25,
        accepted_at:new Date(now - 34*60000).toISOString(),
        created_at:new Date(now - 36*60000).toISOString() },
    ];
  }

  /* ---------- ngarkimi ---------- */
  async function loadOrders(silent) {
    const from = new Date(ORD.day + 'T00:00:00').toISOString();
    const to = new Date(new Date(ORD.day + 'T00:00:00').getTime() + 864e5).toISOString();
    let list = [];
    try { list = (await store.fetchOrders({ from, to })) || []; }
    catch (e) { if (!silent) toast('Porositë nuk u lexuan: ' + e.message, 'err'); }

    if (localMode && !list.length && ORD.day === new Date().toISOString().slice(0, 10)) {
      list = demoOrders();
    }
    $('#demoMsg').classList.toggle('on', list.some((o) => o.demo));
    $('#demoMsg').textContent = 'Këto janë porosi shembull për ta parë tabelën në punë. '
      + 'Sapo të lidhet Supabase, këtu shfaqen porositë e vërteta të klientëve.';

    // zilja kur mbërrin një porosi e re
    const fresh = list.filter((o) => o.status === 'new' && !ORD.seen.has(o.id));
    list.forEach((o) => ORD.seen.add(o.id));
    if (!ORD.firstLoad && fresh.length) { beep(); flashTitle(fresh.length); }
    ORD.firstLoad = false;

    ORD.list = list;
    renderOrders();
  }

  let titleT;
  function flashTitle(n) {
    clearInterval(titleT);
    const base = 'SPRINT · Paneli i menaxhimit';
    let on = true, left = 12;
    titleT = setInterval(() => {
      document.title = on ? `(${n}) POROSI E RE` : base;
      on = !on;
      if (--left <= 0) { clearInterval(titleT); document.title = base; }
    }, 700);
  }

  /* ---------- kohëmatësi ---------- */
  function clockOf(o) {
    if (o.status === 'done' || o.status === 'cancelled') {
      const end = o.done_at ? new Date(o.done_at) : new Date(o.updated_at || o.created_at);
      return { txt: mmss(end - new Date(o.created_at)), cls: '', late: false };
    }
    if (o.accepted_at && o.prep_minutes) {
      const left = new Date(o.accepted_at).getTime() + o.prep_minutes * 60000 - Date.now();
      return { txt: (left < 0 ? '+' : '') + mmss(Math.abs(left)),
               cls: left < 0 ? 'late' : (left < 5 * 60000 ? 'warn' : 'ok'), late: left < 0 };
    }
    const el = Date.now() - new Date(o.created_at).getTime();
    return { txt: mmss(el), cls: el > 6 * 60000 ? 'late' : el > 3 * 60000 ? 'warn' : '', late: el > 6 * 60000 };
  }

  function tickClocks() {
    ORD.list.forEach((o) => {
      const el = document.querySelector(`[data-clock="${o.id}"]`);
      if (!el) return;
      const c = clockOf(o);
      el.textContent = c.txt;
      el.className = 'clock ' + c.cls;
      el.closest('.ord').classList.toggle('late', c.late && o.status !== 'done');
    });
  }

  /* ---------- pamja ---------- */
  function ordFiltered() {
    if (ORD.filter === 'all') return ORD.list;
    if (ORD.filter === 'active') return ORD.list.filter((o) => ACTIVE.includes(o.status));
    return ORD.list.filter((o) => o.status === ORD.filter);
  }

  function renderOrderStats() {
    const l = ORD.list;
    const paid = l.filter((o) => o.status !== 'cancelled');
    const revenue = paid.reduce((a, o) => a + (Number(o.total) || 0), 0);
    const accepted = l.filter((o) => o.accepted_at);
    const avgAccept = accepted.length
      ? accepted.reduce((a, o) => a + (new Date(o.accepted_at) - new Date(o.created_at)), 0) / accepted.length
      : 0;
    const open = l.filter((o) => ACTIVE.includes(o.status)).length;
    $('#ordStats').innerHTML = `
      <div class="statbox"><b>${l.length}</b><span>Porosi</span></div>
      <div class="statbox"><b style="color:var(--gold)">${money(revenue)}</b><span>Xhiro</span></div>
      <div class="statbox"><b style="color:${open ? 'var(--warn)' : 'var(--ok)'}">${open}</b><span>Në punë</span></div>
      <div class="statbox"><b>${avgAccept ? mmss(avgAccept) : '—'}</b><span>Koha e pranimit</span></div>`;
  }

  function renderOrderChips() {
    const c = (id, label) => {
      const n = id === 'all' ? ORD.list.length
        : id === 'active' ? ORD.list.filter((o) => ACTIVE.includes(o.status)).length
        : ORD.list.filter((o) => o.status === id).length;
      return `<button class="chip${ORD.filter === id ? ' on' : ''}" data-ochip="${id}">${label}<em>${n}</em></button>`;
    };
    $('#ordChips').innerHTML = [
      c('active', 'Në punë'), c('new', 'Të reja'), c('preparing', 'Në përgatitje'),
      c('ready', 'Gati'), c('delivering', 'Në rrugë'), c('done', 'Përfunduar'), c('all', 'Të gjitha'),
    ].join('');
    $$('[data-ochip]').forEach((b) => b.addEventListener('click', () => {
      ORD.filter = b.dataset.ochip; renderOrders();
    }));
    const nNew = ORD.list.filter((o) => o.status === 'new').length;
    const tab = $('#tabNew');
    tab.textContent = nNew; tab.classList.toggle('on', nNew > 0);
  }

  function orderCard(o) {
    const c = clockOf(o);
    const items = (Array.isArray(o.items) ? o.items : []).map((it) =>
      `<div class="r"><span><span class="q">${it.qty}×</span>${esc(it.name)}</span>
       <span>${money(it.sum)}</span></div>`).join('');
    const wa = 'https://wa.me/' + String(o.phone).replace(/\D/g, '').replace(/^0/, '355');
    const maps = o.address
      ? 'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(o.address) : '';
    const next = NEXT_OF(o);

    let actions = '';
    if (o.status === 'new') {
      actions = `<div class="prep">
        <p>Sa minuta duhen? Klienti e sheh kohën te ndjekja e porosisë.</p>
        <div class="prep-row">${[10,15,20,30,45,60].map((m) =>
          `<button data-accept="${o.id}" data-min="${m}">${m}′</button>`).join('')}</div>
        <div class="prep-row"><button class="btn btn-d" data-cancel="${o.id}"
          style="flex:1">Refuzo porosinë</button></div>
      </div>`;
    } else if (next) {
      actions = `<div class="ord-act">
        <button class="btn btn-p" data-next="${o.id}" data-to="${next}">${NEXT_LABEL(o)}</button>
        <button class="btn btn-d btn-sm" data-cancel="${o.id}">Anulo</button>
      </div>`;
    } else {
      actions = `<div class="ord-act">
        <button class="btn btn-g btn-sm" data-reopen="${o.id}">Rikthe në punë</button>
      </div>`;
    }

    return `<article class="ord s-${o.status}${c.late ? ' late' : ''}" data-ord="${o.id}">
      <div class="ord-hd">
        <span class="ord-no">#${o.number}</span>
        <span class="badge b-${o.status}">${ST_SQ[o.status]}</span>
        <span class="badge b-kind">${o.kind === 'pickup' ? 'Marr vetë' : 'Dërgesë'}</span>
        ${o.token ? `<span class="badge b-code" title="Kodi i gjurmimit i klientit">${esc(store.fmtCode(o.token))}</span>` : ''}
        <span class="clock ${c.cls}" data-clock="${o.id}">${c.txt}</span>
      </div>
      <div class="ord-bd">
        <div class="ord-who">
          <b>${esc(o.customer_name)}</b>
          <a href="tel:${esc(String(o.phone).replace(/\s/g, ''))}">${esc(o.phone)}</a>
          ${o.address ? `<span class="adr"><a href="${maps}" target="_blank" rel="noopener">${esc(o.address)}</a></span>` : ''}
        </div>
        <div class="ord-items">${items}</div>
        ${o.note ? `<div class="ord-note">📝 ${esc(o.note)}</div>` : ''}
        <div class="ord-tot">
          <span>${o.payment === 'card' ? 'Me kartë' : 'Para në dorë'}
            ${Number(o.delivery_fee) ? ' · dërgesa ' + money(o.delivery_fee) : ''}</span>
          <b>${money(o.total)}</b>
        </div>
        <div class="ord-meta">
          <span>Mbërriti ${hhmm(o.created_at)}</span>
          ${o.wanted_at && o.wanted_at !== 'asap' ? `<span>Për orën ${esc(o.wanted_at)}</span>` : '<span>Sa më shpejt</span>'}
          ${o.prep_minutes ? `<span>${o.prep_minutes}′ përgatitje</span>` : ''}
          <a href="${wa}" target="_blank" rel="noopener">WhatsApp klientit →</a>
        </div>
      </div>
      ${actions}
    </article>`;
  }

  function renderOrders() {
    renderOrderStats(); renderOrderChips();
    const list = ordFiltered();
    $('#ordList').innerHTML = list.length ? list.map(orderCard).join('')
      : '<p class="empty">Asnjë porosi këtu.</p>';

    $$('[data-accept]').forEach((b) => b.addEventListener('click', () =>
      setStatus(b.dataset.accept, 'accepted', { prep_minutes: +b.dataset.min,
        accepted_at: new Date().toISOString() })));
    $$('[data-next]').forEach((b) => b.addEventListener('click', () => {
      const to = b.dataset.to;
      const patch = to === 'ready' ? { ready_at: new Date().toISOString() }
        : to === 'done' ? { done_at: new Date().toISOString() } : {};
      setStatus(b.dataset.next, to, patch);
    }));
    $$('[data-cancel]').forEach((b) => b.addEventListener('click', () => {
      const why = prompt('Arsyeja e anulimit (opsionale):');
      if (why === null) return;
      setStatus(b.dataset.cancel, 'cancelled', { cancel_reason: why || null });
    }));
    $$('[data-reopen]').forEach((b) => b.addEventListener('click', () =>
      setStatus(b.dataset.reopen, 'preparing', { done_at: null })));
  }

  async function setStatus(id, status, patch) {
    const o = ORD.list.find((x) => x.id === id); if (!o) return;
    const before = Object.assign({}, o);
    Object.assign(o, patch, { status });        // përgjigje e menjëhershme
    renderOrders();
    try {
      if (!o.demo) await store.updateOrder(id, Object.assign({ status }, patch));
    } catch (e) {
      Object.assign(o, before); renderOrders();
      toast('Nuk u ruajt: ' + e.message, 'err');
    }
  }

  $('#ordRefresh').addEventListener('click', () => loadOrders());

  // Kur banaku regjistron një porosi me telefon, tabela duhet ta tregojë menjëherë —
  // jo pas 15 sekondave kur bie rradha e rifreskimit.
  document.addEventListener('sprint:order-created', () => loadOrders(true));
  $('#ordDay').addEventListener('change', () => {
    ORD.day = $('#ordDay').value || new Date().toISOString().slice(0, 10);
    ORD.firstLoad = true; loadOrders();
  });
  $('#soundBtn').addEventListener('click', () => {
    ORD.sound = !ORD.sound;
    localStorage.setItem('sprint-sound', ORD.sound ? 'on' : 'off');
    $('#soundBtn').textContent = (ORD.sound ? '🔔' : '🔕') + ' Zilja';
    $('#soundBtn').setAttribute('aria-pressed', String(ORD.sound));
    if (ORD.sound) beep();
  });

  /* ══════════════════ REZERVIMET ══════════════════ */
  const BK = { list: [], filter: 'upcoming' };
  const BK_SQ = { new:'I ri', confirmed:'Konfirmuar', seated:'Në tavolinë', done:'Përfunduar', cancelled:'Anuluar' };

  function demoBookings() {
    const d = new Date(); const iso = (n) =>
      new Date(d.getTime() + n * 864e5).toISOString().slice(0, 10);
    return [
      { id:'dbk1', number:118, status:'new', demo:true, customer_name:'Rezervim shembull',
        phone:'069 000 0004', date:iso(0), time:'20:30', people:'6',
        area:'Salla e eventeve', note:'Ditëlindje, tortë në fund', lang:'sq' },
      { id:'dbk2', number:117, status:'confirmed', demo:true, customer_name:'Rezervim shembull',
        phone:'069 000 0005', date:iso(1), time:'13:00', people:'2',
        area:'Jashtë (terracë)', note:null, lang:'sq' },
    ];
  }

  async function loadBookings(silent) {
    try { BK.list = (await store.fetchBookings({ from: ORD.day })) || []; }
    catch (e) { if (!silent) toast('Rezervimet nuk u lexuan: ' + e.message, 'err'); }
    if (localMode && !BK.list.length) BK.list = demoBookings();
    renderBookings();
  }

  function renderBookings() {
    const list = BK.filter === 'all' ? BK.list
      : BK.filter === 'upcoming' ? BK.list.filter((b) => !['done','cancelled'].includes(b.status))
      : BK.list.filter((b) => b.status === BK.filter);

    const c = (id, label) => {
      const n = id === 'all' ? BK.list.length
        : id === 'upcoming' ? BK.list.filter((b) => !['done','cancelled'].includes(b.status)).length
        : BK.list.filter((b) => b.status === id).length;
      return `<button class="chip${BK.filter === id ? ' on' : ''}" data-bchip="${id}">${label}<em>${n}</em></button>`;
    };
    $('#bkChips').innerHTML = [c('upcoming','Në pritje'), c('new','Të reja'),
      c('confirmed','Konfirmuar'), c('done','Përfunduar'), c('all','Të gjitha')].join('');
    $$('[data-bchip]').forEach((b) => b.addEventListener('click', () => {
      BK.filter = b.dataset.bchip; renderBookings();
    }));

    const nNew = BK.list.filter((b) => b.status === 'new').length;
    const tab = $('#tabBook');
    tab.textContent = nNew; tab.classList.toggle('on', nNew > 0);

    $('#bkList').innerHTML = list.length ? list.map((b) => {
      const wa = 'https://wa.me/' + String(b.phone).replace(/\D/g, '').replace(/^0/, '355');
      const nextBtn = b.status === 'new'
        ? `<button class="btn btn-p" data-bset="${b.id}" data-to="confirmed">Konfirmo</button>`
        : b.status === 'confirmed'
        ? `<button class="btn btn-p" data-bset="${b.id}" data-to="seated">Erdhi</button>`
        : b.status === 'seated'
        ? `<button class="btn btn-p" data-bset="${b.id}" data-to="done">Përfundo</button>`
        : `<button class="btn btn-g btn-sm" data-bset="${b.id}" data-to="confirmed">Rikthe</button>`;
      return `<article class="ord">
        <div class="ord-hd">
          <span class="ord-no">#${b.number}</span>
          <span class="badge b-${b.status === 'new' ? 'new' : b.status === 'cancelled' ? 'cancelled' : 'ready'}">${BK_SQ[b.status]}</span>
          <span class="clock">${esc(b.date)}${b.time ? ' · ' + esc(b.time) : ''}</span>
        </div>
        <div class="ord-bd">
          <div class="ord-who">
            <b>${esc(b.customer_name)}</b>
            <a href="tel:${esc(String(b.phone).replace(/\s/g, ''))}">${esc(b.phone)}</a>
            <span class="adr">${esc(b.people || '')} persona${b.area ? ' · ' + esc(b.area) : ''}</span>
          </div>
          ${b.note ? `<div class="ord-note">📝 ${esc(b.note)}</div>` : ''}
          <div class="ord-meta"><a href="${wa}" target="_blank" rel="noopener">WhatsApp klientit →</a></div>
        </div>
        <div class="ord-act">${nextBtn}
          <button class="btn btn-d btn-sm" data-bset="${b.id}" data-to="cancelled">Anulo</button></div>
      </article>`;
    }).join('') : '<p class="empty">Asnjë rezervim.</p>';

    $$('[data-bset]').forEach((btn) => btn.addEventListener('click', async () => {
      const b = BK.list.find((x) => x.id === btn.dataset.bset); if (!b) return;
      const before = b.status; b.status = btn.dataset.to; renderBookings();
      try { if (!b.demo) await store.updateBooking(b.id, { status: btn.dataset.to }); }
      catch (e) { b.status = before; renderBookings(); toast('Nuk u ruajt: ' + e.message, 'err'); }
    }));
  }
  $('#bkRefresh').addEventListener('click', () => loadBookings());

  /* ---------- nisja e tabelës ---------- */
  function startOrderBoard() {
    $('#ordDay').value = ORD.day;
    $('#soundBtn').textContent = (ORD.sound ? '🔔' : '🔕') + ' Zilja';
    loadOrders(); loadBookings();
    clearInterval(ORD.tick); ORD.tick = setInterval(tickClocks, 1000);
    clearInterval(ORD.poll);
    ORD.poll = setInterval(() => {
      if (document.hidden) return;
      loadOrders(true); loadBookings(true);
    }, 15000);
  }

  /* ══════════════════ SIRTARI ══════════════════ */
  function openDrawer(id) {
    const m = draft.menu.find((x) => x.id === id);
    if (!m) return;
    editing = id;
    $('#drTitle').textContent = m.sq || 'Pjatë';
    $('#d-id').value = m.id;
    $('#d-sq').value = m.sq || ''; $('#d-en').value = m.en || '';
    $('#d-dsq').value = m.dsq || ''; $('#d-den').value = m.den || '';
    $('#d-p').value = m.p; $('#d-unit').value = m.unit || ''; $('#d-note').value = m.note || '';
    $('#d-sort').value = m.sort || 0;
    $('#d-c').value = m.c;
    $('#d-art').innerHTML = ART.map((a) => `<option value="${a}">${a}</option>`).join('');
    $('#d-art').value = m.art || 'pizza';
    $$('#dTags button').forEach((b) => b.classList.toggle('on', (m.tags || []).includes(b.dataset.t)));
    setAvail(m.available !== false);
    paintPhoto(m);
    $('#scrim').classList.add('on'); $('#drawer').classList.add('on');
  }
  function setAvail(on) {
    $('#d-av').classList.toggle('on', on);
    $('#d-avTxt').textContent = on ? 'Shfaqet' : 'E fshehur';
  }
  function paintPhoto(m) {
    $('#dPhoto').innerHTML = thumbOf(m);
    $('#dPhotoClear').style.visibility = m.img ? 'visible' : 'hidden';
  }
  function closeDrawer() {
    $('#scrim').classList.remove('on'); $('#drawer').classList.remove('on'); editing = null;
  }
  $('#drClose').addEventListener('click', closeDrawer);
  $('#scrim').addEventListener('click', closeDrawer);
  document.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape') return;
    if ($('#camWrap').classList.contains('on')) return camClose(null);
    closeDrawer();
  });

  $('#d-av').addEventListener('click', () => setAvail(!$('#d-av').classList.contains('on')));
  $$('#dTags button').forEach((b) => b.addEventListener('click', () => b.classList.toggle('on')));

  $('#dSave').addEventListener('click', () => {
    const m = draft.menu.find((x) => x.id === editing);
    if (!m) return closeDrawer();
    const p = parseFloat($('#d-p').value.replace(',', '.'));
    if (isNaN(p) || p < 0) return toast('Çmimi duhet të jetë një numër.', 'err');
    if (!$('#d-sq').value.trim()) return toast('Emri shqip nuk mund të jetë bosh.', 'err');
    m.sq = $('#d-sq').value.trim();
    m.en = $('#d-en').value.trim() || m.sq;
    m.dsq = $('#d-dsq').value.trim(); m.den = $('#d-den').value.trim();
    m.p = p;
    m.unit = $('#d-unit').value.trim() || undefined;
    m.note = $('#d-note').value.trim() || undefined;
    m.c = $('#d-c').value; m.art = $('#d-art').value;
    m.sort = parseInt($('#d-sort').value, 10) || 0;
    m.tags = TAGS.filter((t) => $(`#dTags [data-t="${t}"]`).classList.contains('on'));
    m.available = $('#d-av').classList.contains('on');
    markDirty(); renderItems(); closeDrawer();
  });

  $('#dDelete').addEventListener('click', async () => {
    const m = draft.menu.find((x) => x.id === editing);
    if (!m || !confirm(`Të fshihet «${m.sq}» përfundimisht?`)) return;
    draft.menu = draft.menu.filter((x) => x.id !== editing);
    if (m.img) { try { await store.deletePhoto(m.img); } catch (e) {} }
    if (!localMode) { try { await store.deleteItem(editing); } catch (e) { toast(e.message, 'err'); } }
    markDirty(); renderItems(); closeDrawer();
    toast('Pjata u fshi.', 'ok');
  });


  /* ══════════════════ KAMERA ══════════════════ */
  let camStream = null, camFacing = 'environment', camResolve = null, camFallback = null;

  const camStop = () => {
    if (camStream) { camStream.getTracks().forEach((t) => t.stop()); camStream = null; }
    $('#camVideo').srcObject = null;
  };

  function camClose(value) {
    camStop();
    $('#camWrap').classList.remove('on', 'shot');
    const r = camResolve; camResolve = null;
    if (r) r(value || null);
  }

  async function camStart() {
    const msg = $('#camMsg');
    msg.classList.remove('on');
    camStop();
    try {
      camStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: camFacing, width: { ideal: 1600 }, height: { ideal: 1200 } },
        audio: false,
      });
      $('#camVideo').srcObject = camStream;
    } catch (e) {
      msg.innerHTML = /NotAllowed|Permission|denied/i.test(e.name + ' ' + e.message)
        ? 'Shfletuesi nuk e lejoi kamerën.<br>Lejoje nga ikona pranë adresës, ose zgjidh një foto nga skedarët.'
        : 'Kamera nuk u hap: ' + esc(e.message);
      msg.classList.add('on');
    }
  }

  /** Hap kamerën dhe kthen foton si Blob; null nëse anulohet. */
  function openCamera(title, fallbackInput) {
    camFallback = fallbackInput || null;
    const md = navigator.mediaDevices;
    if (!md || !md.getUserMedia) return pickFrom(fallbackInput);   // telefonat e vjetër
    return new Promise((res) => {
      camResolve = res;
      $('#camTitle').textContent = title || 'Bëj foto';
      $('#camWrap').classList.add('on');
      $('#camActLive').classList.remove('hide');
      $('#camActShot').classList.add('hide');
      camStart();
    });
  }

  /** Hap zgjedhësin e skedarëve dhe kthen skedarin e zgjedhur. */
  function pickFrom(input) {
    if (!input) return Promise.resolve(null);
    return new Promise((res) => {
      const on = () => {
        input.removeEventListener('change', on);
        const f = input.files && input.files[0];
        input.value = '';
        res(f || null);
      };
      input.addEventListener('change', on);
      input.click();
    });
  }

  $('#camTake').addEventListener('click', () => {
    const v = $('#camVideo'), c = $('#camShot');
    if (!v.videoWidth) return toast('Kamera ende s’është gati.', 'err');
    c.width = v.videoWidth; c.height = v.videoHeight;
    c.getContext('2d').drawImage(v, 0, 0, c.width, c.height);
    $('#camWrap').classList.add('shot');
    $('#camActLive').classList.add('hide');
    $('#camActShot').classList.remove('hide');
  });

  $('#camRetake').addEventListener('click', () => {
    $('#camWrap').classList.remove('shot');
    $('#camActLive').classList.remove('hide');
    $('#camActShot').classList.add('hide');
  });

  $('#camUse').addEventListener('click', () => {
    $('#camShot').toBlob((b) => camClose(b), 'image/jpeg', 0.92);
  });

  $('#camFlip').addEventListener('click', () => {
    camFacing = camFacing === 'environment' ? 'user' : 'environment';
    camStart();
  });

  ['#camClose', '#camCancel', '#camCancelBg'].forEach((sel) =>
    $(sel).addEventListener('click', () => camClose(null)));

  /* ══════════════════ FOTOJA E PJATËS ══════════════════ */
  async function setDishPhoto(file) {
    const m = draft.menu.find((x) => x.id === editing);
    if (!m || !file) return;
    const old = m.img;
    $('#dPhoto').classList.add('busy');
    try {
      m.img = await store.uploadPhoto(file, m.id);
      // Fotoja e vjetër nuk ka pse të mbetet në hapësirë.
      if (old && old !== m.img) { try { await store.deletePhoto(old); } catch (e) {} }
      paintPhoto(m); markDirty(); renderItems();
      toast('Fotoja u vendos. Shtyp «Ruaj ndryshimet» që ta shohin klientët.', 'ok');
    } catch (err) {
      toast(err.message, 'err');
    } finally {
      $('#dPhoto').classList.remove('busy');
    }
  }

  $('#dPick').addEventListener('click', async () =>
    setDishPhoto(await pickFrom($('#dFile'))));

  $('#dShoot').addEventListener('click', async () =>
    setDishPhoto(await openCamera('Bëj foton e pjatës', $('#dCam'))));

  $('#dPhotoClear').addEventListener('click', async () => {
    const m = draft.menu.find((x) => x.id === editing);
    if (!m || !m.img) return;
    if (!confirm('Të hiqet fotoja? Faqja do të kthehet te ilustrimi.')) return;
    const old = m.img;
    delete m.img;
    paintPhoto(m); markDirty(); renderItems();
    try { await store.deletePhoto(old); } catch (e) {}
    toast('Fotoja u hoq. Shtyp «Ruaj ndryshimet».', 'ok');
  });

  /* ══════════════════ KATEGORITË ══════════════════ */
  function renderCats() {
    $('#catList').innerHTML = draft.settings.categories.map((c, i) => `
      <div class="item" style="grid-template-columns:56px minmax(0,1fr) auto">
        <span class="thumb">${artSvg(c.art)}</span>
        <span class="nm" style="display:grid;gap:.4rem">
          <input value="${esc(c.sq)}" data-c="sq" data-i="${i}" aria-label="Emri shqip"
            style="background:#0F0B0C;border:1.5px solid var(--line);border-radius:9px;padding:.4rem .6rem;width:100%">
          <input value="${esc(c.en)}" data-c="en" data-i="${i}" aria-label="Emri anglisht"
            style="background:#0F0B0C;border:1.5px solid var(--line);border-radius:9px;padding:.4rem .6rem;width:100%">
          <span class="count">${draft.menu.filter((m) => m.c === c.id).length} pjata · kodi <code>${esc(c.id)}</code></span>
        </span>
        <span style="display:grid;gap:.35rem">
          <button class="btn btn-g btn-sm" data-cup="${i}" ${i === 0 ? 'disabled' : ''}>↑</button>
          <button class="btn btn-g btn-sm" data-cdn="${i}" ${i === draft.settings.categories.length - 1 ? 'disabled' : ''}>↓</button>
        </span>
      </div>`).join('');

    $$('[data-c]').forEach((inp) => inp.addEventListener('input', () => {
      draft.settings.categories[+inp.dataset.i][inp.dataset.c] = inp.value;
      markDirty(); fillCatSelects();
    }));
    const move = (i, d) => {
      const a = draft.settings.categories;
      [a[i], a[i + d]] = [a[i + d], a[i]];
      markDirty(); renderCats(); fillCatSelects();
    };
    $$('[data-cup]').forEach((b) => b.addEventListener('click', () => move(+b.dataset.cup, -1)));
    $$('[data-cdn]').forEach((b) => b.addEventListener('click', () => move(+b.dataset.cdn, 1)));
  }

  $('#addCat').addEventListener('click', () => {
    const id = prompt('Kodi i kategorisë (shkronja pa hapësira, p.sh. embelsira):');
    if (!id) return;
    const key = id.trim().toLowerCase().replace(/[^a-z0-9]/g, '');
    if (!key) return toast('Kodi duhet të ketë të paktën një shkronjë.', 'err');
    if (draft.settings.categories.some((c) => c.id === key)) return toast('Kjo kategori ekziston.', 'err');
    draft.settings.categories.push({ id: key, art: 'pizza', sq: 'Kategori e re', en: 'New category', dsq: '', den: '' });
    markDirty(); renderCats(); fillCatSelects();
  });

  /* ══════════════════ CILËSIMET ══════════════════ */
  const SET_MAP = {
    '#s-phone': 'phone', '#s-phoneHref': 'phoneHref', '#s-wa': 'whatsapp', '#s-email': 'email',
  };
  function renderSettings() {
    const c = draft.settings.config;
    Object.entries(SET_MAP).forEach(([sel, key]) => { $(sel).value = c[key] || ''; });
    $('#s-addr-sq').value = (c.address && c.address.sq) || '';
    $('#s-addr-en').value = (c.address && c.address.en) || '';
    $('#s-lat').value = (c.geo && c.geo.lat) || '';
    $('#s-lng').value = (c.geo && c.geo.lng) || '';
    $('#s-fee').value = c.deliveryFee == null ? '' : c.deliveryFee;
    $('#s-ig').value = (c.social && c.social.instagram) || '';
    $('#s-fb').value = (c.social && c.social.facebook) || '';
    $('#s-tt').value = (c.social && c.social.tiktok) || '';
    $('#s-ev-sq').value = (c.events && c.events.sq) || '';
    $('#s-ev-en').value = (c.events && c.events.en) || '';
    $('#evBox').innerHTML = c.eventsPhoto
      ? `<img src="${esc(c.eventsPhoto)}" alt="">` : artSvg('meze');
    renderHours(); renderGoogle();
  }
  function renderHours() {
    const c = draft.settings.config;
    const sq = (c.hours && c.hours.sq) || [];
    const en = (c.hours && c.hours.en) || [];
    $('#hoursSq').innerHTML = sq.map((row, i) => `
      <div class="mini-row">
        <input value="${esc(row[0])}" data-h="0" data-i="${i}" aria-label="Ditët"
          style="background:#0F0B0C;border:1.5px solid var(--line);border-radius:9px;padding:.5rem .7rem;width:100%">
        <input value="${esc(row[1])}" data-h="1" data-i="${i}" aria-label="Orari"
          style="background:#0F0B0C;border:1.5px solid var(--line);border-radius:9px;padding:.5rem .7rem;width:100%">
        <button class="btn btn-d btn-sm" data-hdel="${i}">✕</button>
      </div>`).join('');
    $$('[data-h]').forEach((inp) => inp.addEventListener('input', () => {
      const i = +inp.dataset.i, k = +inp.dataset.h;
      c.hours.sq[i][k] = inp.value;
      if (!en[i]) c.hours.en[i] = ['', ''];
      if (k === 1) c.hours.en[i][1] = inp.value;   // orari është i njëjtë në të dyja gjuhët
      markDirty();
    }));
    $$('[data-hdel]').forEach((b) => b.addEventListener('click', () => {
      const i = +b.dataset.hdel;
      c.hours.sq.splice(i, 1); c.hours.en.splice(i, 1);
      markDirty(); renderHours();
    }));
  }
  $('#addHour').addEventListener('click', () => {
    const c = draft.settings.config;
    c.hours.sq.push(['Ditët', '00:00 – 00:00']);
    c.hours.en.push(['Days', '00:00 – 00:00']);
    markDirty(); renderHours();
  });

  function bindSettings() {
    Object.entries(SET_MAP).forEach(([sel, key]) => {
      $(sel).addEventListener('input', () => { draft.settings.config[key] = $(sel).value.trim(); markDirty(); });
    });
    const pair = (sel, path) => $(sel).addEventListener('input', () => {
      const c = draft.settings.config;
      const [a, b] = path;
      c[a] = c[a] || {};
      c[a][b] = $(sel).value.trim();
      markDirty();
    });
    pair('#s-addr-sq', ['address', 'sq']); pair('#s-addr-en', ['address', 'en']);
    pair('#s-ig', ['social', 'instagram']); pair('#s-fb', ['social', 'facebook']);
    pair('#s-tt', ['social', 'tiktok']);
    pair('#s-ev-sq', ['events', 'sq']); pair('#s-ev-en', ['events', 'en']);

    ['#s-lat', '#s-lng'].forEach((sel) => $(sel).addEventListener('input', () => {
      const c = draft.settings.config; c.geo = c.geo || {};
      const v = parseFloat($(sel).value);
      c.geo[sel === '#s-lat' ? 'lat' : 'lng'] = isNaN(v) ? 0 : v;
      markDirty();
    }));
    $('#s-fee').addEventListener('input', () => {
      const raw = $('#s-fee').value.trim();
      const v = parseFloat(raw);
      draft.settings.config.deliveryFee = raw === '' || isNaN(v) ? null : v;
      markDirty();
    });
  }


  /* ══════════════════ VLERËSIMET NGA GOOGLE ══════════════════ */
  const gcfg = () => {
    const c = draft.settings.config;
    c.google = c.google || { enabled: true, key: '', placeId: '', mapsUri: '' };
    return c.google;
  };

  function renderGoogle() {
    const g = gcfg();
    $('#s-gkey').value = g.key || '';
    $('#s-genabled').classList.toggle('on', g.enabled !== false);
    $('#s-genabledTxt').textContent = g.enabled !== false
      ? 'Shfaq vlerësimet e Google në faqe'
      : 'Fikur — faqja përdor vlerësimet e skedës «Vlerësimet»';
    if (!$('#gQuery').value) {
      $('#gQuery').value = 'SPRINT Fast Food & Pizza, ' + (draft.settings.config.city || 'Durrës');
    }
    const box = $('#gPicked');
    if (g.placeId) {
      box.className = 'msg ok on';
      box.innerHTML = `Vendi i lidhur: <b>${esc(g.name || g.placeId)}</b>`
        + (g.address ? `<br><span style="opacity:.8">${esc(g.address)}</span>` : '')
        + (g.rating ? `<br>${g.rating} ★ · ${g.count} vlerësime` : '')
        + ` <button class="btn btn-d btn-sm" id="gUnlink" style="margin-top:.5rem">Shkëput</button>`;
      $('#gUnlink').addEventListener('click', () => {
        const x = gcfg();
        x.placeId = ''; x.mapsUri = ''; delete x.name; delete x.address; delete x.rating; delete x.count;
        markDirty(); renderGoogle();
      });
    } else {
      box.className = 'msg';
      box.innerHTML = '';
    }
  }

  $('#s-gkey').addEventListener('input', () => { gcfg().key = $('#s-gkey').value.trim(); markDirty(); });
  $('#s-genabled').addEventListener('click', () => {
    const g = gcfg(); g.enabled = !$('#s-genabled').classList.contains('on');
    markDirty(); renderGoogle();
  });

  $('#gFind').addEventListener('click', async () => {
    const key = $('#s-gkey').value.trim();
    if (!key) return toast('Vendos më parë çelësin e Google Maps.', 'err');
    const q = $('#gQuery').value.trim();
    if (!q) return toast('Shkruaj emrin e biznesit dhe qytetin.', 'err');
    const btn = $('#gFind'); btn.disabled = true; btn.textContent = 'Po kërkon…';
    try {
      const list = await SPRINT.google.search(q, key);
      $('#gResults').innerHTML = list.length ? list.map((r, i) => `
        <div class="item" style="grid-template-columns:minmax(0,1fr) auto">
          <span class="nm">
            <b>${esc(r.name)}</b>
            <span>${esc(r.address)}</span>
            ${r.rating ? `<span class="tagdots"><span class="tagdot td-new">${r.rating} ★ · ${r.count}</span></span>` : ''}
          </span>
          <button class="btn btn-p btn-sm" data-gpick="${i}">Zgjidh</button>
        </div>`).join('') : '<p class="empty">Asnjë rezultat. Provo me adresën e plotë.</p>';

      $$('[data-gpick]').forEach((b) => b.addEventListener('click', () => {
        const r = list[+b.dataset.gpick];
        const g = gcfg();
        g.placeId = r.id; g.mapsUri = r.mapsUri;
        g.name = r.name; g.address = r.address; g.rating = r.rating; g.count = r.count;
        $('#gResults').innerHTML = '';
        markDirty(); renderGoogle();
        toast('Vendi u lidh. Shtyp «Ruaj ndryshimet».', 'ok');
      }));
    } catch (e) {
      toast('Kërkimi dështoi: ' + e.message, 'err');
    } finally { btn.disabled = false; btn.textContent = 'Gjej biznesin'; }
  });

  $('#gImport').addEventListener('click', async () => {
    const g = gcfg();
    if (!g.key || !g.placeId) return toast('Lidh më parë biznesin me Google.', 'err');
    const btn = $('#gImport'); btn.disabled = true; btn.textContent = 'Po merr…';
    try {
      const d = await SPRINT.google.details({ key: g.key, placeId: g.placeId, fresh: true });
      const c = draft.settings.config;
      if (d.address) { c.address = c.address || {}; c.address.sq = d.address; c.address.en = d.address; }
      if (d.lat && d.lng) c.geo = { lat: d.lat, lng: d.lng };
      if (d.hours && d.hours.length) {
        c.hours = c.hours || { sq: [], en: [] };
        c.hours.sq = d.hours.map((line) => {
          const i = line.indexOf(':');
          return i > 0 ? [line.slice(0, i).trim(), line.slice(i + 1).trim()] : [line, ''];
        });
        c.hours.en = c.hours.sq.map((r) => r.slice());
      }
      g.rating = d.rating; g.count = d.count; g.mapsUri = d.mapsUri || g.mapsUri;
      markDirty(); renderSettings(); renderGoogle();
      toast('Adresa, koordinatat dhe orari u morën nga Google.', 'ok');
    } catch (e) {
      toast('Nuk u morën dot: ' + e.message, 'err');
    } finally { btn.disabled = false; btn.textContent = 'Merr adresën, koordinatat dhe orarin nga Google'; }
  });

  async function setEventsPhoto(file) {
    if (!file) return;
    const c = draft.settings.config;
    const old = c.eventsPhoto;
    $('#evBox').classList.add('busy');
    try {
      c.eventsPhoto = await store.uploadPhoto(file, 'salla');
      if (old && old !== c.eventsPhoto) { try { await store.deletePhoto(old); } catch (e) {} }
      renderSettings(); markDirty();
      toast('Fotoja e sallës u vendos. Shtyp «Ruaj ndryshimet».', 'ok');
    } catch (err) { toast(err.message, 'err'); }
    finally { $('#evBox').classList.remove('busy'); }
  }

  $('#evPick').addEventListener('click', async () => setEventsPhoto(await pickFrom($('#evFile'))));
  $('#evShoot').addEventListener('click', async () =>
    setEventsPhoto(await openCamera('Bëj foton e sallës', $('#evCam'))));
  $('#evClear').addEventListener('click', async () => {
    const c = draft.settings.config;
    if (!c.eventsPhoto) return;
    if (!confirm('Të hiqet fotoja e sallës?')) return;
    const old = c.eventsPhoto;
    delete c.eventsPhoto; renderSettings(); markDirty();
    try { await store.deletePhoto(old); } catch (e) {}
  });

  /* ══════════════════ VLERËSIMET ══════════════════ */
  function renderReviews() {
    $('#revList').innerHTML = draft.settings.reviews.map((r, i) => `
      <div class="rev-row">
        <div class="rev-top">
          <input value="${esc(r.n)}" data-r="n" data-i="${i}" placeholder="Emri" aria-label="Emri"
            style="background:#0F0B0C;border:1.5px solid var(--line);border-radius:9px;padding:.45rem .7rem;width:100%">
          <select data-r="s" data-i="${i}" aria-label="Yjet"
            style="background:#0F0B0C;border:1.5px solid var(--line);border-radius:9px;padding:.45rem .5rem;width:100%">
            ${[5,4,3,2,1].map((n) => `<option value="${n}"${r.s === n ? ' selected' : ''}>${'★'.repeat(n)}</option>`).join('')}
          </select>
          <input value="${esc(r.src)}" data-r="src" data-i="${i}" placeholder="Burimi" aria-label="Burimi"
            style="background:#0F0B0C;border:1.5px solid var(--line);border-radius:9px;padding:.45rem .7rem;width:100%">
          <button class="btn btn-d btn-sm" data-rdel="${i}">✕</button>
        </div>
        <textarea data-r="sq" data-i="${i}" placeholder="Teksti shqip" aria-label="Teksti shqip"
          style="background:#0F0B0C;border:1.5px solid var(--line);border-radius:9px;padding:.5rem .7rem;width:100%;min-height:56px">${esc(r.sq)}</textarea>
        <textarea data-r="en" data-i="${i}" placeholder="Teksti anglisht" aria-label="Teksti anglisht"
          style="background:#0F0B0C;border:1.5px solid var(--line);border-radius:9px;padding:.5rem .7rem;width:100%;min-height:56px">${esc(r.en)}</textarea>
      </div>`).join('') || '<p class="empty">Asnjë vlerësim ende.</p>';

    $$('[data-r]').forEach((el) => el.addEventListener('input', () => {
      const r = draft.settings.reviews[+el.dataset.i];
      r[el.dataset.r] = el.dataset.r === 's' ? +el.value : el.value;
      markDirty();
    }));
    $$('[data-rdel]').forEach((b) => b.addEventListener('click', () => {
      draft.settings.reviews.splice(+b.dataset.rdel, 1); markDirty(); renderReviews();
    }));
  }
  $('#addRev').addEventListener('click', () => {
    draft.settings.reviews.push({ n: '', s: 5, src: 'Google', sq: '', en: '' });
    markDirty(); renderReviews();
  });

  /* ══════════════════ RUAJTJA ══════════════════ */
  async function save() {
    const btn = $('#saveBtn');
    btn.disabled = true; btn.textContent = 'Po ruhet…';
    try {
      await store.saveItems(draft.menu);
      await store.saveSettings(draft.settings);
      saved = JSON.stringify(draft);
      markDirty();
      toast(localMode ? 'U ruajt në këtë pajisje.' : 'U ruajt. Faqja u përditësua.', 'ok');
    } catch (err) {
      toast('Ruajtja dështoi: ' + err.message, 'err');
    } finally { btn.disabled = false; btn.textContent = 'Ruaj ndryshimet'; }
  }
  $('#saveBtn').addEventListener('click', save);
  $('#discardBtn').addEventListener('click', () => {
    if (!confirm('Të hidhen poshtë të gjitha ndryshimet e paruajtura?')) return;
    draft = JSON.parse(saved);
    localStorage.removeItem('sprint-admin-draft');
    renderAll(); markDirty();
  });

  addEventListener('beforeunload', (e) => {
    if (JSON.stringify(draft) !== saved) { e.preventDefault(); e.returnValue = ''; }
  });

  /* ══════════════════ PUBLIKIMI ══════════════════ */
  $('#seedBtn').addEventListener('click', async () => {
    if (!confirm('Do të dërgohen ' + draft.menu.length + ' pjata dhe cilësimet në Supabase. Vazhdojmë?')) return;
    await save();
  });

  $('#expBtn').addEventListener('click', () => {
    const blob = new Blob([JSON.stringify(draft, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'sprint-menu-' + new Date().toISOString().slice(0, 10) + '.json';
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  });

  $('#copyBtn').addEventListener('click', async () => {
    const text = JSON.stringify(draft, null, 2);
    try {
      await navigator.clipboard.writeText(text);
      toast('Kopja u vendos në clipboard.', 'ok');
    } catch (e) {
      // Disa shfletues e lejojnë kopjimin vetëm nga një fushë teksti.
      const ta = document.createElement('textarea');
      ta.value = text; ta.style.cssText = 'position:fixed;top:-9999px';
      document.body.appendChild(ta); ta.select();
      const ok = document.execCommand && document.execCommand('copy');
      ta.remove();
      toast(ok ? 'Kopja u vendos në clipboard.' : 'Kopjimi nuk u lejua nga shfletuesi.', ok ? 'ok' : 'err');
    }
  });

  $('#impBtn').addEventListener('click', () => $('#impFile').click());
  $('#impFile').addEventListener('change', (e) => {
    const file = e.target.files[0]; if (!file) return;
    const fr = new FileReader();
    fr.onload = () => {
      try {
        const d = JSON.parse(fr.result);
        if (!d.menu || !Array.isArray(d.menu)) throw new Error('Skedari nuk përmban një menu');
        draft = d; markDirty(); renderAll();
        toast('U ngarkua. Shtyp «Ruaj ndryshimet» për ta çuar në faqe.', 'ok');
      } catch (err) { toast('Skedari nuk u lexua: ' + err.message, 'err'); }
    };
    fr.readAsText(file); e.target.value = '';
  });

  $('#resetBtn').addEventListener('click', () => {
    if (!confirm('Të kthehet menuja fillestare e faqes? Ndryshimet e paruajtura humbasin.')) return;
    draft = seedDraft(); markDirty(); renderAll();
    toast('U kthye menuja fillestare.', 'ok');
  });

  /* ══════════════════ NISJA ══════════════════ */
  function renderAll() {
    fillCatSelects(); renderItems(); renderCats(); renderSettings(); renderReviews();
  }

  bindSettings();

  if (!store.configured) {
    gateMsg('Supabase nuk është konfiguruar ende. Mund ta provosh panelin me «Provoje pa llogari».', 'warn');
  }
  if (store.currentUser() && store.configured) { localMode = false; showPanel(); }
})();
