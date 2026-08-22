/* ============================================================================
   SPRINT — Shtresa e programit të biznesit.
   Fazat, klientët dhe stafi. Ndërtohet mbi shared/store.js.

   Si te pjesa tjetër e programit: pa Supabase, gjithçka punon lokalisht në
   shfletues, që paneli të jetë i provueshëm pa llogari.
   ========================================================================== */
(function () {
  const S = window.SPRINT;
  const st = S.store;
  const live = st.configured;

  const LS_PHASES    = 'sprint-phases';
  const LS_CUSTOMERS = 'sprint-customers';
  const LS_STAFF     = 'sprint-staff';
  const LS_DEVICE    = 'sprint-device';

  /* Si te shared/store.js: kur ruajtja e shfletuesit është e mbyllur, gjithçka
     rri në kujtesë. Sesioni i hyrjes kalon këndej, ndaj pa këtë rezervë kodi
     pranohej dhe sesioni humbte në të njëjtin çast. */
  const mem = {};
  const readLS = (k, fb) => {
    try {
      const raw = localStorage.getItem(k);
      if (raw != null) return JSON.parse(raw) || fb;
    } catch (e) {}
    return k in mem ? mem[k] : fb;
  };
  const writeLS = (k, v) => {
    mem[k] = v;
    try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {}
  };

  // Identifikues i vetëm për modalitetin lokal. Date.now() nuk mjafton: dy rreshta
  // të krijuar brenda të njëjtit milisekond do të merrnin të njëjtin id.
  const uid = (p) => p + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);

  /* ══════════════════ FAZAT ══════════════════
     Çelësat janë saktësisht vlerat e `orders.status`, që të mos ketë përkthim
     midis dy fjalorëve. Të fiksuar sepse kuzhina, motorristi dhe faqja e
     klientit varen prej tyre; gjithçka tjetër është e jotja. Këto vlera
     pasqyrojnë saktësisht ato që mbjell supabase/schema-2-biznes.sql. */

  const DEFAULT_PHASES = [
    { key:'new',       sort:10, label_sq:'E marrë',  label_en:'Placed',     customer_label_sq:'E marrë',        customer_label_en:'Received',    icon:'📥', color:'#8a8a8a', enabled:true, customer_visible:true, target_minutes:null, is_core:true  },
    { key:'accepted',  sort:20, label_sq:'Pranuar',  label_en:'Accepted',   customer_label_sq:'Po përgatitet',  customer_label_en:'In progress', icon:'✓',  color:'#c4640b', enabled:true, customer_visible:true, target_minutes:3,    is_core:false },
    { key:'preparing', sort:30, label_sq:'Në furrë', label_en:'In kitchen', customer_label_sq:'Po përgatitet',  customer_label_en:'In progress', icon:'🔥', color:'#c4640b', enabled:true, customer_visible:true, target_minutes:20,   is_core:true  },
    { key:'ready',     sort:40, label_sq:'Gati',     label_en:'Ready',      customer_label_sq:'Nisi për te ti', customer_label_en:'On its way',  icon:'🛎',  color:'#3b6446', enabled:true, customer_visible:true, target_minutes:5,    is_core:false },
    { key:'delivering',sort:50, label_sq:'Në rrugë', label_en:'On the way', customer_label_sq:'Nisi për te ti', customer_label_en:'On its way',  icon:'🛵', color:'#3b6446', enabled:true, customer_visible:true, target_minutes:25,   is_core:true  },
    { key:'done',      sort:60, label_sq:'Dorëzuar', label_en:'Delivered',  customer_label_sq:'Dorëzuar',       customer_label_en:'Delivered',   icon:'🏁', color:'#3b6446', enabled:true, customer_visible:true, target_minutes:null, is_core:true  },
    { key:'cancelled', sort:70, label_sq:'Anuluar',  label_en:'Cancelled',  customer_label_sq:'Anuluar',        customer_label_en:'Cancelled',   icon:'✕',  color:'#a22f1b', enabled:true, customer_visible:true, target_minutes:null, is_core:true  },
  ];

  const clonePhases = () => DEFAULT_PHASES.map((p) => Object.assign({}, p));

  /** Të gjitha fazat, për panelin. */
  async function fetchPhases() {
    if (!live) return readLS(LS_PHASES, clonePhases());
    const rows = await st._req('/rest/v1/order_phases?select=*&order=sort', { headers: st._headers() });
    return (rows && rows.length) ? rows : clonePhases();
  }

  /** Ruan fazat e ndryshuara. Çelësi dhe is_core nuk preken kurrë. */
  async function savePhases(list) {
    const clean = list.map((p) => ({
      key: p.key,
      sort: Number(p.sort) || 0,
      label_sq: String(p.label_sq || '').trim().slice(0, 40),
      label_en: String(p.label_en || '').trim().slice(0, 40),
      customer_label_sq: String(p.customer_label_sq || '').trim().slice(0, 40) || null,
      customer_label_en: String(p.customer_label_en || '').trim().slice(0, 40) || null,
      icon: String(p.icon || '').slice(0, 8),
      color: String(p.color || '').slice(0, 20),
      enabled: p.is_core ? true : !!p.enabled,
      customer_visible: !!p.customer_visible,
      target_minutes: p.target_minutes ? Number(p.target_minutes) : null,
    }));

    if (!live) {
      const merged = clean.map((c) => {
        const base = DEFAULT_PHASES.find((d) => d.key === c.key) || {};
        return Object.assign({}, base, c);
      });
      writeLS(LS_PHASES, merged);
      return merged;
    }
    await st._ensureAuth();
    return st._req('/rest/v1/order_phases?on_conflict=key', {
      method: 'POST',
      headers: st._headers({ Prefer: 'resolution=merge-duplicates,return=representation' }),
      body: JSON.stringify(clean),
    });
  }

  /** Rikthen fazat te vlerat fillestare. */
  async function resetPhases() { return savePhases(clonePhases()); }

  /** Hapat që sheh klienti te faqja e gjurmimit, me emrat që ke vendosur ti. */
  async function publicPhases() {
    if (!live) {
      return readLS(LS_PHASES, clonePhases())
        .filter((p) => p.enabled && p.customer_visible && p.key !== 'cancelled')
        .sort((a, b) => a.sort - b.sort)
        .map((p) => ({
          key: p.key, sort: p.sort,
          label_sq: p.customer_label_sq || p.label_sq,
          label_en: p.customer_label_en || p.label_en,
          icon: p.icon, color: p.color,
        }));
    }
    try { return await st._rpc('public_phases', {}); }
    catch (e) { return []; }
  }

  /** Bashkon fazat që kanë të njëjtën etiketë për klientin, ruajtur radhën. */
  function customerSteps(phases, lang) {
    const out = [];
    (phases || []).forEach((p) => {
      const label = (lang === 'en' ? p.label_en : p.label_sq) || p.label_sq;
      const last = out[out.length - 1];
      if (last && last.label === label) { last.keys.push(p.key); return; }
      out.push({ label, icon: p.icon, color: p.color, keys: [p.key] });
    });
    return out;
  }

  /* ══════════════════ KLIENTËT ══════════════════ */

  const digits = (s) => String(s || '').replace(/\D/g, '');

  /** Numri sjell emrin, adresat e ruajtura dhe porosinë e fundit. */
  async function lookupCustomer(phone) {
    const d = digits(phone);
    if (d.length < 6) return null;

    if (!live) {
      const all = readLS(LS_CUSTOMERS, []);
      const c = all.find((x) => digits(x.phone).slice(-9) === d.slice(-9));
      return c || null;
    }
    await st._ensureAuth();
    const r = await st._rpc('lookup_customer', { p_phone: phone });
    if (!r) return null;
    const row = Array.isArray(r) ? r[0] : r;
    if (!row || !row.customer) return null;
    return {
      id: row.customer.id,
      phone: row.customer.phone,
      name: row.customer.name,
      blocked: row.customer.blocked,
      orders_count: row.customer.orders_count,
      addresses: row.addresses || [],
      last_order: row.last_order || null,
    };
  }

  /** Krijon ose përditëson klientin dhe ruan adresën, pa krijuar dublikatë. */
  async function upsertCustomer(o) {
    const phone = String(o.phone || '').trim();
    if (digits(phone).length < 6) return null;

    if (!live) {
      const all = readLS(LS_CUSTOMERS, []);
      let c = all.find((x) => digits(x.phone).slice(-9) === digits(phone).slice(-9));
      if (!c) { c = { id: uid('c'), phone, name: '', addresses: [], orders_count: 0 }; all.push(c); }
      if (o.name) c.name = o.name;
      const addr = String(o.address || '').trim();
      if (addr.length >= 3) {
        const hit = c.addresses.find((a) => a.address.toLowerCase() === addr.toLowerCase());
        if (hit) { if (o.lat) { hit.lat = o.lat; hit.lng = o.lng; hit.accuracy = o.accuracy; } }
        else c.addresses.unshift({ address: addr, lat: o.lat || null, lng: o.lng || null, accuracy: o.accuracy || null });
      }
      writeLS(LS_CUSTOMERS, all);
      return c.id;
    }
    await st._ensureAuth();
    return st._rpc('upsert_customer', {
      p_phone: phone, p_name: o.name || '', p_address: o.address || null,
      p_lat: o.lat || null, p_lng: o.lng || null, p_accuracy: o.accuracy || null,
    });
  }

  /* ══════════════════ STAFI ══════════════════ */

  const ROLES = {
    owner:   'Pronar',
    manager: 'Menaxher',
    cashier: 'Banak',
    kitchen: 'Kuzhinë',
    pizza:   'Furra e picës',
    driver:  'Motorrist',
  };

  /* ---------- ekipi shembull ----------
     Pa Supabase dhe pa serverin lokal, programi duhet të jetë i provueshëm
     menjëherë — përndryshe ekrani i stafit është një tastierë që nuk hap asgjë.
     Prandaj ekipi krijohet vetë herën e parë, me kode të dukshme. Kjo NUK
     ndodh kurrë kur baza është e vërtetë. */
  const DEMO_STAFF = [
    { name: 'Pronari', role: 'owner',   pin: '7000' },
    { name: 'Kuzhina', role: 'kitchen', pin: '1199' },
    { name: 'Furra',   role: 'pizza',   pin: '1155' },
    { name: 'Andrea',  role: 'driver',  pin: '4821' },
    { name: 'Gito',    role: 'driver',  pin: '4822' },
  ];

  function ensureLocalStaff() {
    if (live) return [];
    const all = readLS(LS_STAFF, []);
    if (all.length) return all;
    const seeded = DEMO_STAFF.map((s) =>
      Object.assign({ id: uid('s'), active: true, pin_hash: 'local', demo: true }, s));
    writeLS(LS_STAFF, seeded);
    return seeded;
  }

  async function fetchStaff() {
    if (!live) return ensureLocalStaff();
    await st._ensureAuth();
    return st._req('/rest/v1/staff?select=id,name,role,active,phone,pin_hash,locked_until&order=role,name',
      { headers: st._headers() });
  }

  async function saveStaff(row) {
    if (!live) {
      const all = readLS(LS_STAFF, []);
      if (row.id) {
        const i = all.findIndex((x) => x.id === row.id);
        if (i >= 0) all[i] = Object.assign(all[i], row);
      } else {
        all.push(Object.assign({ id: uid('s'), active: true }, row));
      }
      writeLS(LS_STAFF, all);
      return all;
    }
    await st._ensureAuth();
    const body = { name: row.name, role: row.role, active: row.active !== false, phone: row.phone || null };
    if (row.id) {
      return st._req('/rest/v1/staff?id=eq.' + encodeURIComponent(row.id), {
        method: 'PATCH', headers: st._headers({ Prefer: 'return=representation' }),
        body: JSON.stringify(body),
      });
    }
    return st._req('/rest/v1/staff', {
      method: 'POST', headers: st._headers({ Prefer: 'return=representation' }),
      body: JSON.stringify(body),
    });
  }

  async function deleteStaff(id) {
    if (!live) {
      writeLS(LS_STAFF, readLS(LS_STAFF, []).filter((x) => x.id !== id));
      return;
    }
    await st._ensureAuth();
    await st._req('/rest/v1/staff?id=eq.' + encodeURIComponent(id), {
      method: 'DELETE', headers: st._headers(),
    });
  }

  /** Vendos kodin e hyrjes. Kodi kurrë nuk kthehet dhe kurrë nuk ruhet i hapur. */
  async function setStaffPin(id, pin) {
    if (!/^[0-9]{4,8}$/.test(String(pin || ''))) {
      throw new Error('Kodi duhet të jetë 4–8 shifra.');
    }
    if (!live) {
      const all = readLS(LS_STAFF, []);
      const dup = all.find((x) => x.id !== id && x.pin === pin);
      if (dup) throw new Error('Ky kod përdoret tashmë nga ' + dup.name + '.');
      const s2 = all.find((x) => x.id === id);
      if (s2) { s2.pin = pin; s2.pin_hash = 'local'; writeLS(LS_STAFF, all); }
      return;
    }
    await st._ensureAuth();
    await st._rpc('set_staff_pin', { p_staff_id: id, p_pin: String(pin) });
  }

  /** Hyrja e kuzhinës ose e motorristit, vetëm me kod. */
  async function staffLogin(pin, device) {
    if (!live) {
      const s2 = ensureLocalStaff().find((x) => x.pin === String(pin) && x.active !== false);
      if (!s2) throw new Error('Kod i gabuar.');
      const sess = { token: 'local-' + s2.id, staff_id: s2.id, name: s2.name, role: s2.role };
      writeLS(LS_DEVICE, sess);
      return sess;
    }
    const r = await st._rpc('staff_login', { p_pin: String(pin), p_device: device || navigator.userAgent.slice(0, 120) });
    const row = Array.isArray(r) ? r[0] : r;
    if (!row || !row.token) throw new Error('Kod i gabuar.');
    writeLS(LS_DEVICE, row);
    return row;
  }

  /** Sesioni i ruajtur i pajisjes, nëse ende i vlefshëm. */
  async function staffSession() {
    const sess = readLS(LS_DEVICE, null);
    if (!sess || !sess.token) return null;
    if (!live) return sess;
    try {
      const r = await st._rpc('staff_by_token', { p_token: sess.token });
      const row = Array.isArray(r) ? r[0] : r;
      if (!row || !row.staff_id) throw new Error('skaduar');
      return Object.assign({ token: sess.token }, row);
    } catch (e) {
      writeLS(LS_DEVICE, null);
      return null;
    }
  }

  async function staffLogout() {
    const sess = readLS(LS_DEVICE, null);
    writeLS(LS_DEVICE, null);
    if (live && sess && sess.token) {
      try { await st._rpc('staff_logout', { p_token: sess.token }); } catch (e) {}
    }
  }

  /* ---------- porositë shembull ----------
     Të shënuara me `demo`, që paneli ta thotë hapur se nuk janë të vërteta. */
  /* Rreshtat e mbajnë vetë stacionin: pjatat shembull nuk gjenden te menuja,
     ndaj pa këtë do të binin të gjitha te kuzhina dhe furra do të dukej bosh. */
  const DEMO_ORDERS = [
    { n: 1, st: 'accepted',  kind: 'delivery', pay: 'cash',
      name: 'Arben Hoxha',  phone: '069 555 1001', addr: 'Rruga Taulantia 14, kati 2',
      note: 'pa qepë',
      items: [['Pica Margarita', 2, 320, 'oven'], ['Coca-Cola 0.5', 1, 120, 'none']] },
    { n: 2, st: 'preparing', kind: 'pickup',   pay: 'cash',
      name: 'Elona Meta',   phone: '069 555 1002', addr: null, note: null,
      items: [['Sufllaqe Pule', 3, 250, 'oven'], ['Sallatë greke', 1, 300, 'kitchen']] },
    { n: 3, st: 'ready',     kind: 'delivery', pay: 'card',
      name: 'Genti Leka',   phone: '069 555 1003', addr: 'Plazh, pallati 7, hyrja B',
      note: 'kambana s\'punon, telefono',
      items: [['Tavë kosi', 1, 450, 'kitchen'], ['Patate', 2, 150, 'kitchen']] },
  ];

  let demoRunning = null;
  /** Krijon një herë të vetme porositë shembull, kur s'ka asnjë të vërtetë. */
  function ensureLocalOrders() {
    if (live) return Promise.resolve();
    if (demoRunning) return demoRunning;
    demoRunning = (async () => {
      const from = new Date(Date.now() - 12 * 3600e3).toISOString();
      const have = (await st.fetchOrders({ from })) || [];
      if (have.length) return;
      for (const d of DEMO_ORDERS) {
        const total = d.items.reduce((n, [, q, p]) => n + q * p, 0);
        const row = await st.createOrder({
          kind: d.kind, name: d.name, phone: d.phone, address: d.addr, note: d.note,
          items: d.items.map(([name, qty, price, station], i) =>
            ({ id: 'demo' + d.n + i, name, qty, price, station })),
          subtotal: total, total, payment: d.pay, channel: 'phone',
          lat: 41.32 + d.n / 200, lng: 19.44 + d.n / 200,
        });
        const patch = { status: d.st, demo: true,
          accepted_at: new Date(Date.now() - 6 * 60000).toISOString() };
        if (d.st === 'preparing') patch.kitchen_at = new Date(Date.now() - 4 * 60000).toISOString();
        if (d.st === 'ready') {
          patch.kitchen_at = new Date(Date.now() - 9 * 60000).toISOString();
          patch.ready_at = new Date(Date.now() - 2 * 60000).toISOString();
        }
        await st.updateOrder(row.id, patch);
      }
    })().catch(() => {}).then(() => { demoRunning = null; });
    return demoRunning;
  }

  /* ══════════════════ STACIONET E PËRGATITJES ══════════════════
     Brenda dyqanit gatuhet në dy vende të ndara: kuzhina dhe furra e picës.
     Furra ka njeriun e vet dhe ekranin e vet — picat dhe sanduiçët me brumë
     pice nuk kalojnë fare nga kuzhina. Një porosi e vetme ndahet mes të dyve
     dhe bëhet «gati» vetëm kur të dy e kanë dhënë të tyren. */

  const STATIONS = {
    kitchen: 'Kuzhina',
    oven:    'Furra e picës',
    none:    'Nuk gatuhet',
  };
  const STATION_ICON = { kitchen: '🍳', oven: '🔥', none: '🥤' };
  const LS_STATIONS = 'sprint-stations';

  /** Ndarja fillestare — ajo që përputhet me dyqanin sot. */
  const DEFAULT_STATIONS = {
    pizza: 'oven', fast: 'oven',
    rest: 'kitchen', trad: 'kitchen', starter: 'kitchen',
    pije: 'none',
  };

  /** Lexon ndarjen: kategoritë, plus përjashtimet për pjata të veçanta. */
  async function fetchStations() {
    if (!live) {
      const saved = readLS(LS_STATIONS, null);
      return saved && saved.categories
        ? saved
        : { categories: Object.assign({}, DEFAULT_STATIONS), items: {} };
    }
    const [cats, items] = await Promise.all([
      st._req('/rest/v1/category_stations?select=category,station', { headers: st._headers() }),
      st._req('/rest/v1/menu_items?select=id,station&station=not.is.null', { headers: st._headers() }),
    ]);
    const out = { categories: {}, items: {} };
    (cats || []).forEach((r) => { out.categories[r.category] = r.station; });
    (items || []).forEach((r) => { out.items[r.id] = r.station; });
    if (!Object.keys(out.categories).length) out.categories = Object.assign({}, DEFAULT_STATIONS);
    return out;
  }

  async function saveStations(map) {
    const clean = {
      categories: map.categories || {},
      items: map.items || {},
    };
    if (!live) { writeLS(LS_STATIONS, clean); return clean; }
    await st._ensureAuth();

    // Kategoritë: zëvendësim i plotë, njësoj si te «Kush sheh çfarë».
    await st._req('/rest/v1/category_stations?category=neq.__none__', {
      method: 'DELETE', headers: st._headers(),
    });
    const rows = Object.keys(clean.categories)
      .map((c) => ({ category: c, station: clean.categories[c] }));
    if (rows.length) {
      await st._req('/rest/v1/category_stations', {
        method: 'POST', headers: st._headers({ Prefer: 'resolution=merge-duplicates' }),
        body: JSON.stringify(rows),
      });
    }

    // Përjashtimet e pjatëve: fillimisht hiqen të gjitha, pastaj vendosen ato
    // që mbeten. Përjashtimet janë të pakta, ndaj kjo mbetet e lirë.
    await st._req('/rest/v1/menu_items?station=not.is.null', {
      method: 'PATCH', headers: st._headers({ Prefer: 'return=minimal' }),
      body: JSON.stringify({ station: null }),
    });
    for (const id of Object.keys(clean.items)) {
      await st._req('/rest/v1/menu_items?id=eq.' + encodeURIComponent(id), {
        method: 'PATCH', headers: st._headers({ Prefer: 'return=minimal' }),
        body: JSON.stringify({ station: clean.items[id] }),
      });
    }
    return clean;
  }

  /** Ndërtuesi i përgjigjes «ku gatuhet kjo?». Merr ndarjen dhe menunë një
      herë, pastaj u përgjigjet rreshtave të porosive pa kërkuar gjë tjetër. */
  function stationRouter(map, menu) {
    const cat = {};
    (menu || []).forEach((m) => { cat[m.id] = m.category || m.c; });
    const of = (line) => {
      if (!line) return 'kitchen';
      // Rreshti i porosisë mund ta mbajë vetë stacionin nga çasti i porosisë:
      // porositë e vjetra nuk ndryshojnë vend sepse ndarja u ndryshua pas tyre.
      if (STATIONS[line.station]) return line.station;
      const id = line.id != null ? String(line.id) : '';
      if (map.items && STATIONS[map.items[id]]) return map.items[id];
      const c = line.category || line.c || cat[id];
      if (c && STATIONS[map.categories[c]]) return map.categories[c];
      return 'kitchen';
    };
    return {
      of,
      /** Rreshtat me stacionin e ngjitur secilit. */
      tag: (items) => (items || []).map((li) => Object.assign({}, li, { station: of(li) })),
      /** Cilat stacione duhet ta gatuajnë këtë porosi. Pijet nuk numërohen. */
      stationsOf: (items) => {
        const seen = {};
        (items || []).forEach((li) => { const s = of(li); if (s !== 'none') seen[s] = 1; });
        return Object.keys(seen).sort();
      },
    };
  }

  /** Ndihmës: një router i gatshëm, me menunë e ngarkuar vetë. */
  async function loadRouter() {
    const [map, all] = await Promise.all([
      fetchStations(),
      st.fetchAll().catch(() => null),
    ]);
    // Pa menu të publikuar mbetet menuja e ndërtuar brenda programit — pa të,
    // çdo pjatë do të binte te kuzhina dhe furra do të mbetej bosh.
    const menu = (all && all.menu && all.menu.length) ? all.menu
      : ((window.SPRINT && window.SPRINT.menu) || []);
    return stationRouter(map, menu);
  }

  /* ══════════════════ EKRANET E GATIMIT ══════════════════ */

  const KDS_STATES = ['new', 'accepted', 'preparing', 'ready'];

  /** Porositë që i duhen këtij stacioni — pa emër, pa telefon, pa adresë.
      Kthehen vetëm porositë që kanë të paktën një rresht për të, dhe rreshtat
      vijnë të shënuar që ekrani të dijë cilat janë të tijat. */
  async function kdsOrders(station) {
    const sta = station === 'oven' ? 'oven' : 'kitchen';
    if (!live) {
      await ensureLocalOrders();
      const [router, list] = await Promise.all([
        loadRouter(),
        st.fetchOrders({ from: new Date(Date.now() - 12 * 3600e3).toISOString() }),
      ]);
      return (list || [])
        .filter((o) => KDS_STATES.indexOf(o.status) >= 0)
        .map((o) => {
          const need = router.stationsOf(o.items);
          const done = o.station_ready || {};
          return Object.assign({}, o, {
            items: router.tag(o.items),
            need,
            station_done: !!done[sta],
            waiting_on: need.filter((s) => !done[s]),
          });
        })
        .filter((o) => o.need.indexOf(sta) >= 0)
        .sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
    }
    const sess = readLS(LS_DEVICE, null);
    if (!sess || !sess.token) throw new Error('Hyr me kodin tënd.');
    return st._rpc('kds_orders', { p_token: sess.token, p_station: sta });
  }

  /** Kalimi i fazës nga një stacion. Kthimi mbrapsht lejohet me qëllim.
      Porosia bëhet «gati» vetëm kur të gjithë stacionet e saj e kanë dhënë:
      një picë e ftohtë duke pritur tavën është pikërisht ajo që kjo ndalon. */
  async function kdsBump(id, status, station) {
    const sta = station === 'oven' ? 'oven' : 'kitchen';
    if (!live) {
      const router = await loadRouter();
      const list = (await st.fetchOrders({})) || [];
      const o = list.find((x) => x.id === id);
      if (!o) throw new Error('Porosia nuk u gjet.');
      const need = router.stationsOf(o.items);
      const done = Object.assign({}, o.station_ready || {});
      if (status === 'ready') done[sta] = new Date().toISOString();
      else delete done[sta];
      const left = need.filter((s) => !done[s]);
      const gati = left.length === 0;
      await st.updateOrder(id, {
        status: gati ? 'ready' : 'preparing',
        station_ready: done,
        kitchen_at: o.kitchen_at || new Date().toISOString(),
        ready_at: gati ? (o.ready_at || new Date().toISOString()) : null,
      });
      return gati ? 'ready' : 'preparing';
    }
    const sess = readLS(LS_DEVICE, null);
    if (!sess || !sess.token) throw new Error('Hyr me kodin tënd.');
    return st._rpc('kds_bump', {
      p_token: sess.token, p_order: id, p_status: status, p_station: sta });
  }

  /* ══════════════════ HIERARKIA E EKRANEVE ══════════════════ */

  const SCREENS = {
    neworder: 'Porosi e re',
    orders:   'Porositë',
    kds:      'Kuzhina',
    oven:     'Furra e picës',
    runs:     'Motorristi',
    bookings: 'Rezervimet',
    menu:     'Menuja',
    stock:    'Magazina',
    reports:  'Raportet',
    staff:    'Stafi',
    settings: 'Cilësimet',
  };
  const ALL_SCREENS = Object.keys(SCREENS);
  const LS_ROLESCR = 'sprint-role-screens';

  const DEFAULT_ROLE_SCREENS = {
    manager: ['neworder','orders','kds','oven','runs','bookings','menu','stock','reports'],
    cashier: ['neworder','orders','bookings'],
    kitchen: ['kds'],
    pizza:   ['oven'],
    driver:  ['runs'],
  };

  /** Cilat ekrane sheh secili rol. Pronari nuk figuron — i sheh të gjitha. */
  async function fetchRoleScreens() {
    if (!live) {
      const saved = readLS(LS_ROLESCR, null);
      return saved || JSON.parse(JSON.stringify(DEFAULT_ROLE_SCREENS));
    }
    await st._ensureAuth();
    const rows = await st._req('/rest/v1/role_screens?select=role,screen', { headers: st._headers() });
    const out = { manager: [], cashier: [], kitchen: [], pizza: [], driver: [] };
    (rows || []).forEach((r) => { if (out[r.role]) out[r.role].push(r.screen); });
    return out;
  }

  async function saveRoleScreens(map) {
    if (!live) { writeLS(LS_ROLESCR, map); return map; }
    await st._ensureAuth();
    // Zëvendësim i plotë: fshi rregullat e vjetra, vendos ato të rejat.
    await st._req('/rest/v1/role_screens?role=neq.__none__', {
      method: 'DELETE', headers: st._headers(),
    });
    const rows = [];
    Object.keys(map).forEach((role) =>
      (map[role] || []).forEach((screen) => rows.push({ role, screen })));
    if (rows.length) {
      await st._req('/rest/v1/role_screens', {
        method: 'POST', headers: st._headers({ Prefer: 'resolution=ignore-duplicates' }),
        body: JSON.stringify(rows),
      });
    }
    return map;
  }

  /** Ekranet e mbajtësit të sesionit aktual të pajisjes. */
  async function myScreens() {
    const sess = readLS(LS_DEVICE, null);
    if (!sess || !sess.token) return null;

    if (!live) {
      if (sess.role === 'owner') {
        return { staff_id: sess.staff_id, name: sess.name, role: sess.role, screens: ALL_SCREENS.slice() };
      }
      const map = readLS(LS_ROLESCR, null) || DEFAULT_ROLE_SCREENS;
      return { staff_id: sess.staff_id, name: sess.name, role: sess.role,
               screens: (map[sess.role] || []).slice() };
    }
    const r = await st._rpc('my_screens', { p_token: sess.token });
    const row = Array.isArray(r) ? r[0] : r;
    if (!row) return null;
    return { staff_id: row.staff_id, name: row.name, role: row.role, screens: row.screens || [] };
  }

  /* ══════════════════ MOTORRISTI ══════════════════ */

  const tok = () => {
    const s = readLS(LS_DEVICE, null);
    if (!s || !s.token) throw new Error('Hyr me kodin tënd.');
    return s;
  };

  /** Porositë gati për t'u marrë, ende pa motorrist. */
  async function drvReady() {
    if (!live) {
      await ensureLocalOrders();
      const from = new Date(Date.now() - 12 * 3600e3).toISOString();
      const list = (await st.fetchOrders({ from })) || [];
      return list
        .filter((o) => o.status === 'ready' && o.kind === 'delivery' && !o.run_id)
        .sort((a, b) => new Date(a.ready_at || a.created_at) - new Date(b.ready_at || b.created_at));
    }
    return st._rpc('drv_ready', { p_token: tok().token });
  }

  /** Nisja: disa porosi bashkë. Kthen id-në e nisjes. */
  async function drvStartRun(ids, pos) {
    if (!ids || !ids.length) throw new Error('Zgjidh të paktën një porosi.');
    if (!live) {
      const s = tok();
      const open = readLS('sprint-runs', []).find((r) => r.driver_id === s.staff_id && !r.closed_at);
      if (open) throw new Error('Ke ende një nisje të hapur. Mbylle atë përpara se të nisesh sërish.');
      const runs = readLS('sprint-runs', []);
      const run = { id: uid('r'), driver_id: s.staff_id, driver_name: s.name,
                    started_at: new Date().toISOString(), closed_at: null };
      runs.push(run); writeLS('sprint-runs', runs);
      for (const id of ids) {
        await st.updateOrder(id, { status: 'delivering', run_id: run.id,
          driver_id: s.staff_id, picked_at: new Date().toISOString() });
      }
      addPoint(run.id, null, 'start', pos);
      return run.id;
    }
    return st._rpc('drv_start_run', {
      p_token: tok().token, p_orders: ids,
      p_lat: (pos && pos.lat) || null, p_lng: (pos && pos.lng) || null,
    });
  }

  /** Nisja e hapur e këtij motorristi, me ndalesat. */
  async function drvMyRun() {
    if (!live) {
      const s = tok();
      const run = readLS('sprint-runs', [])
        .filter((r) => r.driver_id === s.staff_id && !r.closed_at)
        .sort((a, b) => new Date(b.started_at) - new Date(a.started_at))[0];
      if (!run) return { run: null, stops: [] };
      const from = new Date(Date.now() - 24 * 3600e3).toISOString();
      const list = (await st.fetchOrders({ from })) || [];
      const stops = list.filter((o) => o.run_id === run.id)
        .sort((a, b) => (a.delivered_at ? 1 : 0) - (b.delivered_at ? 1 : 0) || a.number - b.number);
      const cash = stops.filter((o) => o.payment === 'cash')
        .reduce((n, o) => n + (Number(o.total) || 0), 0);
      return { run: Object.assign({ cash_due: cash }, run), stops };
    }
    const rows = (await st._rpc('drv_my_run', { p_token: tok().token })) || [];
    if (!rows.length || !rows[0].run_id) return { run: null, stops: [] };
    const run = { id: rows[0].run_id, started_at: rows[0].started_at, cash_due: rows[0].cash_due };
    const stops = rows.filter((r) => r.id).map((r) => ({
      id: r.id, number: r.number, status: r.status, customer_name: r.customer_name,
      phone: r.phone, address: r.address, lat: r.lat, lng: r.lng,
      total: r.total, payment: r.payment, note: r.note,
      delivered_at: r.delivered_at, fail_reason: r.fail_reason,
    }));
    return { run, stops };
  }

  function addPoint(runId, orderId, kind, pos) {
    const pts = readLS('sprint-run-points', []);
    pts.push({ run_id: runId, order_id: orderId, kind,
               lat: (pos && pos.lat) || null, lng: (pos && pos.lng) || null,
               at: new Date().toISOString() });
    writeLS('sprint-run-points', pts);
  }

  async function drvDelivered(orderId, pos, cash) {
    if (!live) {
      const o = ((await st.fetchOrders({ from: new Date(Date.now() - 24 * 3600e3).toISOString() })) || [])
        .find((x) => x.id === orderId);
      if (!o) throw new Error('Kjo porosi nuk është në nisjen tënde.');
      await st.updateOrder(orderId, { status: 'done', delivered_at: new Date().toISOString(),
        done_at: new Date().toISOString(), cash_collected: cash == null ? null : Number(cash) });
      addPoint(o.run_id, orderId, 'delivered', pos);
      const rest = ((await st.fetchOrders({ from: new Date(Date.now() - 24 * 3600e3).toISOString() })) || [])
        .filter((x) => x.run_id === o.run_id && ['done', 'cancelled'].indexOf(x.status) < 0);
      if (!rest.length) {
        const runs = readLS('sprint-runs', []);
        const r = runs.find((x) => x.id === o.run_id);
        if (r) { r.closed_at = new Date().toISOString(); writeLS('sprint-runs', runs); }
        addPoint(o.run_id, null, 'end', pos);
      }
      return 'done';
    }
    return st._rpc('drv_delivered', {
      p_token: tok().token, p_order: orderId,
      p_lat: (pos && pos.lat) || null, p_lng: (pos && pos.lng) || null,
      p_cash: cash == null ? null : Number(cash),
    });
  }

  /** Klienti nuk u gjend — porosia kthehet te banaku me arsyen. */
  async function drvFailed(orderId, reason) {
    if (!live) {
      await st.updateOrder(orderId, { status: 'ready', run_id: null, picked_at: null,
        fail_reason: String(reason || 'Nuk u gjend').slice(0, 200) });
      return 'ready';
    }
    return st._rpc('drv_failed', { p_token: tok().token, p_order: orderId, p_reason: reason || null });
  }

  async function drvMyDay() {
    if (!live) {
      const s = tok();
      const today = new Date().toISOString().slice(0, 10);
      const list = ((await st.fetchOrders({ from: today + 'T00:00:00.000Z' })) || [])
        .filter((o) => o.driver_id === s.staff_id && o.delivered_at);
      const sum = (f) => list.filter(f).reduce((n, o) => n + (Number(o.total) || 0), 0);
      return { deliveries: list.length, cash: sum((o) => o.payment === 'cash'),
               card: sum((o) => o.payment === 'card'), avg_minutes: null };
    }
    const r = await st._rpc('drv_my_day', { p_token: tok().token });
    return (Array.isArray(r) ? r[0] : r) || { deliveries: 0, cash: 0, card: 0 };
  }

  /* ══════════════════ VENDNDODHJA ══════════════════ */

  /**
   * Kërkon vendndodhjen nga shfletuesi.
   * Kthen edhe saktësinë, sepse një pin 200 metra larg është më keq se asnjë pin —
   * klienti duhet ta dijë që i duhet ta lëvizë.
   */
  function getLocation(opts) {
    const o = opts || {};
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) return reject(new Error('Shfletuesi nuk e mbështet vendndodhjen.'));
      navigator.geolocation.getCurrentPosition(
        (pos) => resolve({
          lat: +pos.coords.latitude.toFixed(6),
          lng: +pos.coords.longitude.toFixed(6),
          accuracy: Math.round(pos.coords.accuracy || 0),
        }),
        (err) => {
          const m = {
            1: 'Nuk dhe leje për vendndodhjen. Hape nga cilësimet e shfletuesit.',
            2: 'Vendndodhja nuk u gjet. Provo sërish ose lëvize pinin me dorë.',
            3: 'Kërkimi i vendndodhjes zgjati shumë. Provo sërish.',
          };
          reject(new Error(m[err.code] || 'Vendndodhja nuk u mor.'));
        },
        { enableHighAccuracy: o.high !== false, timeout: o.timeout || 12000, maximumAge: 0 }
      );
    });
  }

  /** Sa e besueshme është vendndodhja: mbi 50 m i themi klientit ta saktësojë. */
  const locationQuality = (acc) =>
    !acc ? 'unknown' : acc <= 25 ? 'good' : acc <= 50 ? 'ok' : 'poor';

  /** Linku i navigimit për motorristin — hapet me aplikacionin e hartave të telefonit. */
  function navLink(o) {
    if (o && o.lat && o.lng) {
      return 'https://www.google.com/maps/dir/?api=1&destination=' + o.lat + ',' + o.lng;
    }
    const a = (o && o.address) || '';
    return 'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(a + ', Durrës, Albania');
  }

  Object.assign(S.store, {
    DEFAULT_PHASES, fetchPhases, savePhases, resetPhases, publicPhases, customerSteps,
    lookupCustomer, upsertCustomer,
    STAFF_ROLES: ROLES, fetchStaff, saveStaff, deleteStaff, setStaffPin,
    KDS_STATES, kdsOrders, kdsBump,
    STATIONS, STATION_ICON, DEFAULT_STATIONS, fetchStations, saveStations,
    stationRouter, loadRouter,
    DEMO_STAFF, ensureLocalStaff, ensureLocalOrders,
    SCREENS, ALL_SCREENS, DEFAULT_ROLE_SCREENS, fetchRoleScreens, saveRoleScreens, myScreens,
    drvReady, drvStartRun, drvMyRun, drvDelivered, drvFailed, drvMyDay,
    staffLogin, staffSession, staffLogout,
    getLocation, locationQuality, navLink,
  });
})();
