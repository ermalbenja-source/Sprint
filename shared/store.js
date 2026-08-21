/* ============================================================================
   SPRINT — Shtresa e ruajtjes.
   Flet me Supabase përmes REST-it (pa asnjë bibliotekë të jashtme).
   Nëse Supabase nuk është konfiguruar, bie te ruajtja lokale në shfletues,
   që paneli admin të jetë i provueshëm edhe pa llogari.
   ========================================================================== */
(function () {
  const S = window.SPRINT;
  const CFG = window.SPRINT_CONFIG || {};
  const URL_ = (CFG.SUPABASE_URL || '').replace(/\/+$/, '');
  const KEY = CFG.SUPABASE_ANON_KEY || '';
  const BUCKET = CFG.PHOTO_BUCKET || 'photos';
  const configured = !!(URL_ && KEY);

  const LS_SESSION = 'sprint-session';
  const LS_LOCAL = 'sprint-local-content';

  /* ---------------- sesioni ---------------- */
  let session = null;
  try { session = JSON.parse(localStorage.getItem(LS_SESSION) || 'null'); } catch (e) {}

  const saveSession = (s) => {
    session = s;
    if (s) localStorage.setItem(LS_SESSION, JSON.stringify(s));
    else localStorage.removeItem(LS_SESSION);
  };

  const authHeader = () => (session && session.access_token)
    ? 'Bearer ' + session.access_token : 'Bearer ' + KEY;

  const headers = (extra) => Object.assign({
    apikey: KEY,
    Authorization: authHeader(),
    'Content-Type': 'application/json',
  }, extra || {});

  async function req(path, opts) {
    const r = await fetch(URL_ + path, opts);
    if (!r.ok) {
      let msg = r.status + ' ' + r.statusText;
      try { const j = await r.json(); msg = j.message || j.error_description || j.msg || msg; } catch (e) {}
      throw new Error(msg);
    }
    return r.status === 204 ? null : r.json();
  }

  /* ---------------- hyrja ---------------- */
  async function signIn(email, password) {
    if (!configured) throw new Error('Supabase nuk është konfiguruar te shared/config.js');
    const data = await req('/auth/v1/token?grant_type=password', {
      method: 'POST',
      headers: { apikey: KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    saveSession({
      access_token: data.access_token,
      refresh_token: data.refresh_token,
      email: (data.user && data.user.email) || email,
      expires_at: Date.now() + (data.expires_in || 3600) * 1000,
    });
    return session;
  }

  async function refresh() {
    if (!session || !session.refresh_token) return null;
    try {
      const data = await req('/auth/v1/token?grant_type=refresh_token', {
        method: 'POST',
        headers: { apikey: KEY, 'Content-Type': 'application/json' },
        body: JSON.stringify({ refresh_token: session.refresh_token }),
      });
      saveSession({
        access_token: data.access_token,
        refresh_token: data.refresh_token,
        email: session.email,
        expires_at: Date.now() + (data.expires_in || 3600) * 1000,
      });
      return session;
    } catch (e) { saveSession(null); return null; }
  }

  /** Siguron një token të vlefshëm para çdo shkrimi. */
  async function ensureAuth() {
    if (!session) return null;
    if (session.expires_at && session.expires_at - Date.now() < 60000) return refresh();
    return session;
  }

  const signOut = () => saveSession(null);
  const currentUser = () => (session ? { email: session.email } : null);

  /* ---------------- leximi publik ---------------- */
  /** Rreshti i tabelës → objekti që pret faqja. */
  const rowToItem = (r) => ({
    id: r.id, c: r.category, art: r.art || 'pizza',
    sq: r.name_sq, en: r.name_en || r.name_sq,
    dsq: r.desc_sq || '', den: r.desc_en || '',
    p: Number(r.price) || 0,
    unit: r.unit || undefined,
    note: r.note || undefined,
    tags: Array.isArray(r.tags) ? r.tags : [],
    img: r.image_url || undefined,
    available: r.available !== false,
    sort: r.sort == null ? 0 : Number(r.sort),
  });

  const itemToRow = (m) => ({
    id: m.id, category: m.c, art: m.art || 'pizza',
    name_sq: m.sq, name_en: m.en || m.sq,
    desc_sq: m.dsq || '', desc_en: m.den || '',
    price: Number(m.p) || 0,
    unit: m.unit || null,
    note: m.note || null,
    tags: m.tags || [],
    image_url: m.img || null,
    available: m.available !== false,
    sort: m.sort == null ? 0 : Number(m.sort),
  });

  /** Lexon menunë dhe cilësimet. Kthen null nëse s'ka asgjë të publikuar. */
  async function fetchAll() {
    if (!configured) return readLocal();
    const [items, settings] = await Promise.all([
      req('/rest/v1/menu_items?select=*&order=sort.asc', { headers: headers() }),
      req('/rest/v1/settings?select=data&id=eq.main', { headers: headers() }),
    ]);
    if (!items || !items.length) return null;
    return {
      menu: items.map(rowToItem),
      settings: (settings && settings[0] && settings[0].data) || null,
    };
  }

  /* ---------------- shkrimi (vetëm i identifikuar) ---------------- */
  async function saveItems(list) {
    if (!configured) return writeLocal({ menu: list });
    await ensureAuth();
    return req('/rest/v1/menu_items?on_conflict=id', {
      method: 'POST',
      headers: headers({ Prefer: 'resolution=merge-duplicates,return=minimal' }),
      body: JSON.stringify(list.map(itemToRow)),
    });
  }

  async function deleteItem(id) {
    if (!configured) {
      const cur = readLocal() || {};
      return writeLocal({ menu: (cur.menu || []).filter((m) => m.id !== id) });
    }
    await ensureAuth();
    return req('/rest/v1/menu_items?id=eq.' + encodeURIComponent(id), {
      method: 'DELETE', headers: headers({ Prefer: 'return=minimal' }),
    });
  }

  async function saveSettings(data) {
    if (!configured) {
      const cur = readLocal() || {};
      return writeLocal({ menu: cur.menu, settings: data });
    }
    await ensureAuth();
    return req('/rest/v1/settings?on_conflict=id', {
      method: 'POST',
      headers: headers({ Prefer: 'resolution=merge-duplicates,return=minimal' }),
      body: JSON.stringify([{ id: 'main', data }]),
    });
  }

  /* ---------------- fotot ---------------- */
  const PHOTO_MAX = 3 * 1024 * 1024;   // 3 MB pas ngjeshjes

  /** Zvogëlon dhe ngjesh foton në shfletues para ngarkimit. */
  function compress(file, maxSide) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      const url = URL.createObjectURL(file);
      img.onload = () => {
        URL.revokeObjectURL(url);
        const side = maxSide || 1200;
        let { width: w, height: h } = img;
        if (Math.max(w, h) > side) {
          const k = side / Math.max(w, h);
          w = Math.round(w * k); h = Math.round(h * k);
        }
        const cv = document.createElement('canvas');
        cv.width = w; cv.height = h;
        cv.getContext('2d').drawImage(img, 0, 0, w, h);
        cv.toBlob((b) => (b ? resolve(b) : reject(new Error('Nuk u ngjesh dot fotoja'))), 'image/jpeg', 0.84);
      };
      img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Skedari nuk është foto')); };
      img.src = url;
    });
  }

  async function uploadPhoto(file, name) {
    const blob = await compress(file, 1200);
    if (blob.size > PHOTO_MAX) throw new Error('Fotoja është shumë e madhe edhe pas ngjeshjes');
    const path = name + '-' + Date.now() + '.jpg';

    if (!configured) {                         // pa Supabase: ruaje si data URI lokal
      return new Promise((res) => {
        const fr = new FileReader();
        fr.onload = () => res(fr.result);
        fr.readAsDataURL(blob);
      });
    }
    await ensureAuth();
    const r = await fetch(URL_ + '/storage/v1/object/' + BUCKET + '/' + path, {
      method: 'POST',
      headers: { apikey: KEY, Authorization: authHeader(), 'Content-Type': 'image/jpeg', 'x-upsert': 'true' },
      body: blob,
    });
    if (!r.ok) {
      let msg = r.status + ' ' + r.statusText;
      try { const j = await r.json(); msg = j.message || j.error || msg; } catch (e) {}
      throw new Error('Ngarkimi dështoi: ' + msg);
    }
    return URL_ + '/storage/v1/object/public/' + BUCKET + '/' + path;
  }

  /* ---------------- ruajtja lokale (rezervë) ---------------- */
  function readLocal() {
    try {
      const raw = localStorage.getItem(LS_LOCAL);
      if (!raw) return null;
      const d = JSON.parse(raw);
      return d && d.menu && d.menu.length ? d : null;
    } catch (e) { return null; }
  }
  function writeLocal(patch) {
    const cur = readLocal() || {};
    const next = { menu: patch.menu || cur.menu || [], settings: patch.settings || cur.settings || null };
    localStorage.setItem(LS_LOCAL, JSON.stringify(next));
    return next;
  }
  const clearLocal = () => localStorage.removeItem(LS_LOCAL);


  /** Fshin nga hapësira e fotove skedarin që i përket kësaj adrese. */
  async function deletePhoto(url) {
    if (!url || !configured) return;                       // data: URI lokale s'kanë çfarë të fshijnë
    const marker = '/storage/v1/object/public/' + BUCKET + '/';
    const at = url.indexOf(marker);
    if (at < 0) return;                                    // foto e jashtme, jo e jona
    const path = url.slice(at + marker.length).split('?')[0];
    await ensureAuth();
    const r = await fetch(URL_ + '/storage/v1/object/' + BUCKET + '/' + path, {
      method: 'DELETE',
      headers: { apikey: KEY, Authorization: authHeader() },
    });
    // Nëse skedari mungon tashmë, s'ka pse të bëjmë zhurmë.
    if (!r.ok && r.status !== 404) {
      let msg = r.status + ' ' + r.statusText;
      try { const j = await r.json(); msg = j.message || j.error || msg; } catch (e) {}
      throw new Error(msg);
    }
  }

  /* ---------------- porositë dhe rezervimet ---------------- */
  const LS_ORDERS = 'sprint-local-orders';
  const LS_BOOKINGS = 'sprint-local-bookings';

  const readLS = (k) => { try { return JSON.parse(localStorage.getItem(k) || '[]'); } catch (e) { return []; } };
  const writeLS = (k, v) => localStorage.setItem(k, JSON.stringify(v));
  const rid = () => 'loc-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);

  /** I njëjti format kodi si te baza: 8 shenja pa I, O, 0, 1. */
  const CODE_ABC = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const genCode = () => Array.from({ length: 8 },
    () => CODE_ABC[Math.floor(Math.random() * CODE_ABC.length)]).join('');
  /** Heq vizat dhe hapësirat, që klienti ta shkruajë si t'i vijë. */
  const normCode = (c) => String(c || '').replace(/[^A-Za-z0-9]/g, '').toUpperCase();
  /** Kodi siç shfaqet: A4F7-K2M9 */
  const fmtCode = (c) => { const n = normCode(c); return n.length > 4 ? n.slice(0, 4) + '-' + n.slice(4) : n; };

  /** Krijon porosinë. Kthen numrin dhe kodin e ndjekjes. */
  async function createOrder(o) {
    const body = {
      status: 'new',
      kind: o.kind || 'delivery',
      customer_name: o.name,
      phone: o.phone,
      address: o.address || null,
      note: o.note || null,
      items: o.items,
      subtotal: o.subtotal,
      delivery_fee: o.deliveryFee || 0,
      total: o.total,
      payment: o.payment || 'cash',
      wanted_at: o.wantedAt || 'asap',
      lang: o.lang || 'sq',
    };
    if (!configured) {
      const list = readLS(LS_ORDERS);
      const row = Object.assign({
        id: rid(),
        number: 1000 + list.length,
        token: genCode(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }, body);
      list.unshift(row); writeLS(LS_ORDERS, list);
      return row;
    }
    const rows = await req('/rest/v1/orders', {
      method: 'POST',
      headers: headers({ Prefer: 'return=representation' }),
      body: JSON.stringify([body]),
    });
    return rows && rows[0];
  }

  /** Porositë e ditës (ose të një dite të caktuar), më e reja e para. */
  async function fetchOrders(opts) {
    opts = opts || {};
    if (!configured) {
      const from = opts.from ? new Date(opts.from).getTime() : 0;
      return readLS(LS_ORDERS).filter((o) => new Date(o.created_at).getTime() >= from);
    }
    let q = '/rest/v1/orders?select=*&order=created_at.desc&limit=' + (opts.limit || 200);
    if (opts.from) q += '&created_at=gte.' + encodeURIComponent(opts.from);
    if (opts.to) q += '&created_at=lt.' + encodeURIComponent(opts.to);
    await ensureAuth();
    return req(q, { headers: headers() });
  }

  async function updateOrder(id, patch) {
    if (!configured) {
      const list = readLS(LS_ORDERS);
      const row = list.find((o) => o.id === id);
      if (row) Object.assign(row, patch, { updated_at: new Date().toISOString() });
      writeLS(LS_ORDERS, list);
      return row;
    }
    await ensureAuth();
    const rows = await req('/rest/v1/orders?id=eq.' + encodeURIComponent(id), {
      method: 'PATCH',
      headers: headers({ Prefer: 'return=representation' }),
      body: JSON.stringify(patch),
    });
    return rows && rows[0];
  }

  async function deleteOrder(id) {
    if (!configured) { writeLS(LS_ORDERS, readLS(LS_ORDERS).filter((o) => o.id !== id)); return; }
    await ensureAuth();
    return req('/rest/v1/orders?id=eq.' + encodeURIComponent(id), {
      method: 'DELETE', headers: headers({ Prefer: 'return=minimal' }),
    });
  }

  /** Ndjekja publike e një porosie me kodin e saj. */
  async function trackOrder(code) {
    const c = normCode(code);
    if (c.length < 6) return null;
    if (!configured) {
      const o = readLS(LS_ORDERS).find((x) => normCode(x.token) === c);
      return o ? Object.assign({ code: o.token }, o) : null;
    }
    const rows = await rpc('track_order', { p_token: c });
    return (rows && rows[0]) || null;
  }

  /** Porositë ende në punë të një numri telefoni, të 24 orëve të fundit. */
  async function findOrdersByPhone(phone) {
    const d = String(phone || '').replace(/\D/g, '');
    if (d.length < 6) return [];
    if (!configured) {
      const cut = Date.now() - 24 * 3600 * 1000;
      return readLS(LS_ORDERS)
        .filter((o) => String(o.phone || '').replace(/\D/g, '').slice(-9) === d.slice(-9))
        .filter((o) => new Date(o.created_at).getTime() > cut)
        .filter((o) => !['done', 'cancelled'].includes(o.status))
        .slice(0, 5)
        .map((o) => Object.assign({ code: o.token }, o));
    }
    return (await rpc('find_orders_by_phone', { p_phone: d })) || [];
  }

  /** Thirrje funksioni në bazë, gjithnjë me çelësin publik. */
  function rpc(name, body) {
    return req('/rest/v1/rpc/' + name, {
      method: 'POST',
      headers: { apikey: KEY, Authorization: 'Bearer ' + KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
  }

  async function createBooking(b) {
    const body = {
      status: 'new', customer_name: b.name, phone: b.phone, date: b.date,
      time: b.time || null, people: b.people || null, area: b.area || null,
      note: b.note || null, lang: b.lang || 'sq',
    };
    if (!configured) {
      const list = readLS(LS_BOOKINGS);
      const row = Object.assign({ id: rid(), number: 100 + list.length,
        created_at: new Date().toISOString() }, body);
      list.unshift(row); writeLS(LS_BOOKINGS, list);
      return row;
    }
    const rows = await req('/rest/v1/bookings', {
      method: 'POST',
      headers: headers({ Prefer: 'return=representation' }),
      body: JSON.stringify([body]),
    });
    return rows && rows[0];
  }

  async function fetchBookings(opts) {
    opts = opts || {};
    if (!configured) return readLS(LS_BOOKINGS);
    let q = '/rest/v1/bookings?select=*&order=date.asc,time.asc&limit=' + (opts.limit || 200);
    if (opts.from) q += '&date=gte.' + encodeURIComponent(opts.from);
    await ensureAuth();
    return req(q, { headers: headers() });
  }

  async function updateBooking(id, patch) {
    if (!configured) {
      const list = readLS(LS_BOOKINGS);
      const row = list.find((b) => b.id === id);
      if (row) Object.assign(row, patch);
      writeLS(LS_BOOKINGS, list);
      return row;
    }
    await ensureAuth();
    const rows = await req('/rest/v1/bookings?id=eq.' + encodeURIComponent(id), {
      method: 'PATCH',
      headers: headers({ Prefer: 'return=representation' }),
      body: JSON.stringify(patch),
    });
    return rows && rows[0];
  }

  /* ---------------- zbatimi mbi të dhënat e faqes ---------------- */
  /** Fut përmbajtjen e publikuar mbi vlerat e ngurta të shared/data.js. */
  function apply(payload) {
    if (!payload) return false;
    if (payload.menu && payload.menu.length) {
      const live = payload.menu
        .filter((m) => m.available !== false)
        .sort((a, b) => (a.sort || 0) - (b.sort || 0));
      S.menu.length = 0;
      live.forEach((m) => S.menu.push(m));
    }
    const st = payload.settings;
    if (st) {
      if (st.config) Object.assign(S.config, st.config);
      if (st.categories && st.categories.length) {
        S.categories.length = 0;
        st.categories.forEach((c) => S.categories.push(c));
      }
      if (st.reviews) { S.reviews.length = 0; st.reviews.forEach((r) => S.reviews.push(r)); }
      if (st.stats && st.stats.length) { S.stats.length = 0; st.stats.forEach((x) => S.stats.push(x)); }
    }
    return true;
  }

  S.store = {
    configured, fetchAll, apply,
    signIn, signOut, currentUser, ensureAuth,
    saveItems, deleteItem, saveSettings,
    uploadPhoto, deletePhoto, compress,
    createOrder, fetchOrders, updateOrder, deleteOrder, trackOrder, findOrdersByPhone,
    genCode, normCode, fmtCode,
    createBooking, fetchBookings, updateBooking,
    readLocal, writeLocal, clearLocal,
    rowToItem, itemToRow,

    // Primitiva për shared/store-biznes.js, që moduli i biznesit të mos
    // rindërtojë vetë kokat e autorizimit dhe rifreskimin e tokenit.
    _req: req, _headers: headers, _rpc: rpc, _ensureAuth: ensureAuth,
  };
})();
