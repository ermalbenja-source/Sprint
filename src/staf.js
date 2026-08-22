/* ============================================================================
   SPRINT — Guaska e aplikacionit të stafit.
   Një hyrje për të gjithë. Kodi vendos se cilat pamje hapen: kuzhinieri sheh
   furrën, motorristi sheh nisjen, pronari sheh të dyja dhe ndërron mes tyre.
   ========================================================================== */
(function () {
  const S = window.SPRINT;
  const store = S.store;
  const $ = (s) => document.querySelector(s);
  const esc = (t) => String(t == null ? '' : t)
    .replace(/[&<>"']/g, (c) => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c]));

  // Pamjet që di ta hapë kjo faqe. Ekranet e tjera (porositë, menuja,
  // magazina) rrinë te paneli — këtu vijnë vetëm ato që përdoren në këmbë.
  const HERE = ['kds', 'runs'];

  const A = { me: null, view: null, poll: null };

  /* ══════════════════ HYRJA ══════════════════ */

  let pin = '';
  const showPin = () => { $('#pinShow').textContent = '•'.repeat(pin.length); };

  function gateErr(m) {
    $('#gateErr').textContent = m || '';
    if (m) {
      $('#pinShow').classList.add('err');
      setTimeout(() => $('#pinShow').classList.remove('err'), 320);
    }
  }

  async function tryLogin() {
    if (pin.length < 4) return gateErr('Kodi ka të paktën 4 shifra.');
    const code = pin;
    pin = ''; showPin();
    try {
      await store.staffLogin(code, 'staf');
      const me = await store.myScreens();
      if (!me) return gateErr('Sesioni nuk u hap. Provo sërish.');
      const mine = (me.screens || []).filter((s) => HERE.indexOf(s) >= 0);
      if (!mine.length) {
        await store.staffLogout();
        return gateErr('Ky kod nuk ka asnjë ekran këtu. Hyr te paneli me email.');
      }
      enter(me);
    } catch (e) {
      gateErr(e.message);
    }
  }

  $('.keys').addEventListener('click', (e) => {
    const b = e.target.closest('[data-k]');
    if (!b) return;
    gateErr('');
    const k = b.dataset.k;
    if (k === 'del') pin = pin.slice(0, -1);
    else if (k === 'ok') return tryLogin();
    else if (pin.length < 8) pin += k;
    showPin();
    if (pin.length === 8) tryLogin();
  });

  document.addEventListener('keydown', (e) => {
    if ($('#gate').classList.contains('hide')) return;
    if (/^[0-9]$/.test(e.key) && pin.length < 8) { pin += e.key; showPin(); gateErr(''); }
    else if (e.key === 'Backspace') { pin = pin.slice(0, -1); showPin(); }
    else if (e.key === 'Enter') tryLogin();
  });

  /* ══════════════════ PAMJET ══════════════════ */

  function setView(key) {
    if (A.view && S.views[A.view]) S.views[A.view].stop();
    A.view = key;
    document.querySelectorAll('#switcher button').forEach((b) =>
      b.classList.toggle('on', b.dataset.view === key));
    if (S.views[key]) S.views[key].start();
    try { localStorage.setItem('sprint-staf-view', key); } catch (e) {}
  }

  function enter(me) {
    A.me = me;
    const mine = (me.screens || []).filter((s) => HERE.indexOf(s) >= 0);

    $('#gate').classList.add('hide');
    $('#app').classList.remove('hide');
    $('#whoTxt').textContent = me.name + ' · ' + (store.STAFF_ROLES[me.role] || me.role);

    // Ndërruesi shfaqet vetëm kur ka vërtet ku të ndërrohet.
    const sw = $('#switcher');
    if (mine.length > 1) {
      sw.innerHTML = mine.map((k) =>
        `<button data-view="${esc(k)}">${esc((S.views[k] && S.views[k].label) || k)}</button>`).join('');
      sw.classList.remove('hide');
    } else {
      sw.innerHTML = ''; sw.classList.add('hide');
    }

    let want = null;
    try { want = localStorage.getItem('sprint-staf-view'); } catch (e) {}
    setView(mine.indexOf(want) >= 0 ? want : mine[0]);

    clearInterval(A.poll);
    A.poll = setInterval(() => {
      if (!document.hidden && A.view && S.views[A.view]) S.views[A.view].refresh();
    }, 8000);
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden && A.view && S.views[A.view]) S.views[A.view].refresh();
    });
  }

  async function logout() {
    clearInterval(A.poll);
    if (A.view && S.views[A.view]) S.views[A.view].stop();
    A.view = null; A.me = null;
    await store.staffLogout();
    pin = ''; showPin(); gateErr('');
    $('#app').classList.add('hide');
    $('#gate').classList.remove('hide');
  }

  /* ══════════════════ E PËRBASHKËT ══════════════════ */

  S.staf = {
    offline: (on) => $('#offline').classList.toggle('on', !!on),
    logout,
    me: () => A.me,
  };

  document.addEventListener('click', (e) => {
    const v = e.target.closest('#switcher button');
    if (v) return setView(v.dataset.view);
    if (e.target.closest('#outBtn')) return logout();
    if (e.target.closest('#refBtn') && A.view && S.views[A.view]) return S.views[A.view].refresh();
  });

  /* Pa bazë të vërtetë kjo faqe do të ishte një tastierë që nuk hap asgjë.
     Prandaj kodet shembull thuhen hapur — dhe vetëm atëherë. */
  function showDemoCodes() {
    if (store.configured || !store.DEMO_STAFF) return;
    const box = document.createElement('p');
    box.className = 'gate-sub';
    box.style.cssText = 'border:1px dashed var(--line);border-radius:12px;padding:.7rem;'
      + 'font-size:.82rem;line-height:1.6';
    box.innerHTML = '<b style="color:var(--gold)">Provë pa bazë të dhënash</b><br>'
      + store.DEMO_STAFF.map((s) =>
          `${esc(s.name)} · <b class="code">${esc(s.pin)}</b>`).join('<br>');
    document.querySelector('.gate-card').appendChild(box);
  }
  showDemoCodes();

  /* Sesioni i ruajtur e kalon hyrjen — pajisja nuk e shkruan kodin çdo turn. */
  store.myScreens().then((me) => {
    if (me && (me.screens || []).some((s) => HERE.indexOf(s) >= 0)) enter(me);
    else showPin();
  }).catch(() => showPin());
})();
