/* ============================================================================
   SPRINT — Dokumentet e brendshme.

   Fletë porosie për kuzhinën, fletë dorëzimi për motorristin, urdhërblerje për
   furnitorin. Asnjëra NUK është faturë tatimore: nuk kalojnë nga fiskalizimi
   dhe nuk mbajnë NIVF/NSLF. Prandaj çdo fletë del e shënuar hapur në fund —
   që të mos ngatërrohet kurrë me faturën që lëshon programi i certifikuar.

   Printimi bëhet nga vetë faqja: dokumenti ndërtohet te një kuti e fshehur dhe
   shfaqet vetëm gjatë printimit. Pa dritare të re, pa bllokues dritaresh.
   ========================================================================== */
(function () {
  const S = window.SPRINT;
  const st = S.store;
  const live = st.configured;

  const esc = (t) => String(t == null ? '' : t)
    .replace(/[&<>"']/g, (c) => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c]));
  const num = (v) => Number(v) || 0;
  const L = (n) => (Math.round(num(n) * 100) / 100).toLocaleString('sq-AL') + ' L';

  const KINDS = {
    order_slip:     'Fletë porosie',
    kitchen_ticket: 'Fletë kuzhine',
    delivery_note:  'Fletë dorëzimi',
    purchase_order: 'Urdhërblerje',
    stock_count:    'Fletë numërimi',
    internal_receipt: 'Vërtetim i brendshëm',
  };

  const LS_DOCS = 'sprint-documents';
  const mem = {};
  const readLS = (k, fb) => {
    try { const r = localStorage.getItem(k); if (r != null) return JSON.parse(r) || fb; } catch (e) {}
    return k in mem ? mem[k] : fb;
  };
  const writeLS = (k, v) => {
    mem[k] = v;
    try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {}
  };

  /** Regjistron dokumentin që të ketë numër dhe të gjendet më vonë. */
  async function record(kind, refType, refId, title, total) {
    if (!live) {
      const all = readLS(LS_DOCS, []);
      const row = { id: 'd' + Date.now().toString(36), number: all.length + 1,
                    kind, ref_type: refType, ref_id: refId, title, total,
                    created_at: new Date().toISOString() };
      all.push(row); writeLS(LS_DOCS, all);
      return row;
    }
    try {
      await st._ensureAuth();
      const rows = await st._req('/rest/v1/documents', {
        method: 'POST', headers: st._headers({ Prefer: 'return=representation' }),
        body: JSON.stringify({ kind, ref_type: refType, ref_id: refId, title,
                               total: total == null ? null : num(total) }) });
      return (Array.isArray(rows) ? rows[0] : rows) || null;
    } catch (e) {
      // Numri i dokumentit është i mirë për gjurmim, por nuk ia vlen të
      // ndalohet printimi për të: fleta duhet dalë edhe kur baza nuk përgjigjet.
      return null;
    }
  }

  /* ---------- pjesët e përbashkëta ---------- */

  const cfg = () => (S.config || {});

  const head = (title, sub) => `
    <div class="dk-hd">
      <div class="dk-brand">${esc(cfg().brand || 'SPRINT')}</div>
      <div class="dk-sub">${esc((cfg().tagline && cfg().tagline.sq) || '')}</div>
      <div class="dk-sub">${esc((cfg().address && cfg().address.sq) || '')}
        ${cfg().phone ? ' · ' + esc(cfg().phone) : ''}</div>
      <div class="dk-title">${esc(title)}</div>
      ${sub ? `<div class="dk-sub">${esc(sub)}</div>` : ''}
    </div>`;

  const foot = (docNo) => `
    <div class="dk-ft">
      <b>DOKUMENT I BRENDSHËM — NUK ËSHTË FATURË TATIMORE</b>
      <span>Fatura zyrtare lëshohet nga programi i certifikuar.</span>
      <span>${docNo ? 'Nr. ' + esc(docNo) + ' · ' : ''}${esc(stamp())}</span>
    </div>`;

  const stamp = () => {
    const d = new Date();
    const p = (n) => String(n).padStart(2, '0');
    return `${p(d.getDate())}.${p(d.getMonth() + 1)}.${d.getFullYear()} ${p(d.getHours())}:${p(d.getMinutes())}`;
  };

  const linesTable = (items, showPrice) => `
    <table class="dk-t">
      <tbody>
        ${(items || []).map((it) => `<tr>
          <td class="q">${esc(num(it.qty) || 1)}×</td>
          <td>${esc(it.name || it.id || '')}</td>
          ${showPrice ? `<td class="p">${esc(L(num(it.qty) * num(it.price)))}</td>` : ''}
        </tr>`).join('')}
      </tbody>
    </table>`;

  /* ---------- fletët ---------- */

  /** Fletë porosie: çfarë të gatuhet dhe ku shkon. Pa çmime nëse është
      për kuzhinën — atje çmimi vetëm zë vend dhe ngadalëson leximin. */
  function orderSlip(o, opt) {
    const only = (opt && opt.station) || null;
    const items = only
      ? (o.items || []).filter((x) => (x.station || 'kitchen') === only)
      : (o.items || []);
    const others = only
      ? (o.items || []).filter((x) => (x.station || 'kitchen') !== only && x.station !== 'none')
      : [];
    const STN = { kitchen: 'KUZHINA', oven: 'FURRA E PICËS' };
    const KIND = { pickup: 'MARR VETË', delivery: 'DËRGESË' };

    return `
      ${head(only ? STN[only] : 'Fletë porosie', null)}
      <div class="dk-big">#${esc(o.number || '')}</div>
      <div class="dk-row"><b>${esc(KIND[o.kind] || '')}</b>
        <span>${esc(stamp())}</span></div>
      ${o.wanted_at && o.wanted_at !== 'asap'
        ? `<div class="dk-row"><b>PËR ORËN ${esc(o.wanted_at)}</b></div>` : ''}
      <div class="dk-sep"></div>
      ${linesTable(items, !only)}
      ${o.note ? `<div class="dk-note">SHËNIM: ${esc(o.note)}</div>` : ''}
      ${others.length ? `<div class="dk-other">Bashkë me: ${others.map((x) =>
        `${num(x.qty) || 1}× ${esc(x.name || '')}`).join(' · ')}</div>` : ''}
      ${!only ? `<div class="dk-sep"></div>
        <div class="dk-row big"><b>GJITHSEJ</b><b>${esc(L(o.total))}</b></div>
        <div class="dk-row"><span>${o.payment === 'cash' ? 'Në dorë' : 'Me kartë'}</span></div>` : ''}
    `;
  }

  /** Fletë dorëzimi: adresa, telefoni dhe sa para priten. Kjo është fleta
      që motorristi mban në xhep — përmbajtja është ajo që i duhet në rrugë. */
  function deliveryNote(o) {
    return `
      ${head('Fletë dorëzimi', null)}
      <div class="dk-big">#${esc(o.number || '')}</div>
      <div class="dk-sep"></div>
      <div class="dk-kv"><span>Klienti</span><b>${esc(o.customer_name || '')}</b></div>
      <div class="dk-kv"><span>Telefoni</span><b>${esc(o.phone || '')}</b></div>
      <div class="dk-kv"><span>Adresa</span><b>${esc(o.address || '')}</b></div>
      ${o.lat && o.lng
        ? `<div class="dk-kv"><span>Pika në hartë</span><b>${esc(num(o.lat).toFixed(5))}, ${esc(num(o.lng).toFixed(5))}</b></div>`
        : ''}
      ${o.note ? `<div class="dk-note">SHËNIM: ${esc(o.note)}</div>` : ''}
      <div class="dk-sep"></div>
      ${linesTable(o.items, true)}
      <div class="dk-sep"></div>
      <div class="dk-row big"><b>${o.payment === 'cash' ? 'ARKËTO' : 'PAGUAR ME KARTË'}</b>
        <b>${esc(o.payment === 'cash' ? L(o.total) : '—')}</b></div>
      <div class="dk-sign">
        <div>Dorëzoi<br><span></span></div>
        <div>Mori<br><span></span></div>
      </div>`;
  }

  /** E gjithë nisja në një fletë: motorristi merr një letër, jo pesë. */
  function runSheet(stops, driverName) {
    const cash = (stops || []).filter((s) => s.payment === 'cash')
      .reduce((n, s) => n + num(s.total), 0);
    return `
      ${head('Fletë nisjeje', driverName ? 'Motorristi: ' + driverName : null)}
      <div class="dk-row"><b>${esc((stops || []).length)} ndalesa</b><span>${esc(stamp())}</span></div>
      <div class="dk-sep"></div>
      ${(stops || []).map((s, i) => `
        <div class="dk-stop">
          <div class="dk-row"><b>${i + 1}. #${esc(s.number || '')}</b>
            <b>${esc(s.payment === 'cash' ? L(s.total) : 'me kartë')}</b></div>
          <div>${esc(s.customer_name || '')} · ${esc(s.phone || '')}</div>
          <div class="dk-addr">${esc(s.address || '')}</div>
          ${s.note ? `<div class="dk-note">${esc(s.note)}</div>` : ''}
        </div>`).join('')}
      <div class="dk-sep"></div>
      <div class="dk-row big"><b>ARKA E PRITUR</b><b>${esc(L(cash))}</b></div>
      <div class="dk-sign">
        <div>Mori nisjen<br><span></span></div>
        <div>Dorëzoi arkën<br><span></span></div>
      </div>`;
  }

  /** Urdhërblerje: çfarë i kërkohet furnitorit. */
  function purchaseOrder(p, lines, supplier, items) {
    const name = (id) => {
      const it = (items || []).find((x) => x.id === id);
      return it ? it.name : '—';
    };
    const unit = (id) => {
      const it = (items || []).find((x) => x.id === id);
      return it ? it.unit : '';
    };
    const sum = (lines || []).reduce((n, l) => n + num(l.qty) * num(l.unit_cost), 0);
    return `
      ${head('Urdhërblerje', p.number ? 'Nr. ' + p.number : null)}
      <div class="dk-kv"><span>Furnitori</span><b>${esc(supplier ? supplier.name : '—')}</b></div>
      ${supplier && supplier.nipt ? `<div class="dk-kv"><span>NIPT</span><b>${esc(supplier.nipt)}</b></div>` : ''}
      <div class="dk-kv"><span>Data</span><b>${esc(p.date || '')}</b></div>
      ${p.doc_ref ? `<div class="dk-kv"><span>Fatura e furnitorit</span><b>${esc(p.doc_ref)}</b></div>` : ''}
      <div class="dk-sep"></div>
      <table class="dk-t">
        <tbody>
          ${(lines || []).map((l) => `<tr>
            <td class="q">${esc(num(l.qty))}${esc(unit(l.item_id))}</td>
            <td>${esc(name(l.item_id))}</td>
            <td class="p">${esc(L(num(l.qty) * num(l.unit_cost)))}</td>
          </tr>`).join('')}
        </tbody>
      </table>
      <div class="dk-sep"></div>
      <div class="dk-row big"><b>GJITHSEJ</b><b>${esc(L(sum))}</b></div>
      ${p.note ? `<div class="dk-note">${esc(p.note)}</div>` : ''}
      <div class="dk-sign">
        <div>Porositi<br><span></span></div>
        <div>Pranoi<br><span></span></div>
      </div>`;
  }

  /* ---------- printimi ---------- */

  /** Ndërton fletën, e shfaq vetëm gjatë printimit, pastaj e heq.
      `wide` = A4 për zyrën; pa të = 80mm, sa gjerësia e printerit termik. */
  function print(html, opt) {
    const box = document.getElementById('printBox');
    if (!box) return false;
    box.className = 'dk' + ((opt && opt.wide) ? ' dk-a4' : '');
    box.innerHTML = '<div class="dk-page">' + html
      + foot(opt && opt.docNo) + '</div>';
    // Printimi i dytë brenda së njëjtës faqe e gjen kutinë tashmë të mbushur;
    // pastrimi bëhet pas mbylljes së dritares së printimit, jo para saj.
    const done = () => { box.innerHTML = ''; window.removeEventListener('afterprint', done); };
    window.addEventListener('afterprint', done);
    window.print();
    return true;
  }

  /* ---------- pikat e përdorimit ---------- */

  async function printOrder(o, opt) {
    const d = await record('order_slip', 'order', o.id,
      'Fletë porosie #' + (o.number || ''), o.total);
    return print(orderSlip(o, opt), { docNo: d && d.number, wide: opt && opt.wide });
  }

  async function printStationTicket(o, station) {
    const d = await record('kitchen_ticket', 'order', o.id,
      'Fletë ' + (station === 'oven' ? 'furre' : 'kuzhine') + ' #' + (o.number || ''), null);
    return print(orderSlip(o, { station }), { docNo: d && d.number });
  }

  async function printDelivery(o) {
    const d = await record('delivery_note', 'order', o.id,
      'Fletë dorëzimi #' + (o.number || ''), o.total);
    return print(deliveryNote(o), { docNo: d && d.number });
  }

  async function printRun(stops, driverName) {
    const total = (stops || []).reduce((n, s) => n + num(s.total), 0);
    const d = await record('delivery_note', null, null,
      'Fletë nisjeje · ' + (driverName || ''), total);
    return print(runSheet(stops, driverName), { docNo: d && d.number });
  }

  async function printPurchase(p, lines, supplier, items) {
    const sum = (lines || []).reduce((n, l) => n + num(l.qty) * num(l.unit_cost), 0);
    const d = await record('purchase_order', 'purchase', p.id,
      'Urdhërblerje ' + (p.number ? '#' + p.number : ''), sum);
    return print(purchaseOrder(p, lines, supplier, items),
      { docNo: d && d.number, wide: true });
  }

  async function fetchDocuments(limit) {
    const n = limit || 50;
    if (!live) {
      return readLS(LS_DOCS, []).slice().reverse().slice(0, n);
    }
    await st._ensureAuth();
    return st._req('/rest/v1/documents?select=*&order=number.desc&limit=' + n,
      { headers: st._headers() });
  }

  S.docs = {
    KINDS, print, fetchDocuments,
    orderSlip, deliveryNote, runSheet, purchaseOrder,
    printOrder, printStationTicket, printDelivery, printRun, printPurchase,
  };
})();
