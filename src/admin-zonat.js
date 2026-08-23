/* ============================================================================
   SPRINT — Zonat e dërgesës te paneli.

   Zona vjen para koordinatës. Fjalët e adresës punojnë që në porosinë e parë,
   pa asnjë pikë mbi hartë; kufiri i vizatuar merr përparësi kur pika njihet.

   Kufirin e vizaton pronari, jo një hartë e gatshme: ai e di se ku shkojnë
   vërtet porositë. Vija e hollë e Durrësit është vetëm për orientim — u
   vërtetua se kufiri administrativ nuk përputhet me zonën ku dorëzohet.
   ========================================================================== */
(function () {
  const S = window.SPRINT;
  const store = S.store;
  const $ = (s) => document.querySelector(s);
  const esc = (t) => String(t == null ? '' : t)
    .replace(/[&<>"']/g, (c) => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c]));

  const toast = (m, k) => {
    const el = $('#toast');
    if (!el) return;
    el.textContent = m; el.className = 'on ' + (k || '');
    clearTimeout(toast._t);
    toast._t = setTimeout(() => { el.className = k || ''; }, 3800);
  };

  const Z = { list: [], sel: null, map: null, loaded: false, marks: [], msel: null };

  /* Kufiri i Durrësit, i marrë nga geoBoundaries (CC BY 4.0). Nuk e cakton
     zonën — vetëm ndihmon syrin të kuptojë ku është duke vizatuar. */
  const DURRES = SPRINT_DURRES || null;

  const shop = () => (S.config && S.config.geo) || { lat: 41.3236, lng: 19.4432 };

  async function load(force) {
    if (Z.loaded && !force) return;
    try {
      const [zs, lms] = await Promise.all([store.fetchZones(), store.fetchLandmarks()]);
      Z.list = zs || [];
      Z.marks = lms || [];
      if (!Z.list.length) Z.list = store.DEFAULT_ZONES.map((z, i) =>
        Object.assign({ id: 'z' + i, outline: null, active: true }, z,
                      { keywords: z.keywords.slice() }));
      Z.loaded = true;
      if (!Z.sel && Z.list.length) Z.sel = Z.list[0].id || Z.list[0].name;
      render();
      renderMarks();
      ensureMap();
    } catch (e) {
      $('#zoneList').innerHTML = '<p class="count">Nuk u lexuan zonat: ' + esc(e.message) + '</p>';
    }
  }

  const key = (z) => z.id || z.name;
  const current = () => Z.list.find((z) => key(z) === Z.sel) || null;

  function render() {
    if (!Z.list.length) {
      $('#zoneList').innerHTML = '<p class="count">Ende pa zona. Shto të parën më poshtë.</p>';
      return;
    }
    $('#zoneList').innerHTML = Z.list.map((z) => {
      const n = (z.outline || []).length;
      return `<div class="row zrow${key(z) === Z.sel ? ' on' : ''}" data-zone="${esc(key(z))}">
        <span class="zdot" style="background:${esc(z.color || '#DE7F1C')}"></span>
        <div class="nm">
          <input type="text" data-zf="name" value="${esc(z.name)}" maxlength="60"
                 aria-label="Emri i zonës">
          <input type="text" data-zf="keywords" value="${esc((z.keywords || []).join(', '))}"
                 placeholder="fjalë të adresës, të ndara me presje"
                 aria-label="Fjalët kyçe" style="margin-top:.3rem">
        </div>
        <div class="zact">
          <span class="zmark ${n ? 'has' : 'no'}">${n ? n + ' pika' : 'pa kufi'}</span>
          <button class="btn btn-d btn-sm" data-zdel="${esc(key(z))}" title="Fshi zonën">×</button>
        </div>
      </div>`;
    }).join('');
    paintMap();
  }

  /* ---------- harta ---------- */

  function ensureMap() {
    const el = $('#zoneMap');
    if (!el || Z.map) return;
    const c = shop();
    Z.map = S.miniMap(el, {
      lat: c.lat, lng: c.lng, zoom: 13,
      onMove: () => paintMap(),
      onVertex: (i) => {
        // Klikim mbi një qoshe e heq atë — mënyra më e shkurtër për të
        // rregulluar një pikë të vendosur gabim.
        const z = current();
        if (!z || !z.outline) return;
        z.outline = z.outline.filter((_, k) => k !== i);
        if (!z.outline.length) z.outline = null;
        render();
      },
      onClick: (p) => {
        // Kur një pikë referimi është e zgjedhur, klikimi e zhvendos atë.
        // Përndryshe klikimi shton një qoshe te kufiri i zonës.
        if (Z.msel != null && Z.marks[Z.msel]) {
          Z.marks[Z.msel].lat = p.lat;
          Z.marks[Z.msel].lng = p.lng;
          renderMarks();
          return;
        }
        const z = current();
        if (!z) { toast('Zgjidh një zonë së pari.', 'err'); return; }
        z.outline = (z.outline || []).concat([[p.lat, p.lng]]);
        render();
      },
    });
    el.classList.add('draw');
    // Kufiri i Durrësit e ndihmon syrin që në hapje.
    if (DURRES) Z.map.fit(DURRES.kufiri.map((p) => [p[1], p[0]]), 60);
    paintMap();
  }

  function paintMap() {
    if (!Z.map) return;
    const shapes = [];

    if (DURRES) {
      shapes.push({ kind: 'poly', points: DURRES.kufiri.map((p) => [p[1], p[0]]),
        fill: 'rgba(255,255,255,.04)', stroke: 'rgba(255,255,255,.35)', width: 1, dash: '5 5' });
    }
    Z.list.forEach((z) => {
      if (!z.outline || z.outline.length < 2) return;
      const on = key(z) === Z.sel;
      shapes.push({ kind: 'poly', points: z.outline,
        fill: hexA(z.color, on ? 0.3 : 0.12), stroke: z.color || '#DE7F1C',
        width: on ? 3 : 1.5, handles: on });
    });
    Z.marks.forEach((m, i) => {
      if (m.lat == null || m.lng == null) return;
      shapes.push({ kind: 'dot', lat: Number(m.lat), lng: Number(m.lng),
        r: i === Z.msel ? 8 : 5, fill: i === Z.msel ? '#E5544B' : '#9C9089',
        label: i === Z.msel ? m.name : '' });
    });
    const c = shop();
    shapes.push({ kind: 'dot', lat: c.lat, lng: c.lng, r: 7, fill: '#FFC244', label: 'dyqani' });

    Z.map.setShapes(shapes);
    const z = current();
    $('#zmTitle').textContent = z ? 'Kufiri i zonës — ' + z.name : 'Kufiri i zonës';
    $('#zmCount').textContent = z
      ? ((z.outline || []).length
          ? (z.outline.length + ' pika · kliko një pikë për ta hequr')
          : 'Kliko mbi hartë për të vendosur qoshen e parë.')
      : '';
  }

  const hexA = (hex, a) => {
    const h = String(hex || '#DE7F1C').replace('#', '');
    const n = parseInt(h.length === 3 ? h.split('').map((c) => c + c).join('') : h, 16);
    return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
  };

  /* ---------- pikat e referimit ---------- */
  function renderMarks() {
    if (!Z.marks.length) {
      $('#lmList').innerHTML = '<p class="count">Ende pa pika. Ato mbushen vetë kur '
        + 'motorristi ruan një vend gjatë dorëzimit — ose shtoji ti këtu.</p>';
    } else {
      $('#lmList').innerHTML = Z.marks.map((m, i) => `
        <div class="row lmrow${i === Z.msel ? ' on' : ''}" data-lm="${i}">
          <span class="zdot" style="background:${i === Z.msel ? '#E5544B' : '#9C9089'}"></span>
          <div class="nm">
            <input type="text" data-lf="name" value="${esc(m.name || '')}" maxlength="90"
                   aria-label="Emri i pikës">
            <input type="text" data-lf="keywords" value="${esc((m.keywords || []).join(', '))}"
                   placeholder="fjalë shtesë (jo e detyrueshme)" aria-label="Fjalë shtesë"
                   style="margin-top:.3rem">
          </div>
          <span class="lmuse">${m.uses ? m.uses + '× përdorur' : 'e re'}<br>
            ${m.lat != null ? Number(m.lat).toFixed(4) + ', ' + Number(m.lng).toFixed(4) : '—'}</span>
        </div>`).join('');
    }
    $('#lmHint').textContent = Z.msel != null
      ? 'Kliko mbi hartë për ta zhvendosur pikën e zgjedhur.'
      : (Z.marks.length ? 'Kliko një pikë për ta parë dhe zhvendosur.' : '');
    paintMap();
  }

  async function saveMarks() {
    try {
      const saved = await store.saveLandmarks(Z.marks);
      if (saved && saved.length) Z.marks = saved;
      Z.msel = null;
      renderMarks();
      toast('Pikat u ruajtën.', 'ok');
    } catch (e) { toast(e.message, 'err'); }
  }

  /* ---------- prova ---------- */
  function testAddress() {
    const v = $('#ztest').value.trim();
    if (!v) { $('#ztestOut').textContent = ''; return; }
    const lm = store.landmarkOf(Z.marks, v);
    const r = store.zoneWhy(Z.list, v, lm ? lm.lat : null, lm ? lm.lng : null);
    const pjeset = [];
    pjeset.push(r.zone
      ? `→ <b style="color:var(--ok)">${esc(r.zone)}</b>`
        + (r.keyword ? ` <span style="opacity:.7">(nga «${esc(r.keyword)}» → ${esc(r.word)})</span>` : '')
      : '→ <b style="color:var(--warn)">pa zonë</b>');
    if (lm) pjeset.push(`🎯 <b style="color:var(--gold)">${esc(lm.name)}</b>`);
    else pjeset.push('<span style="opacity:.7">pa pikë referimi</span>');
    $('#ztestOut').innerHTML = pjeset.join(' &nbsp;·&nbsp; ');
  }

  /* ---------- ruajtja ---------- */
  async function save() {
    try {
      const saved = await store.saveZones(Z.list);
      if (saved && saved.length) Z.list = saved;
      Z.sel = Z.list.length ? key(Z.list[0]) : null;
      render();
      toast('Zonat u ruajtën.', 'ok');
    } catch (e) { toast(e.message, 'err'); }
  }

  async function reset() {
    try {
      Z.list = (await store.resetZones()) || [];
      if (!Z.list.length) Z.list = store.DEFAULT_ZONES.map((z, i) =>
        Object.assign({ id: 'z' + i, outline: null, active: true }, z,
                      { keywords: z.keywords.slice() }));
      Z.sel = key(Z.list[0]);
      render();
      toast('U kthyen te fillestaret.', 'ok');
    } catch (e) { toast(e.message, 'err'); }
  }

  /* ---------- lidhjet ---------- */
  document.addEventListener('click', (e) => {
    const t = e.target;

    const tab = t.closest('.tab');
    if (tab) { if (tab.dataset.tab === 'zone') load(); return; }

    const del = t.closest('[data-zdel]');
    if (del) {
      const z = Z.list.find((x) => key(x) === del.dataset.zdel);
      if (z && confirm('Të fshihet zona «' + z.name + '»? Porositë e vjetra nuk preken.')) {
        Z.list = Z.list.filter((x) => key(x) !== key(z));
        if (Z.sel === key(z)) Z.sel = Z.list.length ? key(Z.list[0]) : null;
        render();
      }
      return;
    }

    const row = t.closest('[data-zone]');
    if (row && !t.closest('input')) { Z.sel = row.dataset.zone; render(); return; }

    if (t.id === 'addZone') {
      const colors = ['#DE7F1C', '#3AA6C9', '#8E6BC9', '#4CAF6D', '#E6B23C', '#E5544B'];
      const z = { id: 'z' + Date.now().toString(36), name: 'Zonë e re',
        sort: (Z.list.length + 1) * 10, color: colors[Z.list.length % colors.length],
        keywords: [], outline: null, active: true };
      Z.list.push(z); Z.sel = key(z); render();
      return;
    }
    if (t.id === 'zmUndo') {
      const z = current();
      if (z && z.outline && z.outline.length) { z.outline = z.outline.slice(0, -1); render(); }
      return;
    }
    if (t.id === 'zmClear') {
      const z = current();
      if (z) { z.outline = null; render(); }
      return;
    }
    const lmRow = t.closest('[data-lm]');
    if (lmRow && !t.closest('input')) {
      const i = Number(lmRow.dataset.lm);
      Z.msel = (Z.msel === i) ? null : i;
      renderMarks();
      return;
    }
    if (t.id === 'addLm') {
      const c = Z.map ? Z.map.get() : shop();
      Z.marks.push({ name: 'Pikë e re', keywords: [], lat: c.lat, lng: c.lng,
        radius: 200, uses: 0, active: true });
      Z.msel = Z.marks.length - 1;
      renderMarks();
      return;
    }
    if (t.id === 'saveLm') return saveMarks();
    if (t.id === 'saveZones') return save();
    if (t.id === 'resetZones') return reset();
  });

  document.addEventListener('input', (e) => {
    const row = e.target.closest('[data-zone]');
    if (row && e.target.dataset.zf) {
      const z = Z.list.find((x) => key(x) === row.dataset.zone);
      if (!z) return;
      if (e.target.dataset.zf === 'name') z.name = e.target.value;
      else z.keywords = e.target.value.split(',').map((k) => k.trim()).filter(Boolean);
      paintMap();
      testAddress();
      return;
    }
    const lmRow = e.target.closest('[data-lm]');
    if (lmRow && e.target.dataset.lf) {
      const m = Z.marks[Number(lmRow.dataset.lm)];
      if (!m) return;
      if (e.target.dataset.lf === 'name') m.name = e.target.value;
      else m.keywords = e.target.value.split(',').map((k) => k.trim()).filter(Boolean);
      testAddress();
      return;
    }
    if (e.target.id === 'ztest') testAddress();
  });

  S.zonat = { load, list: () => Z.list, marks: () => Z.marks };
})();
