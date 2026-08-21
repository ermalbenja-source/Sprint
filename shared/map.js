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
      '<div class="smap-pin" aria-hidden="true">📍</div>' +
      '<div class="smap-zoom">' +
        '<button type="button" data-z="1" aria-label="Afro">+</button>' +
        '<button type="button" data-z="-1" aria-label="Largo">−</button>' +
      '</div>';
    const layer = el.querySelector('.smap-tiles');

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
    }

    function emit() {
      const p = unproject(c.x, c.y, z);
      if (o.onMove) o.onMove({ lat: +p.lat.toFixed(6), lng: +p.lng.toFixed(6) });
    }

    /* Tërheqja: me gisht ose me mi, i njëjti kod. */
    let drag = null;
    const start = (e) => {
      const t = e.touches ? e.touches[0] : e;
      drag = { x: t.clientX, y: t.clientY };
      el.classList.add('grab');
    };
    const move = (e) => {
      if (!drag) return;
      const t = e.touches ? e.touches[0] : e;
      c.x -= (t.clientX - drag.x) / TS;
      c.y -= (t.clientY - drag.y) / TS;
      const n = Math.pow(2, z);
      c.y = Math.max(0, Math.min(n, c.y));
      drag = { x: t.clientX, y: t.clientY };
      draw();
      if (e.cancelable) e.preventDefault();
    };
    const end = () => { if (drag) { drag = null; el.classList.remove('grab'); emit(); } };

    el.addEventListener('mousedown', start);
    el.addEventListener('touchstart', start, { passive: true });
    window.addEventListener('mousemove', move);
    el.addEventListener('touchmove', move, { passive: false });
    window.addEventListener('mouseup', end);
    el.addEventListener('touchend', end);

    el.addEventListener('click', (e) => {
      const b = e.target.closest('[data-z]');
      if (!b) return;
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
      destroy() {
        window.removeEventListener('mousemove', move);
        window.removeEventListener('mouseup', end);
        el.innerHTML = '';
      },
    };
  }

  S.miniMap = miniMap;
})();
