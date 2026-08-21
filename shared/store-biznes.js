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

  const readLS = (k, fb) => {
    try { return JSON.parse(localStorage.getItem(k) || 'null') || fb; }
    catch (e) { return fb; }
  };
  const writeLS = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} };

  // Identifikues i vetëm për modalitetin lokal. Date.now() nuk mjafton: dy rreshta
  // të krijuar brenda të njëjtit milisekond do të merrnin të njëjtin id.
  const uid = (p) => p + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);

  /* ══════════════════ FAZAT ══════════════════
     Çelësat janë të fiksuar sepse kuzhina, motorristi dhe faqja e klientit
     varen prej tyre. Gjithçka tjetër është e jotja. Këto vlera pasqyrojnë
     saktësisht ato që mbjell supabase/schema-2-biznes.sql. */

  const DEFAULT_PHASES = [
    { key:'placed',    sort:10, label_sq:'E marrë',  label_en:'Placed',     customer_label_sq:'E marrë',        customer_label_en:'Received',    icon:'📥', color:'#8a8a8a', enabled:true, customer_visible:true, target_minutes:null, is_core:true  },
    { key:'confirmed', sort:20, label_sq:'Pranuar',  label_en:'Accepted',   customer_label_sq:'Po përgatitet',  customer_label_en:'In progress', icon:'✓',  color:'#c4640b', enabled:true, customer_visible:true, target_minutes:3,    is_core:false },
    { key:'kitchen',   sort:30, label_sq:'Në furrë', label_en:'In kitchen', customer_label_sq:'Po përgatitet',  customer_label_en:'In progress', icon:'🔥', color:'#c4640b', enabled:true, customer_visible:true, target_minutes:20,   is_core:true  },
    { key:'ready',     sort:40, label_sq:'Gati',     label_en:'Ready',      customer_label_sq:'Nisi për te ti', customer_label_en:'On its way',  icon:'🛎',  color:'#3b6446', enabled:true, customer_visible:true, target_minutes:5,    is_core:false },
    { key:'out',       sort:50, label_sq:'Në rrugë', label_en:'On the way', customer_label_sq:'Nisi për te ti', customer_label_en:'On its way',  icon:'🛵', color:'#3b6446', enabled:true, customer_visible:true, target_minutes:25,   is_core:true  },
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
    driver:  'Motorrist',
  };

  async function fetchStaff() {
    if (!live) return readLS(LS_STAFF, []);
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
      const s2 = readLS(LS_STAFF, []).find((x) => x.pin === String(pin) && x.active !== false);
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
    staffLogin, staffSession, staffLogout,
    getLocation, locationQuality, navLink,
  });
})();
