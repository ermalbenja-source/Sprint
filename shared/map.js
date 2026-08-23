/* ============================================================================
   SPRINT — Hartë e vogël me pin që lëvizet, mbi pllakat e OpenStreetMap.
   Pa asnjë bibliotekë: vetëm matematika e pllakave dhe tërheqja me gisht.

   Pse pin që lëvizet dhe jo thjesht «merr vendndodhjen»: GPS-i i telefonit
   shpesh bie 30–100 metra larg, dhe në Durrës ku rrugët s'kanë numra, kjo do
   të thotë motorrist që endet. Korrigjimi me dorë është pjesa që i shpëton
   porositë — jo marrja e koordinatës.
   ========================================================================== */
(function () {
  const S = window.SPRINT;
  const TS = 256;                       // përmasa e një pllake
  const TILES = 'https://tile.openstreetmap.org/';

  /* Konvertimi lat/lng ↔ njësi pllake (Web Mercator). */
  function project(lat, lng, z) {
    const n = Math.pow(2, z);
    const r = lat * Math.PI / 180;
    return {
      x: (lng + 180) / 360 * n,
      y: (1 - Math.log(Math.tan(r) + 1 / Math.cos(r)) / Math.PI) / 2 * n,
    };
  }
  function unproject(x, y, z) {
    const n = Math.pow(2, z);
    return {
      lng: x / n * 360 - 180,
      lat: Math.atan(Math.sinh(Math.PI * (1 - 2 * y / n))) * 180 / Math.PI,
    };
  }

  const clampLat = (v) => Math.max(-85, Math.min(85, v));
  const clampLng = (v) => ((v + 180) % 360 + 360) % 360 - 180;

  /**
   * Krijon hartën brenda `el`.
   * @returns {{setView:Function, get:Function, destroy:Function}}
   */
  function miniMap(el, opts) {
    const o = Object.assign({ lat: 41.3231, lng: 19.4414, zoom: 17, onMove: null }, opts || {});
    let z = o.zoom;
    let c = project(clampLat(o.lat), clampLng(o.lng), z);

    el.classList.add('smap');
    el.innerHTML =
      '<div class="smap-tiles"></div>' +
      '<svg class="smap-over" aria-hidden="true"></svg>' +
      '<div class="smap-pin" aria-hidden="true">📍</div>' +
      '<div class="smap-zoom">' +
        '<button type="button" data-z="1" aria-label="Afro">+</button>' +
        '<button type="button" data-z="-1" aria-label="Largo">−</button>' +
      '</div>';
    const layer = el.querySelector('.smap-tiles');
    const over = el.querySelector('.smap-over');

    /* Format e vizatuara mbi hartë: kufij zonash, pika ndalesash, dyqani.
       Mbahen në koordinata gjeografike dhe rillogariten në çdo lëvizje —
       përndryshe do të rrëshqisnin veç nga harta poshtë tyre. */
    let shapes = [];

    function draw() {
      const w = el.clientWidth || 300;
      const h = el.clientHeight || 200;
      const left = c.x - w / (2 * TS);
      const top = c.y - h / (2 * TS);
      const n = Math.pow(2, z);
      let html = '';
      for (let ix = Math.floor(left); ix < left + w / TS; ix++) {
        for (let iy = Math.floor(top); iy < top + h / TS; iy++) {
          if (iy < 0 || iy >= n) continue;
          const tx = ((ix % n) + n) % n;             // hartat mbështillen horizontalisht
          html += `<img alt="" draggable="false" src="${TILES}${z}/${tx}/${iy}.png"
                    style="left:${Math.round((ix - left) * TS)}px;top:${Math.round((iy - top) * TS)}px">`;
        }
      }
      layer.innerHTML = html;
      drawShapes(w, h, left, top);
    }

    /** lat/lng → pikselë brenda kutisë, për zoom-in e tanishëm. */
    function toPx(lat, lng, left, top) {
      const p = project(clampLat(lat), clampLng(lng), z);
      return [(p.x - left) * TS, (p.y - top) * TS];
    }

    function drawShapes(w, h, left, top) {
      if (!over) return;
      over.setAttribute('viewBox', '0 0 ' + w + ' ' + h);
      over.setAttribute('width', w);
      over.setAttribute('height', h);
      if (!shapes.length) { over.innerHTML = ''; return; }

      let out = '';
      shapes.forEach((sh) => {
        if (sh.kind === 'poly' && sh.points && sh.points.length > 1) {
          const d = sh.points.map((pt) => toPx(pt[0], pt[1], left, top).map(Math.round).join(','));
          out += `<polygon points="${d.join(' ')}" fill="${sh.fill || 'rgba(222,127,28,.18)'}"`
            + ` stroke="${sh.stroke || '#DE7F1C'}" stroke-width="${sh.width || 2}"`
            + ` stroke-dasharray="${sh.dash || ''}"></polygon>`;
          if (sh.handles) {
            sh.points.forEach((pt, i) => {
              const [x, y] = toPx(pt[0], pt[1], left, top);
              out += `<circle cx="${Math.round(x)}" cy="${Math.round(y)}" r="7"`
                + ` fill="#fff" stroke="${sh.stroke || '#DE7F1C'}" stroke-width="2"`
                + ` data-vertex="${i}" style="cursor:pointer;pointer-events:auto"></circle>`;
            });
          }
        } else if (sh.kind === 'dot') {
          const [x, y] = toPx(sh.lat, sh.lng, left, top);
          out += `<circle cx="${Math.round(x)}" cy="${Math.round(y)}" r="${sh.r || 6}"`
            + ` fill="${sh.fill || '#DE7F1C'}" stroke="#0C0A0B" stroke-width="2"></circle>`;
          if (sh.label) {
            out += `<text x="${Math.round(x) + 10}" y="${Math.round(y) + 4}" fill="${sh.fill || '#DE7F1C'}"`
              + ` font-size="12" font-weight="700"`
              + ` style="paint-order:stroke;stroke:#0C0A0B;stroke-width:3">${sh.label}</text>`;
          }
        }
      });
      over.innerHTML = out;
    }

    function emit() {
      const p = unproject(c.x, c.y, z);
      if (o.onMove) o.onMove({ lat: +p.lat.toFixed(6), lng: +p.lng.toFixed(6) });
    }

    /* Tërheqja: me gisht ose me mi, i njëjti kod. */
    let drag = null;
    let moved = false;
    const start = (e) => {
      const t = e.touches ? e.touches[0] : e;
      drag = { x: t.clientX, y: t.clientY };
      moved = false;
      el.classList.add('grab');
    };
    const move = (e) => {
      if (!drag) return;
      const t = e.touches ? e.touches[0] : e;
      if (Math.abs(t.clientX - drag.x) > 2 || Math.abs(t.clientY - drag.y) > 2) moved = true;
      c.x -= (t.clientX - drag.x) / TS;
      c.y -= (t.clientY - drag.y) / TS;
      const n = Math.pow(2, z);
      c.y = Math.max(0, Math.min(n, c.y));
      drag = { x: t.clientX, y: t.clientY };
      draw();
      if (e.cancelable) e.preventDefault();
    };
    /* Prekja pa lëvizje është klikim, jo tërheqje. Pa këtë dallim, çdo ngritje
       gishti rivizatonte mbivendosjen dhe e fshinte elementin nën kursor
       përpara se klikimi të mbërrinte — pikat e kufirit nuk klikoheshin dot. */
    const end = () => {
      if (!drag) return;
      drag = null;
      el.classList.remove('grab');
      if (moved) emit();
      moved = false;
    };

    el.addEventListener('mousedown', start);
    el.addEventListener('touchstart', start, { passive: true });
    window.addEventListener('mousemove', move);
    el.addEventListener('touchmove', move, { passive: false });
    window.addEventListener('mouseup', end);
    el.addEventListener('touchend', end);

    el.addEventListener('click', (e) => {
      const vx = e.target.closest && e.target.closest('[data-vertex]');
      if (vx && o.onVertex) { o.onVertex(Number(vx.dataset.vertex)); return; }

      const b = e.target.closest('[data-z]');
      if (!b) {
        // Klikim mbi hartë: kthen pikën e prekur, që zona të vizatohet me gisht.
        if (o.onClick && !drag) {
          const r = el.getBoundingClientRect();
          const w = el.clientWidth || 300, h = el.clientHeight || 200;
          const left = c.x - w / (2 * TS), top = c.y - h / (2 * TS);
          const p = unproject(left + (e.clientX - r.left) / TS,
                              top + (e.clientY - r.top) / TS, z);
          o.onClick({ lat: +p.lat.toFixed(6), lng: +p.lng.toFixed(6) });
        }
        return;
      }
      const nz = Math.max(3, Math.min(19, z + Number(b.dataset.z)));
      if (nz === z) return;
      const p = unproject(c.x, c.y, z);
      z = nz;
      c = project(p.lat, p.lng, z);
      draw();
    });

    draw();

    return {
      setView(lat, lng, zoom) {
        if (zoom) z = zoom;
        c = project(clampLat(lat), clampLng(lng), z);
        draw();
      },
      get() { const p = unproject(c.x, c.y, z); return { lat: +p.lat.toFixed(6), lng: +p.lng.toFixed(6) }; },
      redraw: draw,
      /** Vendos format që vizatohen mbi hartë dhe i rifreskon. */
      setShapes(list) { shapes = list || []; draw(); },
      /** Përshtat pamjen që të gjitha pikat e dhëna të hyjnë brenda. */
      fit(points, pad) {
        const pts = (points || []).filter((p) => p && isFinite(p[0]) && isFinite(p[1]));
        if (!pts.length) return;
        const la = pts.map((p) => p[0]), lo = pts.map((p) => p[1]);
        const cLat = (Math.min(...la) + Math.max(...la)) / 2;
        const cLng = (Math.min(...lo) + Math.max(...lo)) / 2;
        const w = el.clientWidth || 300, h = el.clientHeight || 200;
        for (let zz = 18; zz >= 3; zz--) {
          const a = project(Math.min(...la), Math.min(...lo), zz);
          const b2 = project(Math.max(...la), Math.max(...lo), zz);
          if (Math.abs(b2.x - a.x) * TS < w - (pad || 40)
              && Math.abs(b2.y - a.y) * TS < h - (pad || 40)) { z = zz; break; }
        }
        c = project(clampLat(cLat), clampLng(cLng), z);
        draw();
      },
      destroy() {
        window.removeEventListener('mousemove', move);
        window.removeEventListener('mouseup', end);
        el.innerHTML = '';
      },
    };
  }

  S.miniMap = miniMap;
})();
