/* ============================================================================
   SPRINT — Vlerësimet nga Google (Places API New).
   Thirrjet bëhen nga shfletuesi me një çelës të kufizuar sipas domain-it.
   Nëse çelësi ose vendi nuk janë vendosur, gjithçka bie te vlerësimet e panelit.

   Google lejon deri në 5 vlerësime për vend dhe i zgjedh vetë. Ato shfaqen
   me emrin e autorit dhe me lidhje drejt Google, siç kërkojnë kushtet e tyre,
   dhe nuk ruhen gjatë — vetëm sa zgjat vizita.
   ========================================================================== */
(function () {
  const S = window.SPRINT;
  const BASE = 'https://places.googleapis.com/v1';
  const CACHE_KEY = 'sprint-google-place';
  const CACHE_MS = 60 * 60 * 1000;      // një orë, brenda së njëjtës vizitë

  const gcfg = () => (S.config && S.config.google) || {};
  const keyOf = (override) => override || gcfg().key ||
    (window.SPRINT_CONFIG && window.SPRINT_CONFIG.GOOGLE_MAPS_KEY) || '';
  const configured = () => !!(keyOf() && gcfg().placeId);

  async function call(path, opts) {
    const r = await fetch(BASE + path, opts);
    const j = await r.json().catch(() => ({}));
    if (!r.ok) {
      const m = (j.error && j.error.message) || (r.status + ' ' + r.statusText);
      throw new Error(m);
    }
    return j;
  }

  /** Kërkon një biznes me emër, që paneli të gjejë vetë kodin e vendit. */
  async function search(query, apiKey) {
    const key = keyOf(apiKey);
    if (!key) throw new Error('Mungon çelësi i Google Maps');
    const j = await call('/places:searchText', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': key,
        'X-Goog-FieldMask': 'places.id,places.displayName,places.formattedAddress,' +
                            'places.rating,places.userRatingCount,places.googleMapsUri',
      },
      body: JSON.stringify({ textQuery: query, languageCode: 'sq', maxResultCount: 8 }),
    });
    return (j.places || []).map((p) => ({
      id: p.id,
      name: (p.displayName && p.displayName.text) || '',
      address: p.formattedAddress || '',
      rating: p.rating || null,
      count: p.userRatingCount || 0,
      mapsUri: p.googleMapsUri || '',
    }));
  }

  /** Detajet e vendit: nota, numri i vlerësimeve, vlerësimet, adresa, orari. */
  async function details(opts) {
    opts = opts || {};
    const key = keyOf(opts.key);
    const id = opts.placeId || gcfg().placeId;
    if (!key || !id) throw new Error('Vendi në Google nuk është zgjedhur ende');

    if (!opts.fresh) {
      try {
        const c = JSON.parse(sessionStorage.getItem(CACHE_KEY) || 'null');
        if (c && c.id === id && Date.now() - c.at < CACHE_MS) return c.data;
      } catch (e) {}
    }

    const lang = (S.getLang && S.getLang()) || 'sq';
    const j = await call('/places/' + encodeURIComponent(id) + '?languageCode=' + lang, {
      headers: {
        'X-Goog-Api-Key': key,
        'X-Goog-FieldMask': 'id,displayName,formattedAddress,location,rating,' +
                            'userRatingCount,googleMapsUri,reviews,regularOpeningHours',
      },
    });

    const data = {
      id: j.id,
      name: (j.displayName && j.displayName.text) || '',
      address: j.formattedAddress || '',
      lat: j.location && j.location.latitude,
      lng: j.location && j.location.longitude,
      rating: j.rating || null,
      count: j.userRatingCount || 0,
      mapsUri: j.googleMapsUri || '',
      hours: (j.regularOpeningHours && j.regularOpeningHours.weekdayDescriptions) || [],
      reviews: (j.reviews || []).map((r) => ({
        text: (r.text && r.text.text) || (r.originalText && r.originalText.text) || '',
        rating: r.rating || 5,
        when: r.relativePublishTimeDescription || '',
        author: (r.authorAttribution && r.authorAttribution.displayName) || '',
        photo: (r.authorAttribution && r.authorAttribution.photoUri) || '',
        uri: r.googleMapsUri || (r.authorAttribution && r.authorAttribution.uri) || '',
      })).filter((r) => r.text),
    };

    try { sessionStorage.setItem(CACHE_KEY, JSON.stringify({ id, at: Date.now(), data })); }
    catch (e) {}
    return data;
  }

  /** Lidhja ku klienti shkruan një vlerësim të ri. */
  const writeUri = (placeId) =>
    'https://search.google.com/local/writereview?placeid=' + encodeURIComponent(placeId || gcfg().placeId || '');

  S.google = { configured, search, details, writeUri };
})();
