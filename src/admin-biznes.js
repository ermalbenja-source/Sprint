/* ============================================================================
   SPRINT — Stafi dhe fazat te paneli.
   Të dyja skedat ngarkohen vetëm kur hapen, që paneli të mos presë për to
   sa herë hapet.
   ========================================================================== */
(function () {
  const S = window.SPRINT;
  const store = S.store;
  const $ = (s) => document.querySelector(s);
  const $$ = (s) => Array.from(document.querySelectorAll(s));
  const esc = (t) => String(t == null ? '' : t)
    .replace(/[&<>"']/g, (c) => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c]));

  let toastT;
  function toast(msg, kind) {
    const el = $('#toast');
    if (!el) return;
    el.textContent = msg;
    el.className = 'on ' + (kind || '');
    clearTimeout(toastT);
    toastT = setTimeout(() => { el.className = kind || ''; }, 3800);
  }

  /* ══════════════════ STAFI ══════════════════ */

  let staff = [];
  let staffLoaded = false;

  async function loadStaff(force) {
    if (staffLoaded && !force) return;
    try {
      // Pa bazë të vërtetë, fetchStaff e krijon vetë ekipin shembull.
      staff = (await store.fetchStaff()) || [];
      staffLoaded = true;
      renderStaff();
    } catch (e) {
      $('#staffList').innerHTML = '<p class="count">Nuk u lexua stafi: ' + esc(e.message) + '</p>';
    }
  }

  function pinState(s) {
    if (s.locked_until && new Date(s.locked_until) > new Date()) {
      return { cls: 'locked', txt: '🔒 bllokuar 15 min' };
    }
    return s.pin_hash ? { cls: 'set', txt: '✓ ka kod' } : { cls: '', txt: 'pa kod' };
  }

  function renderStaff() {
    const roles = store.STAFF_ROLES;
    if (!staff.length) {
      $('#staffList').innerHTML = '<p class="count">Ende pa persona. Shto të parin më poshtë.</p>';
      return;
    }
    $('#staffList').innerHTML = staff.map((s) => {
      const p = pinState(s);
      return `<div class="srow" data-staff="${esc(s.id)}">
        <span class="rolechip r-${esc(s.role)}">${esc(roles[s.role] || s.role)}</span>
        <div class="who-n">
          <b>${esc(s.name)}</b>
          <span>${esc(s.phone || '')}</span>
        </div>
        <span class="pinst ${p.cls}">${p.txt}</span>
        <button class="sw${s.active === false ? '' : ' on'}" data-toggle="${esc(s.id)}"
                role="switch" aria-checked="${s.active === false ? 'false' : 'true'}"
                aria-label="Aktiv"></button>
        <span style="display:flex;gap:.35rem">
          <button class="btn btn-g btn-sm" data-edit="${esc(s.id)}">Ndrysho</button>
          <button class="btn btn-g btn-sm" data-pin="${esc(s.id)}">Kod</button>
          <button class="btn btn-d btn-sm" data-del="${esc(s.id)}">Fshi</button>
        </span>
      </div>`;
    }).join('');
  }

  /* Ndryshimi bëhet aty ku është rreshti — pa sirtar, pa faqe të dytë. */
  function editStaff(id) {
    const s = staff.find((x) => x.id === id);
    const row = $(`[data-staff="${CSS.escape(id)}"]`);
    if (!s || !row) return;
    const roles = store.STAFF_ROLES;

    row.innerHTML = `
      <div class="f" style="grid-column:1/3">
        <label>Emri</label>
        <input id="edName" value="${esc(s.name)}" maxlength="60">
      </div>
      <div class="f">
        <label>Roli</label>
        <select id="edRole">
          ${Object.keys(roles).map((r) =>
            `<option value="${r}"${r === s.role ? ' selected' : ''}>${esc(roles[r])}</option>`).join('')}
        </select>
      </div>
      <div class="f">
        <label>Telefoni</label>
        <input id="edPhone" value="${esc(s.phone || '')}" maxlength="30">
      </div>
      <span style="display:flex;gap:.35rem">
        <button class="btn btn-p btn-sm" id="edSave">Ruaj</button>
        <button class="btn btn-g btn-sm" id="edCancel">Anulo</button>
      </span>`;
    row.style.gridTemplateColumns = 'minmax(0,1fr) minmax(0,1fr) auto';
    $('#edName').focus();

    $('#edCancel').onclick = () => renderStaff();
    $('#edSave').onclick = async () => {
      const name = $('#edName').value.trim();
      if (name.length < 2) { toast('Emri duhet të paktën 2 shkronja.', 'err'); return; }
      try {
        await store.saveStaff({ id: s.id, name, role: $('#edRole').value, phone: $('#edPhone').value.trim(), active: s.active !== false });
        await loadStaff(true);
        toast('U ruajt.', 'ok');
      } catch (e) { toast(e.message, 'err'); }
    };
  }

  async function addStaff() {
    try {
      await store.saveStaff({ name: 'Person i ri', role: 'driver' });
      await loadStaff(true);
      const last = staff[staff.length - 1];
      if (last) editStaff(last.id);
    } catch (e) { toast(e.message, 'err'); }
  }

  /* ---------- kodi i hyrjes ---------- */
  let pinFor = null;

  function openPin(id) {
    const s = staff.find((x) => x.id === id);
    if (!s) return;
    pinFor = id;
    $('#pinTitle').textContent = 'Kodi i hyrjes — ' + s.name;
    $('#pinIn').value = '';
    $('#pinErr').textContent = '';
    $('#pinWrap').classList.add('on');
    setTimeout(() => $('#pinIn').focus(), 40);
  }
  const closePin = () => { $('#pinWrap').classList.remove('on'); pinFor = null; };

  async function savePin() {
    const pin = $('#pinIn').value.trim();
    if (!/^[0-9]{4,8}$/.test(pin)) {
      $('#pinErr').textContent = 'Kodi duhet të jetë 4–8 shifra.';
      return;
    }
    try {
      await store.setStaffPin(pinFor, pin);
      closePin();
      await loadStaff(true);
      toast('Kodi u vendos.', 'ok');
    } catch (e) {
      $('#pinErr').textContent = e.message;
    }
  }

  /* ══════════════════ KUSH SHEH ÇFARË ══════════════════ */

  let perms = null;

  async function loadPerms() {
    try {
      perms = await store.fetchRoleScreens();
      renderPerms();
    } catch (e) {
      $('#permTable').innerHTML = '<tr><td>Nuk u lexuan lejet: ' + esc(e.message) + '</td></tr>';
    }
  }

  function renderPerms() {
    const SC = store.SCREENS;
    const keys = store.ALL_SCREENS;
    const roles = ['manager', 'cashier', 'kitchen', 'driver'];
    const R = store.STAFF_ROLES;

    const head = '<thead><tr><th style="text-align:left">Ekrani</th>'
      + '<th class="owner">Pronar</th>'
      + roles.map((r) => `<th>${esc(R[r])}</th>`).join('') + '</tr></thead>';

    const body = '<tbody>' + keys.map((k) => `<tr>
      <th>${esc(SC[k])}</th>
      <td class="owner"><span title="Pronari i sheh të gjitha gjithmonë">✓</span></td>
      ${roles.map((r) => `<td><label>
        <input type="checkbox" data-perm="${esc(r)}" data-screen="${esc(k)}"
               ${(perms[r] || []).indexOf(k) >= 0 ? 'checked' : ''}
               aria-label="${esc(R[r])} · ${esc(SC[k])}"></label></td>`).join('')}
    </tr>`).join('') + '</tbody>';

    $('#permTable').innerHTML = head + body;
  }

  function togglePerm(role, screen, on) {
    perms[role] = perms[role] || [];
    const i = perms[role].indexOf(screen);
    if (on && i < 0) perms[role].push(screen);
    if (!on && i >= 0) perms[role].splice(i, 1);
  }

  async function savePerms() {
    try { await store.saveRoleScreens(perms); toast('Lejet u ruajtën.', 'ok'); }
    catch (e) { toast(e.message, 'err'); }
  }

  async function resetPerms() {
    perms = JSON.parse(JSON.stringify(store.DEFAULT_ROLE_SCREENS));
    try {
      await store.saveRoleScreens(perms);
      renderPerms();
      toast('U kthyen te fillestaret.', 'ok');
    } catch (e) { toast(e.message, 'err'); }
  }

  /* ══════════════════ FAZAT ══════════════════ */

  let phases = [];
  let phasesLoaded = false;

  async function loadPhases(force) {
    if (phasesLoaded && !force) return;
    try {
      phases = (await store.fetchPhases()) || [];
      phasesLoaded = true;
      renderPhases();
    } catch (e) {
      $('#phaseList').innerHTML = '<p class="count">Nuk u lexuan fazat: ' + esc(e.message) + '</p>';
    }
  }

  function renderPhases() {
    $('#phaseList').innerHTML = phases.map((p, i) => `
      <div class="phrow${p.enabled ? '' : ' off'}" data-ph="${esc(p.key)}">
        <span class="ic"><input value="${esc(p.icon)}" maxlength="4" data-f="icon" aria-label="Ikona"></span>
        <div class="phlab">
          <label><span class="sub">Emri i brendshëm</span>
            <input value="${esc(p.label_sq)}" maxlength="40" data-f="label_sq"></label>
          <label><span class="sub">Klienti sheh</span>
            <input value="${esc(p.customer_label_sq || '')}" maxlength="40" data-f="customer_label_sq"
                   placeholder="${esc(p.label_sq)}"></label>
        </div>
        <label class="phmin"><span class="sub">Minuta</span>
          <input value="${p.target_minutes == null ? '' : p.target_minutes}" inputmode="numeric"
                 data-f="target_minutes" placeholder="—"></label>
        <button class="sw${p.enabled ? ' on' : ''}" data-en="${esc(p.key)}" role="switch"
                aria-checked="${p.enabled}" aria-label="Faza është aktive"
                ${p.is_core ? 'disabled style="opacity:.4;cursor:not-allowed"' : ''}></button>
        <span class="lockmark" title="${p.is_core
          ? 'Kjo fazë nuk fiket dot — kuzhina dhe motorristi varen prej saj.'
          : 'Kjo fazë mund të fiket nëse nuk e përdor.'}">${p.is_core ? '🔒' : '&nbsp;'}</span>
      </div>`).join('');
    renderPreview();
  }

  function renderPreview() {
    const pub = phases
      .filter((p) => p.enabled && p.customer_visible && p.key !== 'cancelled')
      .sort((a, b) => a.sort - b.sort)
      .map((p) => ({
        key: p.key, icon: p.icon,
        label_sq: (p.customer_label_sq || '').trim() || p.label_sq,
      }));
    const steps = store.customerSteps(pub, 'sq');
    $('#phasePreview').innerHTML = steps
      .map((s) => `<span class="st">${esc(s.icon || '')} ${esc(s.label)}</span>`)
      .join('<span class="arw">→</span>');
  }

  function onPhaseInput(e) {
    const row = e.target.closest('[data-ph]');
    const f = e.target.dataset.f;
    if (!row || !f) return;
    const p = phases.find((x) => x.key === row.dataset.ph);
    if (!p) return;
    p[f] = f === 'target_minutes'
      ? (e.target.value.replace(/\D/g, '') ? Number(e.target.value.replace(/\D/g, '')) : null)
      : e.target.value;
    renderPreview();
  }

  async function savePhases() {
    try {
      phases = await store.savePhases(phases);
      renderPhases();
      toast('Fazat u ruajtën.', 'ok');
    } catch (e) { toast(e.message, 'err'); }
  }

  async function resetPhases() {
    try {
      phases = await store.resetPhases();
      renderPhases();
      toast('U kthyen te fillestaret.', 'ok');
    } catch (e) { toast(e.message, 'err'); }
  }

  /* ══════════════════ LIDHJET ══════════════════ */

  document.addEventListener('click', (e) => {
    const t = e.target;

    const tab = t.closest('.tab');
    if (tab) {
      if (tab.dataset.tab === 'staff') { loadStaff(); loadPerms(); }
      if (tab.dataset.tab === 'phase') loadPhases();
      return;
    }

    if (t.closest('[data-pin-close]')) return closePin();
    if (t.id === 'pinSave') return savePin();
    if (t.id === 'addStaff') return addStaff();
    if (t.id === 'savePerms') return savePerms();
    if (t.id === 'resetPerms') return resetPerms();
    if (t.id === 'savePhases') return savePhases();
    if (t.id === 'resetPhases') return resetPhases();

    const ed = t.closest('[data-edit]');
    if (ed) return editStaff(ed.dataset.edit);

    const pn = t.closest('[data-pin]');
    if (pn) return openPin(pn.dataset.pin);

    const del = t.closest('[data-del]');
    if (del) {
      const s = staff.find((x) => x.id === del.dataset.del);
      if (s && confirm('Të fshihet ' + s.name + '? Porositë e kryera nga ky person nuk humbin.')) {
        store.deleteStaff(s.id).then(() => loadStaff(true)).catch((err) => toast(err.message, 'err'));
      }
      return;
    }

    const tg = t.closest('[data-toggle]');
    if (tg) {
      const s = staff.find((x) => x.id === tg.dataset.toggle);
      if (s) {
        s.active = s.active === false;
        store.saveStaff({ id: s.id, name: s.name, role: s.role, phone: s.phone, active: s.active })
          .then(() => loadStaff(true)).catch((err) => toast(err.message, 'err'));
      }
      return;
    }

    const en = t.closest('[data-en]');
    if (en && !en.disabled) {
      const p = phases.find((x) => x.key === en.dataset.en);
      if (p) { p.enabled = !p.enabled; renderPhases(); }
    }
  });

  document.addEventListener('input', (e) => {
    if (e.target.closest('#phaseList')) onPhaseInput(e);
  });

  document.addEventListener('change', (e) => {
    const c = e.target.closest('[data-perm]');
    if (c) togglePerm(c.dataset.perm, c.dataset.screen, c.checked);
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && $('#pinWrap').classList.contains('on')) closePin();
    if (e.key === 'Enter' && $('#pinWrap').classList.contains('on')) savePin();
  });
})();
