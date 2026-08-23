/* ============================================================================
   SPRINT — Pamja e motorristit.
   Njësia e punës është nisja, jo porosia: motorristët dalin me 2–3 bashkë dhe
   i mbyllin një nga një. Prandaj ekrani ka dy gjendje — zgjedhja para nisjes,
   dhe ndalesat gjatë saj.
   ========================================================================== */
(function () {
  const S = window.SPRINT;
  const store = S.store;
  const $ = (s) => document.querySelector(s);
  const esc = (t) => String(t == null ? '' : t)
    .replace(/[&<>"']/g, (c) => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c]));
  const money = (n) => (Math.round(n) || 0).toLocaleString('sq-AL') + ' L';

  const R = { ready: [], run: null, stops: [], day: null, pick: new Set(),
              live: false, poll: null, target: null };

  /* Vendndodhja merret vetëm në çastet kur faqja është hapur gjithsesi —
     kur niset dhe kur dorëzon. Pa aplikacion, pa gjurmim të fshehtë. */
  async function here() {
    try { return await store.getLocation({ high: true, timeout: 6000 }); }
    catch (e) { return null; }
  }

  const tel = (p) => 'tel:' + String(p || '').replace(/[^\d+]/g, '');

  /* ---------- vizatimi ---------- */

  function renderPicking() {
    const list = R.ready;
    const head = `<div class="rsec">
      <h2>Gati për t'u marrë</h2>
      <p class="sub">Zgjidh porositë që merr bashkë, pastaj shtyp «Nisu».</p>
    </div>`;

    if (!list.length) {
      return head + '<p class="empty">Asnjë porosi gati. Prit pak. 🛵</p>' + dayBox() + privacy();
    }

    const cards = list.map((o) => {
      const on = R.pick.has(o.id);
      return `<article class="stop${on ? ' pick' : ''}" data-stop="${esc(o.id)}">
        <div class="s-pickbox" data-pickit="${esc(o.id)}">
          <span class="box">✓</span>
          <span class="s-no">#${o.number}</span>
          <span class="s-pay ${o.payment === 'cash' ? 'cash' : 'card'}">${o.payment === 'cash' ? 'Para në dorë' : 'Me kartë'}</span>
          <span class="s-tot">${esc(money(o.total))}</span>
        </div>
        <div class="s-bd">
          <span class="s-name">${esc(o.customer_name)}</span>
          <span class="s-addr">${esc(o.address || '')}${o.lat ? ' · 📍' : ''}</span>
          ${o.note ? `<p class="s-note">📝 ${esc(o.note)}</p>` : ''}
        </div>
      </article>`;
    }).join('');

    const n = R.pick.size;
    const sum = list.filter((o) => R.pick.has(o.id))
      .reduce((s, o) => s + (Number(o.total) || 0), 0);

    return head + cards + `<div class="gobar">
      <button class="gobtn" id="goRun"${n ? '' : ' disabled'}>
        ${n ? `Nisu me ${n} porosi · ${esc(money(sum))}` : 'Zgjidh të paktën një porosi'}
      </button>
    </div>` + dayBox() + privacy();
  }

  /* ══════════════════ RADHA E NDALESAVE ══════════════════
     Durrësi është 8 × 11 km. Në një qytet kaq të vogël radha matematikore e
     ndalesave ndryshon pak minuta; ajo që ndryshon shumë është të mos shkosh
     Plazh, të kthehesh Shkozet, dhe të ngjitesh sërish Plazh. Prandaj:

       1. ndalesat grupohen sipas zonës
       2. zonat renditen sipas largësisë nga dyqani, më e afërta e para
       3. brenda zonës, gjithmonë te më e afërta nga aty ku je

     Ndalesat pa koordinatë nuk humbin — shkojnë në fund të grupit të tyre, me
     shënimin që të kërkohen me sy. */

  const SHOP = (S.config && S.config.geo) || { lat: 41.3236, lng: 19.4432 };

  /** Largësi e përafërt në kilometra. Brenda një qyteti të vogël, vija e
      drejtë dhe rruga e vërtetë japin të njëjtën radhë ndalesash. */
  function km(a, b) {
    if (!a || !b || a.lat == null || b.lat == null) return Infinity;
    const R2 = 6371;
    const dLat = (b.lat - a.lat) * Math.PI / 180;
    const dLng = (b.lng - a.lng) * Math.PI / 180;
    const la = a.lat * Math.PI / 180, lb = b.lat * Math.PI / 180;
    const h = Math.sin(dLat / 2) ** 2 + Math.cos(la) * Math.cos(lb) * Math.sin(dLng / 2) ** 2;
    return 2 * R2 * Math.asin(Math.sqrt(h));
  }

  const hasPin = (o) => o && o.lat != null && o.lng != null;

  /** Rendit ndalesat: zonat sipas afërsisë, brenda zonës gjithmonë më e afërta. */
  function ordered(list) {
    const groups = new Map();
    (list || []).forEach((o) => {
      const key = o.zone || '—';
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(o);
    });

    // Sa larg është zona: mesatarja e pikave që njohim.
    const dist = (arr) => {
      const p = arr.filter(hasPin);
      if (!p.length) return Infinity;          // pa pika, zona shkon në fund
      const lat = p.reduce((n, o) => n + o.lat, 0) / p.length;
      const lng = p.reduce((n, o) => n + o.lng, 0) / p.length;
      return km(SHOP, { lat, lng });
    };

    const zones = [...groups.entries()]
      .map(([name, arr]) => ({ name, arr, d: dist(arr) }))
      .sort((a, b) => (a.d - b.d) || a.name.localeCompare(b.name, 'sq'));

    const out = [];
    let from = SHOP;
    zones.forEach((z) => {
      const left = z.arr.filter(hasPin);
      const blind = z.arr.filter((o) => !hasPin(o));
      while (left.length) {
        let bi = 0, bd = Infinity;
        left.forEach((o, i) => { const d = km(from, o); if (d < bd) { bd = d; bi = i; } });
        const pick = left.splice(bi, 1)[0];
        pick._km = bd;
        out.push(pick);
        from = pick;
      }
      blind.forEach((o) => out.push(o));        // pa pin: në fund të zonës së vet
    });
    return out;
  }

  function renderRun() {
    const left = ordered(R.stops.filter((o) => o.status === 'delivering'));
    const done = R.stops.filter((o) => o.status === 'done');
    const noPin = left.filter((o) => !hasPin(o)).length;

    const head = `<div class="rsec">
      <h2>Nisja jote — ${left.length} ndalesa</h2>
      <p class="sub">Para në dorë për t'u arkëtuar: <b>${esc(money(R.run.cash_due || 0))}</b></p>
      <p class="sub">Radha është sipas zonës dhe afërsisë${noPin
        ? ` · ${noPin} pa pikë në hartë` : ''}. Nuk je i detyruar ta ndjekësh.</p>
    </div>`;

    const card = (o, gone, i) => `<article class="stop${gone ? ' gone' : ''}" data-stop="${esc(o.id)}">
      <div class="s-hd">
        ${gone ? '' : `<span class="s-seq">${i + 1}</span>`}
        <span class="s-no">#${o.number}</span>
        <span class="s-pay ${o.payment === 'cash' ? 'cash' : 'card'}">${o.payment === 'cash' ? 'Para në dorë' : 'Me kartë'}</span>
        <span class="s-tot">${esc(money(o.total))}</span>
      </div>
      <div class="s-bd">
        <span class="s-name">${esc(o.customer_name)}</span>
        <span class="s-addr">${esc(o.address || '')}</span>
        <span class="s-zone">${o.zone ? '📍 ' + esc(o.zone) : '📍 pa zonë'}${
          o._km != null && isFinite(o._km) ? ' · ' + o._km.toFixed(1) + ' km' : ''}${
          hasPin(o) ? '' : ' · pa pikë në hartë'}</span>
        ${o.note ? `<p class="s-note">📝 ${esc(o.note)}</p>` : ''}
      </div>
      ${gone ? '' : `<div class="s-act">
        <a class="sbtn s-nav" href="${esc(store.navLink(o))}" target="_blank" rel="noopener">🧭 Navigo</a>
        <a class="sbtn s-call" href="${esc(tel(o.phone))}">📞 Telefono</a>
        <button class="sbtn s-done wide" data-deliver="${esc(o.id)}">U dorëzua</button>
        <button class="sbtn s-fail wide" data-fail="${esc(o.id)}">Nuk u gjend / nuk përgjigjet</button>
      </div>`}
    </article>`;

    return head
      + left.map((o, i) => card(o, false, i)).join('')
      + (done.length ? `<div class="rsec"><h2>Dorëzuar — ${done.length}</h2></div>`
                        + done.map((o, i) => card(o, true, i)).join('') : '')
      + dayBox() + privacy();
  }

  function dayBox() {
    const d = R.day || { deliveries: 0, cash: 0, card: 0 };
    return `<div class="rsec" style="margin-top:.6rem">
      <h2>Sot</h2>
      <div class="daybox">
        <div><b>${d.deliveries || 0}</b><span>Dorëzime</span></div>
        <div><b>${esc(money(d.cash || 0))}</b><span>Para në dorë</span></div>
        <div><b>${esc(money(d.card || 0))}</b><span>Me kartë</span></div>
      </div>
    </div>`;
  }

  const privacy = () => `<p class="privacy">Gjatë nisjes regjistrohet vendndodhja
    kur nisesh dhe kur dorëzon — vetëm në ato çaste, dhe vetëm sa je në punë.
    Kjo shërben për të ditur sa zgjatin dorëzimet.</p>`;

  function render() {
    $('#v-runs').innerHTML = R.run ? renderRun() : renderPicking();
  }

  /* ---------- të dhënat ---------- */

  async function load(silent) {
    if (!R.live) return;
    try {
      const mine = await store.drvMyRun();
      S.staf.offline(false);
      R.run = mine.run; R.stops = mine.stops;
      if (!R.run) {
        R.ready = (await store.drvReady()) || [];
        // hiq nga zgjedhja çdo porosi që e mori dikush tjetër ndërkohë
        const ids = new Set(R.ready.map((o) => o.id));
        [...R.pick].forEach((id) => { if (!ids.has(id)) R.pick.delete(id); });
      }
      R.day = await store.drvMyDay().catch(() => null);
      render();
    } catch (e) {
      S.staf.offline(true);
      if (/kod|Hyr|esion/i.test(e.message)) S.staf.logout();
    }
  }

  async function startRun() {
    const ids = [...R.pick];
    if (!ids.length) return;
    const btn = $('#goRun');
    if (btn) { btn.disabled = true; btn.textContent = 'Po nisesh…'; }
    try {
      await store.drvStartRun(ids, await here());
      R.pick.clear();
      await load(true);
    } catch (e) {
      alert(e.message);
      await load(true);
    }
  }

  /* ---------- dorëzimi ---------- */

  function openDeliver(id) {
    const o = R.stops.find((x) => x.id === id);
    if (!o) return;
    R.target = o;
    $('#dlvTitle').textContent = 'Porosia #' + o.number;
    $('#dlvErr').textContent = '';
    const cash = o.payment === 'cash';
    $('#dlvSub').textContent = cash
      ? 'Sa para arkëtove? Lëre siç është nëse mori shumën e plotë.'
      : 'Kjo porosi është paguar me kartë — nuk arkëtohet gjë.';
    $('#dlvCashWrap').classList.toggle('hide', !cash);
    $('#dlvCash').value = cash ? String(Math.round(Number(o.total) || 0)) : '';
    $('#dlvModal').classList.add('on');
  }
  const closeDeliver = () => { $('#dlvModal').classList.remove('on'); R.target = null; };

  async function confirmDeliver() {
    const o = R.target;
    if (!o) return;
    const cash = o.payment === 'cash'
      ? Number(String($('#dlvCash').value).replace(/\D/g, '')) : null;
    $('#dlvOk').disabled = true;
    try {
      await store.drvDelivered(o.id, await here(), cash);
      closeDeliver();
      await load(true);
    } catch (e) {
      $('#dlvErr').textContent = e.message;
    } finally { $('#dlvOk').disabled = false; }
  }

  function openFail(id) {
    R.target = R.stops.find((x) => x.id === id) || null;
    if (R.target) $('#failModal').classList.add('on');
  }
  const closeFail = () => { $('#failModal').classList.remove('on'); R.target = null; };

  async function confirmFail() {
    const o = R.target;
    if (!o) return;
    try {
      await store.drvFailed(o.id, $('#failReason').value);
      closeFail();
      await load(true);
    } catch (e) { alert(e.message); }
  }

  /* ---------- lidhjet ---------- */

  document.addEventListener('click', (e) => {
    if (e.target.closest('[data-dlv-close]')) return closeDeliver();
    if (e.target.closest('[data-fail-close]')) return closeFail();
    if (e.target.id === 'dlvOk') return confirmDeliver();
    if (e.target.id === 'failOk') return confirmFail();
    if (!R.live) return;

    const pk = e.target.closest('[data-pickit]');
    if (pk) {
      const id = pk.dataset.pickit;
      if (R.pick.has(id)) R.pick.delete(id); else R.pick.add(id);
      render();
      return;
    }
    if (e.target.closest('#goRun')) return startRun();

    const d = e.target.closest('[data-deliver]');
    if (d) return openDeliver(d.dataset.deliver);

    const f = e.target.closest('[data-fail]');
    if (f) return openFail(f.dataset.fail);
  });

  S.views = S.views || {};
  S.views.runs = {
    label: 'Motorristi',
    start() {
      R.live = true;
      $('#v-runs').classList.remove('hide');
      load();
      clearInterval(R.poll);
      R.poll = setInterval(() => { if (!document.hidden) load(true); }, 12000);
    },
    stop() {
      R.live = false;
      clearInterval(R.poll);
      $('#v-runs').classList.add('hide');
    },
    refresh: () => load(true),
  };
})();
