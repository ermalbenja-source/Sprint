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
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeDrawer(); });

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
    if (!localMode) { try { await store.deleteItem(editing); } catch (e) { toast(e.message, 'err'); } }
    markDirty(); renderItems(); closeDrawer();
    toast('Pjata u fshi.', 'ok');
  });

  /* ---------- fotoja e pjatës ---------- */
  $('#dPick').addEventListener('click', () => $('#dFile').click());
  $('#dFile').addEventListener('change', async (e) => {
    const file = e.target.files[0]; if (!file) return;
    const m = draft.menu.find((x) => x.id === editing); if (!m) return;
    $('#dPhoto').classList.add('busy');
    try {
      m.img = await store.uploadPhoto(file, m.id);
      paintPhoto(m); markDirty(); renderItems();
      toast('Fotoja u ngarkua. Shtyp «Ruaj ndryshimet».', 'ok');
    } catch (err) { toast(err.message, 'err'); }
    finally { $('#dPhoto').classList.remove('busy'); e.target.value = ''; }
  });
  $('#dPhotoClear').addEventListener('click', () => {
    const m = draft.menu.find((x) => x.id === editing); if (!m) return;
    delete m.img; paintPhoto(m); markDirty(); renderItems();
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
    renderHours();
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

  $('#evPick').addEventListener('click', () => $('#evFile').click());
  $('#evFile').addEventListener('change', async (e) => {
    const file = e.target.files[0]; if (!file) return;
    $('#evBox').classList.add('busy');
    try {
      draft.settings.config.eventsPhoto = await store.uploadPhoto(file, 'salla');
      renderSettings(); markDirty();
      toast('Fotoja e sallës u ngarkua.', 'ok');
    } catch (err) { toast(err.message, 'err'); }
    finally { $('#evBox').classList.remove('busy'); e.target.value = ''; }
  });
  $('#evClear').addEventListener('click', () => {
    delete draft.settings.config.eventsPhoto; renderSettings(); markDirty();
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
