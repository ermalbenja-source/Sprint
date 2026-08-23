/* ============================================================================
   SPRINT — Njoftimet për ekranin e stafit.

   Dy rrugë, sepse asnjëra nuk mjafton vetëm:

   1. NJOFTIM I VËRTETË (push). Del edhe kur faqja është e mbyllur dhe telefoni
      në xhep. Kjo është ajo që i duhet motorristit. POR shfletuesi e lejon
      vetëm mbi HTTPS ose te localhost — në një rrjet lokal me http://192.168…
      nuk ndizet dot. Rregull i shfletuesit, jo zgjedhje e programit.
      Te iPhone kërkon edhe që faqja të jetë shtuar në ekranin bazë.

   2. ZILJA BRENDA FAQES. Punon kudo, edhe mbi http të thjeshtë, sa kohë ekrani
      rri hapur — si tableti i murit te kuzhina. Bie zilja, dridhet telefoni,
      dhe ekrani mbahet ndezur sa jemi në punë.

   Butoni e thotë hapur cilën nga të dyja e ka të ndezur, që askush të mos rrijë
   duke pritur një njoftim që nuk vjen dot.
   ========================================================================== */
(function () {
  const S = window.SPRINT;
  const store = S.store;
  const $ = (s) => document.querySelector(s);

  const N = { reg: null, sub: null, vapid: null, wake: null, on: false };

  const b64ToU8 = (s) => {
    const pad = '='.repeat((4 - (s.length % 4)) % 4);
    const raw = atob((s + pad).replace(/-/g, '+').replace(/_/g, '/'));
    return Uint8Array.from(raw, (c) => c.charCodeAt(0));
  };
  const u8ToB64 = (buf) => {
    const b = new Uint8Array(buf);
    let s = '';
    for (let i = 0; i < b.length; i++) s += String.fromCharCode(b[i]);
    return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  };

  /* `isSecureContext` është përgjigjja e saktë: localhost e ka true edhe mbi
     http, ndaj provat te vetë kompjuteri punojnë. */
  const canPush = () => !!(window.isSecureContext && 'serviceWorker' in navigator
    && 'PushManager' in window && 'Notification' in window);

  /* ---------- ekrani i ndezur ----------
     Kuzhina dhe furra e kanë tabletin në mur gjithë ditën. Pa këtë, ekrani
     fiket dhe porosia e re shihet me dhjetë minuta vonesë. */
  async function keepAwake(on) {
    try {
      if (on && !N.wake && 'wakeLock' in navigator) {
        N.wake = await navigator.wakeLock.request('screen');
        N.wake.addEventListener('release', () => { N.wake = null; });
      } else if (!on && N.wake) {
        await N.wake.release(); N.wake = null;
      }
    } catch (e) { N.wake = null; }
  }
  // Bllokimi bie kur faqja kalon prapa; kur kthehet, rikthehet.
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden && N.on) keepAwake(true);
  });

  /* ---------- gjendja e butonit ---------- */
  function paint(state, why) {
    const b = $('#notifBtn');
    if (!b) return;
    b.classList.toggle('on', state === 'push');
    b.classList.toggle('off', state === 'off');
    b.textContent = state === 'push' ? '🔔 Njoftime'
      : state === 'zile' ? '🔊 Zile' : '🔕 Njoftime';
    b.title = why || '';
    b.setAttribute('aria-label', why || 'Njoftimet');
  }

  /* ---------- abonimi ---------- */
  async function subscribe() {
    if (!canPush()) {
      throw new Error(window.isSecureContext
        ? 'Ky shfletues nuk i mbështet njoftimet.'
        : 'Njoftimet kërkojnë HTTPS. Mbi rrjetin lokal punon zilja e faqes.');
    }
    const perm = await Notification.requestPermission();
    if (perm !== 'granted') throw new Error('Nuk u dha leja për njoftimet.');

    if (!N.vapid) {
      const r = await fetch('/api/vapid').then((x) => x.json()).catch(() => null);
      if (!r || !r.publicKey) throw new Error('Serveri nuk dha çelësin e njoftimeve.');
      N.vapid = r.publicKey;
    }

    N.reg = await navigator.serviceWorker.register('sw.js');
    await navigator.serviceWorker.ready;

    N.sub = await N.reg.pushManager.getSubscription();
    if (!N.sub) {
      N.sub = await N.reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: b64ToU8(N.vapid),
      });
    }
    const j = N.sub.toJSON();
    await store.pushSubscribe(j.endpoint, j.keys.p256dh, j.keys.auth,
      navigator.userAgent.slice(0, 100));
    return true;
  }

  async function unsubscribe() {
    try {
      if (N.sub) {
        await store.pushUnsubscribe(N.sub.endpoint).catch(() => {});
        await N.sub.unsubscribe().catch(() => {});
        N.sub = null;
      }
    } catch (e) {}
  }

  /* ---------- ndezja dhe fikja ---------- */
  async function toggle() {
    if (N.on) {
      N.on = false;
      await unsubscribe();
      await keepAwake(false);
      save(false);
      paint('off', 'Njoftimet janë të fikura.');
      return;
    }
    N.on = true;
    save(true);
    await keepAwake(true);
    try {
      await subscribe();
      paint('push', 'Njoftimet vijnë edhe kur faqja është e mbyllur.');
    } catch (e) {
      // Zilja mbetet: më mirë një ekran që bërtet sesa asgjë.
      paint('zile', e.message + ' Zilja e faqes është e ndezur.');
    }
  }

  const save = (v) => { try { localStorage.setItem('sprint-njoftime', v ? '1' : '0'); } catch (e) {} };
  const load = () => { try { return localStorage.getItem('sprint-njoftime') === '1'; } catch (e) { return false; } };

  /* Rilidhja pa pyetur: nëse leja është dhënë më parë, abonimi rifreskohet vetë
     në heshtje — sesioni i pajisjes mund të jetë ndërruar. */
  async function restore() {
    if (!load()) { paint('off', 'Njoftimet janë të fikura.'); return; }
    N.on = true;
    keepAwake(true);
    if (canPush() && Notification.permission === 'granted') {
      try {
        await subscribe();
        paint('push', 'Njoftimet vijnë edhe kur faqja është e mbyllur.');
        return;
      } catch (e) {}
    }
    paint('zile', canPush()
      ? 'Zilja e faqes është e ndezur.'
      : 'Mbi rrjetin lokal punon vetëm zilja e faqes (njoftimet kërkojnë HTTPS).');
  }

  /* Kur njoftimi preket, service worker-i kërkon rifreskim — ekrani duhet të
     tregojë porosinë e re menjëherë, jo pas ciklit tjetër. */
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.addEventListener('message', (e) => {
      if (e.data && e.data.sprint === 'refresh' && S.staf && S.staf.refresh) S.staf.refresh();
    });
  }

  document.addEventListener('click', (e) => {
    if (e.target.closest('#notifBtn')) toggle();
  });

  S.njoftim = { toggle, restore, canPush, keepAwake, state: () => N.on };
})();
