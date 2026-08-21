/* ============================================================================
   SPRINT — Motori i përbashkët i faqes.
   Mban logjikën identike në të 5 mockup-et; pamja vjen nga CSS-ja e secilit.
   ========================================================================== */
(function () {
  const S = window.SPRINT;
  const $  = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c]));

  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function app(opts) {
    opts = opts || {};
    const state = {
      cat: 'all',
      q: '',
      cart: {},          // id -> qty
      lang: localStorage.getItem('sprint-lang') || 'sq',
    };
    S.setLang(state.lang);

    /* ---------------- i18n ---------------- */
    function applyI18n() {
      S.setLang(state.lang);
      document.documentElement.lang = state.lang;
      $$('[data-i18n]').forEach((el) => { el.textContent = S.T(el.dataset.i18n); });
      $$('[data-i18n-ph]').forEach((el) => { el.placeholder = S.T(el.dataset.i18nPh); });
      $$('[data-i18n-html]').forEach((el) => { el.innerHTML = S.T(el.dataset.i18nHtml); });
      $$('[data-lang-toggle]').forEach((el) => { el.textContent = state.lang === 'sq' ? 'EN' : 'SQ'; });
      if (opts.onLang) opts.onLang(state.lang);
    }
    function toggleLang() {
      state.lang = state.lang === 'sq' ? 'en' : 'sq';
      localStorage.setItem('sprint-lang', state.lang);
      applyI18n(); renderFilters(); renderMenu(); renderCart(); renderStatic();
    }

    /* ---------------- pjesë statike (kategori, review, orar) ---------------- */
    function renderStatic() {
      const l = state.lang;
      // kartat e kategorive
      const catWrap = $('[data-cat-cards]');
      if (catWrap) {
        catWrap.innerHTML = S.categories.map((c, i) => (opts.catCard || defaultCatCard)(c, i, l)).join('');
        bindCatCards();
      }
      // review
      const revWrap = $('[data-reviews]');
      if (revWrap) revWrap.innerHTML = S.reviews.map((r, i) => (opts.review || defaultReview)(r, i, l)).join('');
      // statistika
      const stWrap = $('[data-stats]');
      if (stWrap) stWrap.innerHTML = S.stats.map((s) => (opts.stat || defaultStat)(s, l)).join('');
      // orari
      const hWrap = $('[data-hours]');
      if (hWrap) hWrap.innerHTML = S.config.hours[l].map(([d, h]) =>
        `<li><span>${esc(d)}</span><b>${esc(h)}</b></li>`).join('');
      // adresa / kontakt
      $$('[data-addr]').forEach((e) => { e.textContent = S.config.address[l]; });
      $$('[data-tagline]').forEach((e) => { e.textContent = S.config.tagline[l]; });
      $$('[data-phone]').forEach((e) => { e.textContent = S.config.phone; });
      $$('[data-tel-href]').forEach((e) => { e.href = 'tel:' + S.config.phoneHref; });
      $$('[data-map-href]').forEach((e) => { e.href = S.mapLink(); });
      $$('[data-wa-href]').forEach((e) => {
        e.href = S.waLink(state.lang === 'sq'
          ? `Përshëndetje SPRINT! 👋 Dua të bëj një porosi.`
          : `Hello SPRINT! 👋 I'd like to place an order.`);
      });
      $$('[data-year]').forEach((e) => { e.textContent = new Date().getFullYear(); });
      // Rrjetet sociale: fshihi ato që nuk i kemi ende.
      $$('[data-soc]').forEach((a) => {
        const url = S.config.social[{ ig:'instagram', fb:'facebook', tt:'tiktok' }[a.dataset.soc]] || '';
        if (!url) { a.hidden = true; a.style.display = 'none'; return; }
        a.hidden = false; a.style.removeProperty('display');
        a.href = url; a.target = '_blank'; a.rel = 'noopener';
      });
      if (opts.onStatic) opts.onStatic(l);
      revealScan();
    }

    const defaultCatCard = (c, i, l) => `
      <button class="cat-card" data-reveal data-cat-jump="${c.id}" style="--i:${i}">
        ${S.art({ art: c.art, sq: c[l === 'sq' ? 'sq' : 'en'] }, 'cat-art')}
        <h3>${esc(c[l === 'sq' ? 'sq' : 'en'])}</h3>
        <p>${esc(c[l === 'sq' ? 'dsq' : 'den'])}</p>
      </button>`;

    const defaultReview = (r, i, l) => `
      <figure class="review" data-reveal style="--i:${i}">
        <div class="stars">${'★'.repeat(r.s)}</div>
        <blockquote>${esc(r[l === 'sq' ? 'sq' : 'en'])}</blockquote>
        <figcaption><b>${esc(r.n)}</b><span>${esc(r.src)}</span></figcaption>
      </figure>`;

    const defaultStat = (s, l) => `
      <div class="stat"><b>${esc(s.v)}</b><span>${esc(s[l === 'sq' ? 'sq' : 'en'])}</span></div>`;

    function bindCatCards() {
      $$('[data-cat-jump]').forEach((b) => b.addEventListener('click', () => {
        state.cat = b.dataset.catJump; state.q = '';
        const si = $('[data-search]'); if (si) si.value = '';
        renderFilters(); renderMenu();
        const m = $('#menu'); if (m) m.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'start' });
      }));
    }

    /* ---------------- filtrat ---------------- */
    function renderFilters() {
      const wrap = $('[data-filters]'); if (!wrap) return;
      const l = state.lang;
      const items = [{ id: 'all', label: S.T('menu_all'), art: 'pizza' }]
        .concat(S.categories.map((c) => ({ id: c.id, label: c[l === 'sq' ? 'sq' : 'en'], art: c.art })));
      wrap.innerHTML = items.map((c) => `
        <button class="chip${state.cat === c.id ? ' is-on' : ''}" data-chip="${c.id}">
          <span>${esc(c.label)}</span>
        </button>`).join('');
      $$('[data-chip]', wrap).forEach((b) => b.addEventListener('click', () => {
        state.cat = b.dataset.chip; renderFilters(); renderMenu();
      }));
    }

    /* ---------------- menuja ---------------- */
    const tagLabel = { hot:{sq:'Pikante',en:'Spicy'}, veg:{sq:'Vegjetarian',en:'Veggie'},
                       new:{sq:'I ri',en:'New'}, top:{sq:'Më i shituri',en:'Bestseller'} };

    function filtered() {
      const q = state.q.trim().toLowerCase();
      return S.menu.filter((m) => {
        if (state.cat !== 'all' && m.c !== state.cat) return false;
        if (!q) return true;
        return (m.sq + ' ' + m.en + ' ' + m.dsq + ' ' + m.den).toLowerCase().includes(q);
      });
    }

    const defaultCard = (m, i, l) => `
      <article class="dish" data-reveal style="--i:${i}" data-dish="${m.id}">
        <div class="dish-media">${S.art(m, 'dish-art')}
          ${m.tags.length ? `<div class="dish-tags">${m.tags.map((t) =>
            `<span class="tag tag-${t}">${esc(tagLabel[t][l])}</span>`).join('')}</div>` : ''}
        </div>
        <div class="dish-body">
          <h3>${esc(m[l === 'sq' ? 'sq' : 'en'])}${m.note ? ` <em class="note">${esc(m.note)}</em>` : ''}</h3>
          <p>${esc(m[l === 'sq' ? 'dsq' : 'den'])}</p>
          <div class="dish-foot">
            <span class="price">${S.price(m)}</span>
            <button class="add" data-add="${m.id}"><span data-i18n="add">${S.T('add')}</span></button>
          </div>
        </div>
      </article>`;

    function renderMenu() {
      const grid = $('[data-menu-grid]'); if (!grid) return;
      const l = state.lang, list = filtered();
      grid.innerHTML = list.length
        ? list.map((m, i) => (opts.card || defaultCard)(m, i, l)).join('')
        : `<p class="menu-empty">${esc(S.T('empty'))}</p>`;
      $$('[data-add]', grid).forEach((b) => b.addEventListener('click', (e) => {
        e.stopPropagation(); addToCart(b.dataset.add, b);
      }));
      if (opts.onMenu) opts.onMenu(grid, list);
      revealScan();
    }

    /* ---------------- shporta ---------------- */
    function addToCart(id, btn) {
      state.cart[id] = (state.cart[id] || 0) + 1;
      saveCart(); renderCart();
      if (btn) {
        const span = btn.querySelector('span');
        const old = span.textContent;
        span.textContent = S.T('added');
        btn.classList.add('is-added');
        setTimeout(() => { span.textContent = old; btn.classList.remove('is-added'); }, 1100);
      }
      bump();
    }
    function setQty(id, d) {
      state.cart[id] = (state.cart[id] || 0) + d;
      if (state.cart[id] <= 0) delete state.cart[id];
      saveCart(); renderCart();
    }
    function clearCart() { state.cart = {}; saveCart(); renderCart(); }
    function saveCart() { try { localStorage.setItem('sprint-cart', JSON.stringify(state.cart)); } catch (e) {} }
    function loadCart() {
      try { state.cart = JSON.parse(localStorage.getItem('sprint-cart')) || {}; } catch (e) { state.cart = {}; }
    }
    function bump() {
      $$('[data-cart-count]').forEach((el) => {
        el.classList.remove('bump'); void el.offsetWidth; el.classList.add('bump');
      });
    }

    function cartLines() {
      return Object.keys(state.cart).map((id) => {
        const m = S.menu.find((x) => x.id === id);
        return m ? { m, q: state.cart[id], sum: m.p * state.cart[id] } : null;
      }).filter(Boolean);
    }
    function totals() {
      const lines = cartLines();
      const sub = lines.reduce((a, b) => a + b.sum, 0);
      const fee = S.config.deliveryFee;
      const free = S.config.freeDeliveryOver;
      // fee === null → tarifa nuk është konfirmuar ende; shfaqet «Sipas zonës»
      const known = typeof fee === 'number';
      const del = !known || sub === 0 ? 0
        : (typeof free === 'number' && sub >= free ? 0 : fee);
      return { lines, sub, del, known, total: sub + del, count: lines.reduce((a, b) => a + b.q, 0) };
    }

    /** Teksti i rreshtit të dërgesës, sipas asaj që dimë vërtet. */
    function deliveryLabel(t) {
      if (!t.known) return S.T('cart_zone');
      if (t.sub > 0 && t.del === 0) return S.T('cart_free');
      return S.money(t.del);
    }

    function renderCart() {
      const l = state.lang, t = totals();
      $$('[data-cart-count]').forEach((e) => {
        e.textContent = t.count;
        e.closest('[data-cart-badge]')?.classList.toggle('is-empty', t.count === 0);
      });
      document.body.classList.toggle('has-cart', t.count > 0);

      const box = $('[data-cart-items]');
      if (box) {
        box.innerHTML = t.lines.length ? t.lines.map((li) => `
          <li class="cart-line">
            <span class="cl-art">${S.art(li.m, 'cl-img')}</span>
            <span class="cl-name">${esc(li.m[l === 'sq' ? 'sq' : 'en'])}<em>${S.price(li.m)}</em></span>
            <span class="qty">
              <button data-q="-1" data-id="${li.m.id}" aria-label="-">−</button>
              <b>${li.q}</b>
              <button data-q="1" data-id="${li.m.id}" aria-label="+">+</button>
            </span>
            <span class="cl-sum">${S.money(li.sum)}</span>
          </li>`).join('')
          : `<li class="cart-empty">${esc(S.T('cart_empty'))}</li>`;
        $$('[data-q]', box).forEach((b) => b.addEventListener('click', () =>
          setQty(b.dataset.id, parseInt(b.dataset.q, 10))));
      }
      const set = (sel, v) => $$(sel).forEach((e) => { e.textContent = v; });
      set('[data-cart-sub]', S.money(t.sub));
      set('[data-cart-del]', deliveryLabel(t));
      set('[data-cart-total]', S.money(t.total));

      $$('[data-cart-send]').forEach((btn) => {
        btn.classList.toggle('is-disabled', t.count === 0);
        btn.setAttribute('aria-disabled', t.count === 0 ? 'true' : 'false');
        btn.href = t.count === 0 ? '#menu' : S.waLink(orderMessage());
      });
      if (opts.onCart) opts.onCart(t);
    }

    function orderMessage(extra) {
      const l = state.lang, t = totals();
      extra = extra || null;
      const head = l === 'sq'
        ? `🍕 *POROSI E RE — SPRINT Durrës*\n`
        : `🍕 *NEW ORDER — SPRINT Durrës*\n`;
      const lines = t.lines.map((li) =>
        `• ${li.q}× ${li.m[l === 'sq' ? 'sq' : 'en']} — ${S.money(li.sum)}`).join('\n');
      const sums = `\n\n${S.T('cart_sub')}: ${S.money(t.sub)}\n${S.T('cart_del')}: ${deliveryLabel(t)}\n*${S.T('cart_total')}: ${S.money(t.total)}*`;
      let foot;
      if (extra) {
        const isDel = extra.kind === 'delivery';
        foot = l === 'sq'
          ? `\n\n🧾 Porosia nr. *${extra.number}*\n🔖 Kodi i gjurmimit: *${extra.code}*\n👤 ${extra.name}\n📞 ${extra.phone}` +
            (isDel ? `\n📍 ${extra.address}` : `\n🏃 Marr vetë në lokal`) +
            `\n⏰ ${extra.wantedAt === 'asap' ? 'Sa më shpejt' : 'Për orën ' + extra.wantedAt}` +
            `\n💵 ${extra.payment === 'cash' ? 'Me para në dorë' : 'Me kartë'}` +
            (extra.note ? `\n📝 ${extra.note}` : '')
          : `\n\n🧾 Order no. *${extra.number}*\n🔖 Tracking code: *${extra.code}*\n👤 ${extra.name}\n📞 ${extra.phone}` +
            (isDel ? `\n📍 ${extra.address}` : `\n🏃 Collecting in person`) +
            `\n⏰ ${extra.wantedAt === 'asap' ? 'As soon as possible' : 'For ' + extra.wantedAt}` +
            `\n💵 ${extra.payment === 'cash' ? 'Cash on delivery' : 'Card'}` +
            (extra.note ? `\n📝 ${extra.note}` : '');
      } else {
        foot = l === 'sq'
          ? `\n\n📍 Adresa ime: \n📞 Numri im: \n⏰ E dua për orën: `
          : `\n\n📍 My address: \n📞 My number: \n⏰ Wanted for: `;
      }
      return head + lines + sums + foot;
    }

    /* ---------------- rezervimi ---------------- */
    function bookMessage(d) {
      const l = state.lang;
      return l === 'sq'
        ? `📅 *REZERVIM I RI — SPRINT Durrës*\n\n👤 Emri: ${d.name}\n📞 Telefon: ${d.phone}\n🗓️ Data: ${d.date}\n🕐 Ora: ${d.time}\n👥 Persona: ${d.people}\n🪑 Ambienti: ${d.area}\n📝 Shënim: ${d.note || '—'}\n\nJu lutem konfirmoni. Faleminderit!`
        : `📅 *NEW RESERVATION — SPRINT Durrës*\n\n👤 Name: ${d.name}\n📞 Phone: ${d.phone}\n🗓️ Date: ${d.date}\n🕐 Time: ${d.time}\n👥 Guests: ${d.people}\n🪑 Seating: ${d.area}\n📝 Note: ${d.note || '—'}\n\nPlease confirm. Thank you!`;
    }

    function initBooking() {
      const form = $('[data-book-form]'); if (!form) return;

      // Salla e eventeve është një ambient real i lokalit — shtoje te zgjedhjet.
      const areaSel = form.querySelector('[name=area]');
      if (areaSel && !areaSel.querySelector('[data-i18n="f_area_ev"]')) {
        const opt = document.createElement('option');
        opt.dataset.i18n = 'f_area_ev';
        opt.textContent = S.T('f_area_ev');
        areaSel.insertBefore(opt, areaSel.options[areaSel.options.length - 1]);
      }
      // Butoni i email-it ka kuptim vetëm nëse kemi një adresë.
      if (!S.config.email) {
        const mb = form.querySelector('[data-book-email]');
        if (mb) mb.remove();
      }
      const dateEl = form.querySelector('[name=date]');
      if (dateEl) {
        const today = new Date().toISOString().slice(0, 10);
        dateEl.min = today; if (!dateEl.value) dateEl.value = today;
      }
      const read = () => {
        const f = new FormData(form);
        const areaSel = form.querySelector('[name=area]');
        return {
          name: (f.get('name') || '').trim(),
          phone: (f.get('phone') || '').trim(),
          date: f.get('date') || '',
          time: f.get('time') || '',
          people: f.get('people') || '2',
          area: areaSel ? areaSel.options[areaSel.selectedIndex].text : '',
          note: (f.get('note') || '').trim(),
        };
      };
      const valid = (d) => d.name && d.phone && d.date;
      const err = form.querySelector('[data-form-error]');
      const show = (msg) => { if (err) { err.textContent = msg; err.classList.toggle('is-on', !!msg); } };

      form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const d = read();
        if (!valid(d)) { show(S.T('f_req')); return; }
        show('');
        const btn = form.querySelector('[type=submit]');
        const label = btn ? btn.innerHTML : '';
        if (btn) { btn.disabled = true; btn.textContent = '…'; }
        try {
          if (opts.onBooking) await opts.onBooking(d);
        } catch (err) {
          show(err.message || 'Rezervimi nuk u regjistrua dot.');
        } finally {
          if (btn) { btn.disabled = false; btn.innerHTML = label; }
        }
        form.classList.add('is-sent');
        window.open(S.waLink(bookMessage(d)), '_blank', 'noopener');
      });

      const mailBtn = form.querySelector('[data-book-email]');
      if (mailBtn) mailBtn.addEventListener('click', (e) => {
        e.preventDefault();
        const d = read();
        if (!valid(d)) { show(S.T('f_req')); return; }
        show('');
        const subj = state.lang === 'sq'
          ? `Rezervim — ${d.name} — ${d.date} ${d.time}`
          : `Reservation — ${d.name} — ${d.date} ${d.time}`;
        window.location.href = S.mailLink(subj, bookMessage(d).replace(/\*/g, ''));
      });
    }

    /* ---------------- zbulimi në scroll ---------------- */
    let io;
    function revealScan() {
      if (reduced) { $$('[data-reveal]').forEach((e) => e.classList.add('in')); return; }
      if (!io) {
        io = new IntersectionObserver((ents) => ents.forEach((en) => {
          if (en.isIntersecting) { en.target.classList.add('in'); io.unobserve(en.target); }
        }), { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });
      }
      $$('[data-reveal]:not(.in)').forEach((e) => io.observe(e));
    }

    /* ---------------- nis ---------------- */
    function init() {
      loadCart();
      applyI18n(); renderStatic(); renderFilters(); renderMenu(); renderCart(); initBooking();

      $$('[data-lang-toggle]').forEach((b) => b.addEventListener('click', toggleLang));
      const si = $('[data-search]');
      if (si) si.addEventListener('input', () => { state.q = si.value; renderMenu(); });
      $$('[data-cart-clear]').forEach((b) => b.addEventListener('click', clearCart));

      // Kur faqja ka një hap arke, butoni i shportës e hap atë në vend që të
      // kalojë drejt e në WhatsApp — kështu porosia regjistrohet përpara.
      if (opts.checkout) {
        $$('[data-cart-send]').forEach((b) => b.addEventListener('click', (e) => {
          if (b.classList.contains('is-disabled')) return;
          e.preventDefault();
          opts.checkout(totals(), orderMessage);
        }));
      }

      // panelin e shportës
      $$('[data-cart-open]').forEach((b) => b.addEventListener('click', () =>
        document.body.classList.add('cart-open')));
      $$('[data-cart-close]').forEach((b) => b.addEventListener('click', () =>
        document.body.classList.remove('cart-open')));
      document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') document.body.classList.remove('cart-open', 'nav-open');
      });
      $$('[data-nav-toggle]').forEach((b) => b.addEventListener('click', () =>
        document.body.classList.toggle('nav-open')));
      $$('[data-nav] a').forEach((a) => a.addEventListener('click', () =>
        document.body.classList.remove('nav-open')));

      // header i ngjitur
      const hdr = $('[data-header]');
      if (hdr) {
        const onScroll = () => hdr.classList.toggle('is-stuck', window.scrollY > 24);
        onScroll(); addEventListener('scroll', onScroll, { passive: true });
      }
      if (opts.onReady) opts.onReady({ state, renderMenu, renderCart, totals, revealScan });
    }

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
    else init();

    return { state, renderMenu, renderCart, renderStatic, renderFilters, applyI18n,
             totals, revealScan, toggleLang };
  }

  S.app = app;
  S.$ = $; S.$$ = $$; S.esc = esc; S.reduced = reduced;
})();
