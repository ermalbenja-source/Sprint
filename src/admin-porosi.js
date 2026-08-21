/* ============================================================================
   SPRINT — Porosi e re, e marrë me telefon.
   Ekrani është ndërtuar për shpejtësi: numri i pari, adresa vjen vetë nga
   libri, pjatët shtohen me shkronja dhe Enter. Sa më pak mi, aq më e shkurtër
   telefonata.
   ========================================================================== */
(function () {
  const S = window.SPRINT;
  const store = S.store;
  const $ = (s) => document.querySelector(s);
  const $$ = (s) => Array.from(document.querySelectorAll(s));
  const esc = (t) => String(t == null ? '' : t)
    .replace(/[&<>"']/g, (c) => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c]));

  const money = (n) => (Math.round(n) || 0).toLocaleString('sq-AL') + ' L';

  const O = {
    kind: 'delivery',
    lines: [],          // { id, name, price, qty }
    customer: null,
    lat: null, lng: null, accuracy: null,
    pick: 0,            // pjata e zgjedhur te lista e propozimeve
    sugg: [],
  };

  /* ══════════════════ KLIENTI ══════════════════ */

  let lookupT;
  function onPhone() {
    clearTimeout(lookupT);
    const raw = $('#nPhone').value;
    if (raw.replace(/\D/g, '').length < 6) {
      $('#nFound').textContent = '';
      $('#nFound').className = 'hint';
      $('#nAddrBook').innerHTML = '';
      O.customer = null;
      return;
    }
    lookupT = setTimeout(() => findCustomer(raw), 320);
  }

  async function findCustomer(phone) {
    let c = null;
    try { c = await store.lookupCustomer(phone); } catch (e) { /* pa bllokuar shkrimin */ }
    O.customer = c;

    const found = $('#nFound');
    if (!c) {
      found.textContent = 'Klient i ri — shkruaj emrin dhe adresën.';
      found.className = 'hint';
      $('#nAddrBook').innerHTML = '';
      return;
    }

    if (!$('#nName').value.trim()) $('#nName').value = c.name || '';

    if (c.blocked) {
      found.textContent = '⚠ Ky numër është i bllokuar.';
      found.className = 'hint warnc';
    } else {
      const n = c.orders_count || 0;
      found.textContent = n ? `${c.name || 'Klient i njohur'} — ${n} porosi më parë` : 'Klient i njohur';
      found.className = 'hint found';
    }
    renderAddrBook(c);
  }

  /* Adresat e ruajtura dhe porosia e fundit — të dyja me një prekje. */
  function renderAddrBook(c) {
    const parts = [];
    (c.addresses || []).slice(0, 4).forEach((a, i) => {
      parts.push(`<button type="button" data-addr="${i}">
        📍 ${esc(a.address)}${a.lat ? ' <span class="pin">pin ✓</span>' : ''}</button>`);
    });
    if (c.last_order && c.last_order.items && c.last_order.items.length) {
      const n = c.last_order.items.reduce((s, x) => s + (Number(x.qty) || 1), 0);
      parts.push(`<button type="button" class="again" data-again="1">
        ↻ Përsërit porosinë e fundit — ${n} artikuj, ${esc(money(c.last_order.total))}</button>`);
    }
    $('#nAddrBook').innerHTML = parts.join('');
  }

  function useAddress(i) {
    const a = (O.customer && O.customer.addresses || [])[i];
    if (!a) return;
    $('#nAddr').value = a.address;
    O.lat = a.lat || null; O.lng = a.lng || null; O.accuracy = a.accuracy || null;
    $('#nGeo').textContent = a.lat ? 'Pini i ruajtur u bashkangjit.' : '';
    $('#nGeo').className = a.lat ? 'hint found' : 'hint';
  }

  function repeatLast() {
    const lo = O.customer && O.customer.last_order;
    if (!lo || !lo.items) return;
    O.lines = lo.items.map((x) => ({
      id: x.id, name: x.name, price: Number(x.price) || 0, qty: Number(x.qty) || 1,
    }));
    renderLines();
    msg('Porosia e fundit u kopjua. Ndryshoje nëse duhet.', 'ok');
  }

  /* ══════════════════ PJATËT ══════════════════ */

  function search(q) {
    const s = q.trim().toLowerCase();
    if (s.length < 2) return [];
    return S.menu
      .filter((m) => (m.sq || m.name_sq || '').toLowerCase().includes(s)
                  || (m.en || m.name_en || '').toLowerCase().includes(s))
      .slice(0, 6);
  }

  const dishName = (m) => m.sq || m.name_sq || m.en || '';
  // Te shared/data.js çmimi quhet `p`; te rreshtat e Supabase-it quhet `price`.
  const dishPrice = (m) => Number(m.p != null ? m.p : m.price) || 0;

  function renderSugg() {
    if (!O.sugg.length) { $('#nSugg').innerHTML = ''; return; }
    $('#nSugg').innerHTML = O.sugg.map((m, i) =>
      `<button type="button" class="${i === O.pick ? 'pick' : ''}" data-add="${esc(m.id)}" role="option">
        <b>${esc(dishName(m))}</b><span>${esc(money(dishPrice(m)))}</span></button>`).join('');
  }

  function addDish(id) {
    const m = S.menu.find((x) => x.id === id);
    if (!m) return;
    const hit = O.lines.find((l) => l.id === id);
    if (hit) hit.qty++;
    else O.lines.push({ id: m.id, name: dishName(m), price: dishPrice(m), qty: 1 });
    $('#nSearch').value = '';
    O.sugg = []; O.pick = 0;
    renderSugg(); renderLines();
    $('#nSearch').focus();
  }

  function renderLines() {
    if (!O.lines.length) {
      $('#nLines').innerHTML = '<p class="nempty">Ende asnjë pjatë.</p>';
    } else {
      $('#nLines').innerHTML = O.lines.map((l, i) => `
        <div class="nline">
          <span class="qty">
            <button type="button" data-q="-1" data-i="${i}" aria-label="Një më pak">−</button>
            <b>${l.qty}</b>
            <button type="button" data-q="1" data-i="${i}" aria-label="Një më shumë">+</button>
          </span>
          <span class="ln">${esc(l.name)}</span>
          <span class="sum">${esc(money(l.price * l.qty))}</span>
          <button type="button" class="x" data-rm="${i}" aria-label="Hiqe">✕</button>
        </div>`).join('');
    }
    $('#nTotal').textContent = money(total());
  }

  const total = () => O.lines.reduce((s, l) => s + l.price * l.qty, 0);

  /* ══════════════════ REGJISTRIMI ══════════════════ */

  function msg(t, kind) {
    const el = $('#nMsg');
    el.textContent = t || '';
    el.className = 'msg' + (t ? ' on ' + (kind || 'err') : '');
  }

  async function send() {
    const name = $('#nName').value.trim();
    const phone = $('#nPhone').value.trim();
    const addr = $('#nAddr').value.trim();

    if (!O.lines.length) return msg('Shto të paktën një pjatë.');
    if (name.length < 2) return msg('Shkruaj emrin e klientit.');
    if (phone.replace(/\D/g, '').length < 6) return msg('Shkruaj numrin e telefonit.');
    if (O.kind === 'delivery' && addr.length < 3) return msg('Shkruaj adresën, ose kthe te «Marr vetë».');

    $('#nSend').disabled = true;
    msg('');
    try {
      let customerId = O.customer && O.customer.id;
      try {
        const cid = await store.upsertCustomer({
          phone, name, address: O.kind === 'delivery' ? addr : null,
          lat: O.lat, lng: O.lng, accuracy: O.accuracy,
        });
        if (cid) customerId = cid;
      } catch (e) { /* klienti nuk u ruajt dot, por porosia duhet të kalojë */ }

      const when = $('#nWhen').value;
      const row = await store.createOrder({
        kind: O.kind,
        name, phone,
        address: O.kind === 'delivery' ? addr : null,
        note: $('#nNote').value.trim() || null,
        items: O.lines.map((l) => ({ id: l.id, name: l.name, qty: l.qty, price: l.price })),
        subtotal: total(),
        total: total(),
        payment: $('#nPay').value,
        wantedAt: when === 'asap' ? 'asap' : when,
        channel: 'phone',
        customerId,
        lat: O.lat, lng: O.lng, accuracy: O.accuracy,
        prepMinutes: when === 'asap' ? null : Number(when),
      });

      document.dispatchEvent(new CustomEvent('sprint:order-created'));
      showOk(row, name, phone);
    } catch (e) {
      msg('Nuk u regjistrua: ' + e.message);
    } finally {
      $('#nSend').disabled = false;
    }
  }

  /* Konfirmimi mban kodin, që banaku t'ia diktojë klientit para se të mbyllë telefonin. */
  function showOk(row, name, phone) {
    const code = store.fmtCode(row.token);
    $('#nOkNo').textContent = 'Porosia nr. ' + row.number;
    $('#nOkCode').textContent = code;

    const txt = `Përshëndetje ${name}! Porosia jote te SPRINT u regjistrua.\n\n`
      + `🧾 Porosia nr. *${row.number}*\n🔖 Kodi i gjurmimit: *${code}*\n\n`
      + `Ndiqe këtu: ${location.origin}/?kodi=${store.normCode(row.token)}`;
    $('#nOkWa').href = 'https://wa.me/' + phone.replace(/\D/g, '').replace(/^0/, '355')
      + '?text=' + encodeURIComponent(txt);

    $('#nOk').classList.remove('hide');
    $('#nOk').scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    clear(true);
  }

  function clear(keepOk) {
    O.lines = []; O.customer = null; O.sugg = []; O.pick = 0;
    O.lat = O.lng = O.accuracy = null;
    ['#nPhone', '#nName', '#nAddr', '#nNote', '#nSearch'].forEach((s) => { $(s).value = ''; });
    $('#nFound').textContent = ''; $('#nFound').className = 'hint';
    $('#nGeo').textContent = '';
    $('#nAddrBook').innerHTML = '';
    $('#nWhen').value = 'asap';
    $('#nPay').value = 'cash';
    renderSugg(); renderLines(); msg('');
    if (!keepOk) $('#nOk').classList.add('hide');
  }

  function setKind(k) {
    O.kind = k;
    $$('[data-kind]').forEach((b) => b.classList.toggle('on', b.dataset.kind === k));
    $('#nAddrWrap').classList.toggle('hide', k === 'pickup');
  }

  /* ══════════════════ LIDHJET ══════════════════ */

  document.addEventListener('click', (e) => {
    const t = e.target;

    const tab = t.closest('.tab');
    if (tab && tab.dataset.tab === 'new') {
      renderLines();
      setTimeout(() => $('#nPhone').focus(), 60);
      return;
    }

    const k = t.closest('[data-kind]');
    if (k) return setKind(k.dataset.kind);

    const a = t.closest('[data-addr]');
    if (a) return useAddress(Number(a.dataset.addr));

    if (t.closest('[data-again]')) return repeatLast();

    const add = t.closest('[data-add]');
    if (add && add.closest('#nSugg')) return addDish(add.dataset.add);

    const q = t.closest('[data-q]');
    if (q) {
      const l = O.lines[Number(q.dataset.i)];
      if (l) {
        l.qty += Number(q.dataset.q);
        if (l.qty < 1) O.lines.splice(Number(q.dataset.i), 1);
        renderLines();
      }
      return;
    }

    const rm = t.closest('[data-rm]');
    if (rm) { O.lines.splice(Number(rm.dataset.rm), 1); renderLines(); return; }

    if (t.id === 'nSend') return send();
    if (t.id === 'nClear') return clear();
    if (t.id === 'nOkNew') { $('#nOk').classList.add('hide'); $('#nPhone').focus(); return; }
  });

  document.addEventListener('input', (e) => {
    if (e.target.id === 'nPhone') return onPhone();
    if (e.target.id === 'nSearch') {
      O.sugg = search(e.target.value);
      O.pick = 0;
      renderSugg();
    }
  });

  /* Tastiera mban duart te fusha: shigjetat zgjedhin, Enter shton. */
  document.addEventListener('keydown', (e) => {
    if (e.target.id !== 'nSearch' || !O.sugg.length) return;
    if (e.key === 'ArrowDown') { e.preventDefault(); O.pick = (O.pick + 1) % O.sugg.length; renderSugg(); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); O.pick = (O.pick - 1 + O.sugg.length) % O.sugg.length; renderSugg(); }
    else if (e.key === 'Enter') { e.preventDefault(); addDish(O.sugg[O.pick].id); }
    else if (e.key === 'Escape') { O.sugg = []; renderSugg(); }
  });
})();
