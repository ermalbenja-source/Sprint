/* ============================================================================
   SPRINT — Magazina, blerjet dhe raportet te paneli.

   Rregulli që mban gjithçka të ndershme: gjendja e magazinës nuk shkruhet
   kurrë si numër, llogaritet nga lëvizjet. Kështu çdo copë ka një pse, dhe
   numërimi nuk fshin historinë — shton një rresht të ri që e barazon.

   Të tria skedat ngarkohen vetëm kur hapen.
   ========================================================================== */
(function () {
  const S = window.SPRINT;
  const store = S.store;
  const $ = (s) => document.querySelector(s);
  const $$ = (s) => Array.from(document.querySelectorAll(s));
  const esc = (t) => String(t == null ? '' : t)
    .replace(/[&<>"']/g, (c) => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c]));

  const toast = (m, k) => {
    const el = $('#toast');
    if (!el) return;
    el.textContent = m; el.className = 'on ' + (k || '');
    clearTimeout(toast._t);
    toast._t = setTimeout(() => { el.className = k || ''; }, 3800);
  };

  const num = (v) => Number(v) || 0;
  const L = (n) => (Math.round(num(n) * 100) / 100).toLocaleString('sq-AL') + ' L';
  const qtyTxt = (n) => {
    const v = Math.round(num(n) * 1000) / 1000;
    return Number.isInteger(v) ? String(v) : v.toFixed(3).replace(/0+$/, '');
  };
  const today = () => new Date().toISOString().slice(0, 10);

  /* ══════════════════ MAGAZINA ══════════════════ */

  let stock = [];
  let suppliers = [];
  let stockLoaded = false;
  let stkQ = '';

  async function loadStock(force) {
    if (stockLoaded && !force) return;
    try {
      [stock, suppliers] = await Promise.all([store.fetchStock(), store.fetchSuppliers()]);
      stock = stock || []; suppliers = suppliers || [];
      stockLoaded = true;
      renderStock(); renderSuppliers(); await loadRecipeDishes();
    } catch (e) {
      $('#stockList').innerHTML = '<p class="count">Nuk u lexua magazina: ' + esc(e.message) + '</p>';
    }
  }

  function renderStock() {
    const q = stkQ.trim().toLowerCase();
    const onlyLow = $('#stkLow').checked;
    const list = stock.filter((i) =>
      (!q || String(i.name).toLowerCase().indexOf(q) >= 0
          || String(i.sku || '').toLowerCase().indexOf(q) >= 0)
      && (!onlyLow || i.low));

    const lowN = stock.filter((i) => i.low).length;
    const value = stock.reduce((n, i) => n + num(i.value), 0);
    $('#stkSum').textContent = stock.length
      ? `${stock.length} artikuj · vlera ${L(value)}` + (lowN ? ` · ${lowN} po mbarojnë` : '')
      : '';

    if (!list.length) {
      $('#stockList').innerHTML = '<p class="count">'
        + (stock.length ? 'Asnjë artikull me këtë kërkim.'
                        : 'Ende pa artikuj. Shto të parin — miell, djathë, kuti pice.')
        + '</p>';
      return;
    }

    $('#stockList').innerHTML = list.map((i) => `
      <div class="row strow${i.low ? ' low' : ''}" data-stk="${esc(i.id)}">
        <div class="nm">
          <b>${esc(i.name)}</b>
          <span>${esc(i.sku || '')}${i.sku && i.category ? ' · ' : ''}${esc(i.category || '')}
            · kosto ${esc(L(i.cost))}/${esc(i.unit)}</span>
        </div>
        <div class="qty${i.low ? ' low' : ''}">${esc(qtyTxt(i.qty))}<small>${esc(i.unit)}</small></div>
        <div class="qty"><small>vlera</small> ${esc(L(i.value))}</div>
        <div class="mvbtns">
          <button class="btn btn-g btn-sm" data-mv="in"    data-i="${esc(i.id)}">+ Hyrje</button>
          <button class="btn btn-g btn-sm" data-mv="out"   data-i="${esc(i.id)}">− Dalje</button>
          <button class="btn btn-g btn-sm" data-mv="waste" data-i="${esc(i.id)}">Prishje</button>
          <button class="btn btn-g btn-sm" data-mv="count" data-i="${esc(i.id)}">Numërim</button>
          <button class="btn btn-g btn-sm" data-stkedit="${esc(i.id)}">Ndrysho</button>
        </div>
      </div>`).join('');
  }

  /* Ndryshimi bëhet aty ku është rreshti — pa sirtar, pa faqe të dytë. */
  function editStock(id) {
    const i = stock.find((x) => x.id === id) || { unit: 'copë', min_qty: 0, cost: 0 };
    const row = id ? $(`[data-stk="${CSS.escape(id)}"]`) : null;
    const html = `
      <div class="f" style="grid-column:span 1"><label>Emri</label>
        <input id="skName" value="${esc(i.name || '')}" maxlength="120"></div>
      <div class="f"><label>Kodi</label><input id="skSku" value="${esc(i.sku || '')}" maxlength="30"></div>
      <div class="f"><label>Njësia</label><input id="skUnit" value="${esc(i.unit || 'copë')}" maxlength="12"></div>
      <div class="f"><label>Kufiri i ulët</label>
        <input id="skMin" type="number" step="0.001" value="${esc(i.min_qty || 0)}"></div>
      <div class="f"><label>Kosto për njësi</label>
        <input id="skCost" type="number" step="0.01" value="${esc(i.cost || 0)}"></div>
      <span style="display:flex;gap:.35rem;align-items:end">
        <button class="btn btn-p btn-sm" id="skSave">Ruaj</button>
        <button class="btn btn-g btn-sm" id="skCancel">Anulo</button>
        ${id ? `<button class="btn btn-d btn-sm" id="skDel">Fshi</button>` : ''}
      </span>`;

    if (row) {
      row.innerHTML = html;
      row.style.gridTemplateColumns = 'repeat(auto-fit,minmax(110px,1fr))';
    } else {
      const box = document.createElement('div');
      box.className = 'row strow';
      box.style.gridTemplateColumns = 'repeat(auto-fit,minmax(110px,1fr))';
      box.innerHTML = html;
      $('#stockList').prepend(box);
    }
    $('#skName').focus();

    $('#skCancel').onclick = () => renderStock();
    if ($('#skDel')) {
      $('#skDel').onclick = async () => {
        if (!confirm('Të fshihet «' + i.name + '»? Bashkë me të humbin edhe lëvizjet e tij.')) return;
        try { await store.deleteStockItem(id); await loadStock(true); toast('U fshi.', 'ok'); }
        catch (e) { toast(e.message, 'err'); }
      };
    }
    $('#skSave').onclick = async () => {
      try {
        await store.saveStockItem({
          id, name: $('#skName').value, sku: $('#skSku').value,
          unit: $('#skUnit').value, min_qty: $('#skMin').value, cost: $('#skCost').value,
        });
        await loadStock(true);
        toast('U ruajt.', 'ok');
      } catch (e) { toast(e.message, 'err'); }
    };
  }

  /* Lëvizja: një kuti e vetme, sepse kjo bëhet me duar të zëna. */
  async function move(id, kind) {
    const i = stock.find((x) => x.id === id);
    if (!i) return;
    const K = store.MOVE_KINDS;
    const ask = kind === 'count'
      ? `Sa ${i.unit} ${i.name} gjete vërtet në raft?\n(tani ekrani thotë ${qtyTxt(i.qty)})`
      : `${K[kind]} — sa ${i.unit} ${i.name}?`;
    const v = prompt(ask, kind === 'count' ? qtyTxt(i.qty) : '');
    if (v == null || v === '') return;
    if (!isFinite(Number(v))) { toast('Shkruaj një numër.', 'err'); return; }
    const note = kind === 'waste' ? (prompt('Pse u prish? (jo e detyrueshme)', '') || null) : null;
    try {
      const left = await store.stockAdjust(id, Number(v), kind, note);
      await loadStock(true);
      toast(`${K[kind]} u shënua. Mbeti ${qtyTxt(left)} ${i.unit}.`, 'ok');
    } catch (e) { toast(e.message, 'err'); }
  }

  /* ---------- furnitorët ---------- */
  function renderSuppliers() {
    if (!suppliers.length) {
      $('#supList').innerHTML = '<p class="count">Ende pa furnitorë.</p>';
      return;
    }
    $('#supList').innerHTML = suppliers.map((f) => `
      <div class="row strow" data-sup="${esc(f.id)}" style="grid-template-columns:minmax(0,1fr) auto">
        <div class="nm"><b>${esc(f.name)}</b>
          <span>${esc(f.nipt || '')}${f.nipt && f.phone ? ' · ' : ''}${esc(f.phone || '')}</span></div>
        <div class="mvbtns">
          <button class="btn btn-g btn-sm" data-supedit="${esc(f.id)}">Ndrysho</button>
          <button class="btn btn-d btn-sm" data-supdel="${esc(f.id)}">Fshi</button>
        </div>
      </div>`).join('');
  }

  function editSupplier(id) {
    const f = suppliers.find((x) => x.id === id) || {};
    const row = id ? $(`[data-sup="${CSS.escape(id)}"]`) : null;
    const html = `
      <div class="f"><label>Emri</label><input id="fnName" value="${esc(f.name || '')}" maxlength="120"></div>
      <div class="f"><label>NIPT</label><input id="fnNipt" value="${esc(f.nipt || '')}" maxlength="20"></div>
      <div class="f"><label>Telefoni</label><input id="fnPhone" value="${esc(f.phone || '')}" maxlength="30"></div>
      <span style="display:flex;gap:.35rem;align-items:end">
        <button class="btn btn-p btn-sm" id="fnSave">Ruaj</button>
        <button class="btn btn-g btn-sm" id="fnCancel">Anulo</button>
      </span>`;
    if (row) {
      row.innerHTML = html;
      row.style.gridTemplateColumns = 'repeat(auto-fit,minmax(130px,1fr))';
    } else {
      const box = document.createElement('div');
      box.className = 'row strow';
      box.style.gridTemplateColumns = 'repeat(auto-fit,minmax(130px,1fr))';
      box.innerHTML = html;
      $('#supList').prepend(box);
    }
    $('#fnName').focus();
    $('#fnCancel').onclick = () => renderSuppliers();
    $('#fnSave').onclick = async () => {
      try {
        await store.saveSupplier({ id, name: $('#fnName').value,
          nipt: $('#fnNipt').value, phone: $('#fnPhone').value });
        await loadStock(true);
        toast('U ruajt.', 'ok');
      } catch (e) { toast(e.message, 'err'); }
    };
  }

  /* ---------- recetat ---------- */
  let recRows = [];
  let dishes = [];

  async function loadRecipeDishes() {
    const all = await store.fetchAll().catch(() => null);
    const menu = (all && all.menu && all.menu.length) ? all.menu : (S.menu || []);
    dishes = menu.map((m) => ({ id: m.id, name: m.name_sq || m.sq || m.id }));
    const sel = $('#recDish');
    const keep = sel.value;
    sel.innerHTML = '<option value="">— zgjidh pjatën —</option>'
      + dishes.map((d) => `<option value="${esc(d.id)}">${esc(d.name)}</option>`).join('');
    if (keep && dishes.some((d) => d.id === keep)) sel.value = keep;
    await loadRecipe();
  }

  async function loadRecipe() {
    const id = $('#recDish').value;
    if (!id) {
      recRows = [];
      $('#recList').innerHTML = '<p class="count">Zgjidh një pjatë për të parë recetën e saj.</p>';
      $('#recCount').textContent = '';
      return;
    }
    try {
      recRows = (await store.fetchRecipes(id)) || [];
      renderRecipe();
    } catch (e) {
      $('#recList').innerHTML = '<p class="count">Nuk u lexua receta: ' + esc(e.message) + '</p>';
    }
  }

  function renderRecipe() {
    if (!recRows.length) {
      $('#recList').innerHTML = '<p class="count">Kjo pjatë ende nuk ka recetë — '
        + 'shitja e saj nuk zbret gjë nga magazina.</p>';
    } else {
      $('#recList').innerHTML = recRows.map((r, i) => {
        const it = stock.find((x) => x.id === r.stock_item_id);
        return `<div class="row linerow" data-rec="${i}">
          <select data-rf="stock_item_id">
            <option value="">— përbërësi —</option>
            ${stock.map((x) => `<option value="${esc(x.id)}"${x.id === r.stock_item_id ? ' selected' : ''}
              >${esc(x.name)}</option>`).join('')}
          </select>
          <input type="number" step="0.0001" data-rf="qty" value="${esc(r.qty)}">
          <span class="lt">${esc(it ? it.unit : '')}</span>
          <span class="lt">${esc(it ? L(num(r.qty) * num(it.cost)) : '')}</span>
          <button class="btn btn-d btn-sm" data-recdel="${i}">×</button>
        </div>`;
      }).join('');
    }
    const cost = recRows.reduce((n, r) => {
      const it = stock.find((x) => x.id === r.stock_item_id);
      return n + (it ? num(r.qty) * num(it.cost) : 0);
    }, 0);
    $('#recCount').textContent = recRows.length
      ? `${recRows.length} përbërës · kosto lënde e parë ${L(cost)}` : '';
  }

  /* ══════════════════ BLERJET ══════════════════ */

  let purchases = [];
  let buyLoaded = false;
  let buy = null;            // koka e blerjes që po redaktohet
  let buyLines = [];

  async function loadBuy(force) {
    await loadStock();
    if (buyLoaded && !force) return;
    try {
      purchases = (await store.fetchPurchases()) || [];
      buyLoaded = true;
      renderBuyList();
    } catch (e) {
      $('#buyList').innerHTML = '<p class="count">Nuk u lexuan blerjet: ' + esc(e.message) + '</p>';
    }
  }

  const ST_LABEL = { draft: 'Skicë', received: 'Pranuar', cancelled: 'Anuluar' };

  function renderBuyList() {
    const open = purchases.filter((p) => p.status === 'draft').length;
    const monthSum = purchases
      .filter((p) => p.status === 'received' && String(p.date || '').slice(0, 7) === today().slice(0, 7))
      .reduce((n, p) => n + num(p.total), 0);
    $('#buySum').textContent = purchases.length
      ? `${purchases.length} blerje · ${open} skica · këtë muaj ${L(monthSum)}` : '';

    if (!purchases.length) {
      $('#buyList').innerHTML = '<p class="count">Ende pa blerje. Kur të vijë malli, shkruaje këtu — '
        + 'gjendja e magazinës rritet vetvetiu.</p>';
      return;
    }
    $('#buyList').innerHTML = purchases.map((p) => {
      const f = suppliers.find((x) => x.id === p.supplier_id);
      return `<div class="row strow" style="grid-template-columns:auto minmax(0,1fr) auto auto">
        <span class="st-badge st-${esc(p.status)}">${esc(ST_LABEL[p.status] || p.status)}</span>
        <div class="nm"><b>#${esc(p.number || '')} · ${esc(f ? f.name : 'pa furnitor')}</b>
          <span>${esc(p.date || '')}${p.doc_ref ? ' · fatura ' + esc(p.doc_ref) : ''}</span></div>
        <div class="qty">${esc(L(p.total))}</div>
        <div class="mvbtns">
          <button class="btn btn-g btn-sm" data-buyopen="${esc(p.id)}">
            ${p.status === 'draft' ? 'Hap' : 'Shiko'}</button>
          ${p.status === 'draft'
            ? `<button class="btn btn-d btn-sm" data-buydel="${esc(p.id)}">Fshi</button>` : ''}
        </div>
      </div>`;
    }).join('');
  }

  function fillSupSelect() {
    $('#buySup').innerHTML = '<option value="">— pa furnitor —</option>'
      + suppliers.map((f) => `<option value="${esc(f.id)}"${f.id === (buy && buy.supplier_id) ? ' selected' : ''}
        >${esc(f.name)}</option>`).join('');
  }

  async function openBuy(id) {
    if (id) {
      buy = purchases.find((p) => p.id === id);
      buyLines = ((await store.fetchPurchaseLines(id)) || [])
        .map((l) => ({ item_id: l.item_id, qty: l.qty, unit_cost: l.unit_cost }));
    } else {
      buy = { status: 'draft', date: today() };
      buyLines = [{ item_id: '', qty: 1, unit_cost: 0 }];
    }
    $('#buyTitle').textContent = buy.number ? 'Blerja #' + buy.number : 'Blerje e re';
    fillSupSelect();
    $('#buyDate').value = buy.date || today();
    $('#buyRef').value = buy.doc_ref || '';
    $('#buyNote').value = buy.note || '';
    const done = buy.status !== 'draft';
    $('#saveBuy').classList.toggle('hide', done);
    $('#recvBuy').classList.toggle('hide', done);
    $('#addBuyLine').classList.toggle('hide', done);
    $('#buyEditor').classList.remove('hide');
    renderBuyLines();
    $('#buyEditor').scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  function renderBuyLines() {
    const done = buy && buy.status !== 'draft';
    $('#buyLines').innerHTML = buyLines.map((l, i) => `
      <div class="row linerow" data-line="${i}">
        <select data-lf="item_id" ${done ? 'disabled' : ''}>
          <option value="">— artikulli —</option>
          ${stock.map((x) => `<option value="${esc(x.id)}"${x.id === l.item_id ? ' selected' : ''}
            >${esc(x.name)}${x.unit ? ' (' + esc(x.unit) + ')' : ''}</option>`).join('')}
        </select>
        <input type="number" step="0.001" data-lf="qty" value="${esc(l.qty)}" ${done ? 'disabled' : ''}>
        <input type="number" step="0.01" data-lf="unit_cost" value="${esc(l.unit_cost)}" ${done ? 'disabled' : ''}>
        <span class="lt">${esc(L(num(l.qty) * num(l.unit_cost)))}</span>
        ${done ? '<span></span>' : `<button class="btn btn-d btn-sm" data-linedel="${i}">×</button>`}
      </div>`).join('');
    const sum = buyLines.reduce((n, l) => n + num(l.qty) * num(l.unit_cost), 0);
    $('#buyTotal').textContent = 'Gjithsej ' + L(sum);
  }

  async function saveBuy(andReceive) {
    const head = {
      id: buy.id, supplier_id: $('#buySup').value || null,
      date: $('#buyDate').value || today(),
      doc_ref: $('#buyRef').value.trim() || null,
      note: $('#buyNote').value.trim() || null,
      status: 'draft',
    };
    const good = buyLines.filter((l) => l.item_id && num(l.qty) > 0);
    if (!good.length) { toast('Shto të paktën një rresht me artikull dhe sasi.', 'err'); return; }
    try {
      const row = await store.savePurchase(head, good);
      buy = Object.assign({}, buy, row);
      if (andReceive) {
        const n = await store.receivePurchase(row.id);
        toast(`Blerja u pranua — ${n} artikuj hynë në magazinë.`, 'ok');
      } else {
        toast('Skica u ruajt.', 'ok');
      }
      buyLoaded = false;
      await loadBuy(true);
      await loadStock(true);
      if (andReceive) { $('#buyEditor').classList.add('hide'); buy = null; }
      else openBuy(row.id);
    } catch (e) { toast(e.message, 'err'); }
  }

  /* ══════════════════ RAPORTET ══════════════════ */

  let repLoaded = false;

  async function loadRep(force) {
    if (repLoaded && !force) return;
    if (!$('#repDate').value) $('#repDate').value = today();
    repLoaded = true;
    await Promise.all([drawDay(), drawWeek(), drawDrivers(), drawItems()]);
  }

  async function drawDay() {
    const d = $('#repDate').value || today();
    let r;
    try { r = await store.reportDay(d); }
    catch (e) { $('#repKpi').innerHTML = '<p class="count">' + esc(e.message) + '</p>'; return; }
    r = r || {};
    const kpi = (label, value, cls) =>
      `<div class="kpi ${cls || ''}"><b>${esc(value)}</b><span>${esc(label)}</span></div>`;
    const mins = (v) => (v == null ? '—' : v + ' min');
    $('#repKpi').innerHTML =
        kpi('Porosi', r.orders_count || 0)
      + kpi('Xhiro', L(r.revenue), 'good')
      + kpi('Në dorë', L(r.cash))
      + kpi('Me kartë', L(r.card))
      + kpi('Mesatarja e porosisë', L(r.guests_avg))
      + kpi('Dërgesa', r.delivery_count || 0)
      + kpi('Marrin vetë', r.pickup_count || 0)
      + kpi('Nga faqja', r.web_count || 0)
      + kpi('Me telefon', r.phone_count || 0)
      + kpi('Gati për', mins(r.avg_prep_minutes))
      + kpi('Në rrugë', mins(r.avg_delivery_minutes))
      + kpi('Anuluar', r.cancelled_count || 0, r.cancelled_count ? 'warn' : '');
  }

  async function drawWeek() {
    const to = $('#repDate').value || today();
    const from = new Date(new Date(to).getTime() - 6 * 864e5).toISOString().slice(0, 10);
    let rows = [];
    try { rows = (await store.reportRange(from, to)) || []; } catch (e) { /* pa të dhëna */ }
    const byDay = {};
    rows.forEach((r) => { byDay[String(r.day).slice(0, 10)] = r; });

    const days = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(new Date(to).getTime() - i * 864e5).toISOString().slice(0, 10);
      days.push(Object.assign({ day: d, orders_count: 0, revenue: 0 }, byDay[d]));
    }
    const max = Math.max(1, ...days.map((d) => num(d.revenue)));
    const NAME = ['Die', 'Hën', 'Mar', 'Mër', 'Enj', 'Pre', 'Sht'];
    $('#repChart').innerHTML = days.map((d) => {
      const h = Math.round((num(d.revenue) / max) * 120);
      return `<div class="bar" title="${esc(d.day)} · ${esc(L(d.revenue))}">
        <u>${num(d.revenue) ? esc(Math.round(num(d.revenue) / 1000) + 'k') : ''}</u>
        <i style="height:${h}px"></i>
        <em>${esc(NAME[new Date(d.day).getDay()])}</em></div>`;
    }).join('');
  }

  async function drawDrivers() {
    const d = $('#repDate').value || today();
    let rows = [];
    try { rows = (await store.driverDay(d)) || []; } catch (e) { /* pa të dhëna */ }
    if (!rows.length) {
      $('#repDrivers').innerHTML =
        '<tbody><tr><td class="count">Asnjë dorëzim i shënuar për këtë ditë.</td></tr></tbody>';
      return;
    }
    $('#repDrivers').innerHTML =
      '<thead><tr><th style="text-align:left">Motorristi</th><th>Dorëzime</th>'
      + '<th>Në dorë</th><th>Me kartë</th></tr></thead><tbody>'
      + rows.map((r) => `<tr><th style="text-align:left">${esc(r.driver_name)}</th>
          <td>${esc(r.deliveries)}</td><td>${esc(L(r.cash))}</td>
          <td>${esc(L(r.card))}</td></tr>`).join('')
      + '</tbody>';
  }

  async function drawItems() {
    const to = $('#repDate').value || today();
    const days = Number((document.querySelector('[name=repRange]:checked') || {}).value || 1);
    const from = new Date(new Date(to).getTime() - (days - 1) * 864e5).toISOString().slice(0, 10);
    let rows = [];
    try { rows = (await store.reportItems(from, to)) || []; } catch (e) { /* pa të dhëna */ }
    if (!rows.length) {
      $('#repItems').innerHTML =
        '<tbody><tr><td class="count">Asnjë shitje në këtë periudhë.</td></tr></tbody>';
      return;
    }
    const SN = { kitchen: '🍳', oven: '🔥', none: '🥤' };
    $('#repItems').innerHTML =
      '<thead><tr><th style="text-align:left">Pjata</th><th>Ku</th><th>Sasia</th><th>Xhiro</th></tr></thead><tbody>'
      + rows.slice(0, 25).map((r) => `<tr>
          <th style="text-align:left">${esc(r.name)}</th>
          <td>${esc(SN[r.station] || '')}</td>
          <td>${esc(qtyTxt(r.qty))}</td>
          <td>${esc(L(r.revenue))}</td></tr>`).join('')
      + '</tbody>';
  }

  /* ══════════════════ LIDHJET ══════════════════ */

  document.addEventListener('click', async (e) => {
    const t = e.target;

    const tab = t.closest('.tab');
    if (tab) {
      if (tab.dataset.tab === 'stock') loadStock();
      if (tab.dataset.tab === 'buy') loadBuy();
      if (tab.dataset.tab === 'rep') loadRep();
      return;
    }

    /* magazina */
    if (t.id === 'addStock') return editStock(null);
    const se = t.closest('[data-stkedit]');
    if (se) return editStock(se.dataset.stkedit);
    const mv = t.closest('[data-mv]');
    if (mv) return move(mv.dataset.i, mv.dataset.mv);

    /* furnitorët */
    if (t.id === 'addSup') return editSupplier(null);
    const fe = t.closest('[data-supedit]');
    if (fe) return editSupplier(fe.dataset.supedit);
    const fd = t.closest('[data-supdel]');
    if (fd) {
      const f = suppliers.find((x) => x.id === fd.dataset.supdel);
      if (f && confirm('Të fshihet furnitori «' + f.name + '»? Blerjet e vjetra nuk humbin.')) {
        try { await store.deleteSupplier(f.id); await loadStock(true); toast('U fshi.', 'ok'); }
        catch (err) { toast(err.message, 'err'); }
      }
      return;
    }

    /* recetat */
    if (t.id === 'addRec') { recRows.push({ stock_item_id: '', qty: 1 }); renderRecipe(); return; }
    const rd = t.closest('[data-recdel]');
    if (rd) { recRows.splice(Number(rd.dataset.recdel), 1); renderRecipe(); return; }
    if (t.id === 'saveRec') {
      const id = $('#recDish').value;
      if (!id) { toast('Zgjidh një pjatë së pari.', 'err'); return; }
      try { await store.saveRecipe(id, recRows); toast('Receta u ruajt.', 'ok'); }
      catch (err) { toast(err.message, 'err'); }
      return;
    }

    /* blerjet */
    if (t.id === 'newBuy') return openBuy(null);
    if (t.id === 'closeBuy') { $('#buyEditor').classList.add('hide'); buy = null; return; }
    if (t.id === 'addBuyLine') { buyLines.push({ item_id: '', qty: 1, unit_cost: 0 }); renderBuyLines(); return; }
    const ld = t.closest('[data-linedel]');
    if (ld) { buyLines.splice(Number(ld.dataset.linedel), 1); renderBuyLines(); return; }
    const bo = t.closest('[data-buyopen]');
    if (bo) return openBuy(bo.dataset.buyopen);
    const bd = t.closest('[data-buydel]');
    if (bd) {
      if (confirm('Të fshihet kjo skicë blerjeje?')) {
        try { await store.deletePurchase(bd.dataset.buydel); buyLoaded = false; await loadBuy(true); }
        catch (err) { toast(err.message, 'err'); }
      }
      return;
    }
    if (t.id === 'saveBuy') return saveBuy(false);
    if (t.id === 'recvBuy') {
      if (confirm('Pranimi e fut mallin në magazinë dhe nuk kthehet mbrapsht. Të vazhdohet?')) {
        return saveBuy(true);
      }
      return;
    }

    /* raportet */
    if (t.id === 'repToday') { $('#repDate').value = today(); return loadRep(true); }
    if (t.id === 'repYest') {
      $('#repDate').value = new Date(Date.now() - 864e5).toISOString().slice(0, 10);
      return loadRep(true);
    }
  });

  document.addEventListener('input', (e) => {
    const t = e.target;
    if (t.id === 'stkSearch') { stkQ = t.value; renderStock(); return; }

    const line = t.closest('[data-line]');
    if (line && t.dataset.lf) {
      buyLines[Number(line.dataset.line)][t.dataset.lf] = t.value;
      renderBuyLines();
      return;
    }
    const rec = t.closest('[data-rec]');
    if (rec && t.dataset.rf) {
      recRows[Number(rec.dataset.rec)][t.dataset.rf] = t.value;
      renderRecipe();
    }
  });

  document.addEventListener('change', (e) => {
    const t = e.target;
    if (t.id === 'stkLow') renderStock();
    if (t.id === 'recDish') loadRecipe();
    if (t.id === 'repDate') loadRep(true);
    if (t.name === 'repRange') drawItems();

    const line = t.closest('[data-line]');
    if (line && t.dataset.lf) {
      buyLines[Number(line.dataset.line)][t.dataset.lf] = t.value;
      renderBuyLines();
    }
    const rec = t.closest('[data-rec]');
    if (rec && t.dataset.rf) {
      recRows[Number(rec.dataset.rec)][t.dataset.rf] = t.value;
      renderRecipe();
    }
  });
})();
