/* ============================================================================
   SPRINT — Fast Food & Pizza, Durrës
   TË DHËNAT QENDRORE — ndrysho VETËM këtë skedar për menunë, çmimet, kontaktet.
   Pas çdo ndryshimi: `node build.js` për të rigjeneruar faqet në dist/.

   ⚠️  VLERAT E SHËNUARA ME  // TODO:REAL  JANË SHEMBUJ.
       Zëvendësoji me të dhënat reale të biznesit.
   ========================================================================== */

window.SPRINT = (function () {
  const config = {
    brand: 'SPRINT',
    tagline: { sq: 'Fast Food & Pizza · Restorant', en: 'Fast Food & Pizza · Restaurant' },
    city: 'Durrës',

    // TODO:REAL — numri i vërtetë i telefonit
    phone: '+355 69 000 0000',
    phoneHref: '+35569000000',

    // TODO:REAL — numri i WhatsApp në format ndërkombëtar PA '+' dhe PA hapësira
    whatsapp: '35569000000',

    // TODO:REAL — email ku vjen kopja e rezervimit
    email: 'info@sprintdurres.al',

    // TODO:REAL — adresa e saktë
    address: { sq: 'Rruga Taulantia, Durrës, Shqipëri', en: 'Taulantia Street, Durrës, Albania' },

    // TODO:REAL — koordinatat e sakta për hartën
    geo: { lat: 41.3236, lng: 19.4432 },

    hours: {
      sq: [['E Hënë – E Enjte', '09:00 – 24:00'], ['E Premte – E Shtunë', '09:00 – 02:00'], ['E Diel', '10:00 – 24:00']],
      en: [['Monday – Thursday', '09:00 – 24:00'], ['Friday – Saturday', '09:00 – 02:00'], ['Sunday', '10:00 – 24:00']],
    },

    social: {
      // TODO:REAL — linket e sakta të profileve
      instagram: 'https://www.instagram.com/',
      facebook: 'https://www.facebook.com/',
      tiktok: 'https://www.tiktok.com/',
    },

    currency: 'L',
    deliveryFee: 100,
    freeDeliveryOver: 1500,
  };

  /* --------------------------------------------------------------------------
     KATEGORITË — katër shtyllat e biznesit
     -------------------------------------------------------------------------- */
  const categories = [
    { id: 'pizza',   art: 'pizza',  sq: 'Pizza',        en: 'Pizza',
      dsq: 'Brumë 48 orë, furrë druri, mozzarella fiordilatte.',
      den: '48-hour dough, wood-fired oven, fiordilatte mozzarella.' },
    { id: 'fast',    art: 'burger', sq: 'Fast Food',    en: 'Fast Food',
      dsq: 'Suflaqe, burger dhe krokante — gati për 7 minuta.',
      den: 'Gyros, burgers and crispy classics — ready in 7 minutes.' },
    { id: 'rest',    art: 'steak',  sq: 'Restorant',    en: 'Restaurant',
      dsq: 'Mish në skarë, peshk i freskët, pasta italiane.',
      den: 'Grilled meats, fresh fish, Italian pasta.' },
    { id: 'trad',    art: 'tave',   sq: 'Tradicionale', en: 'Traditional',
      dsq: 'Recetat e gjyshes — tavë kosi, fërgesë, byrek.',
      den: "Grandma's recipes — tavë kosi, fërgesë, byrek." },
    { id: 'dolce',   art: 'dessert',sq: 'Ëmbëlsira & Pije', en: 'Desserts & Drinks',
      dsq: 'Trileçe, bakllava dhe pije të ftohta.',
      den: 'Trileçe, baklava and cold drinks.' },
  ];

  /* --------------------------------------------------------------------------
     MENUJA — TODO:REAL zëvendëso me menunë e vërtetë me çmimet e sakta
     tags: 'hot' (pikante) | 'veg' | 'new' | 'top' (më i shituri)
     -------------------------------------------------------------------------- */
  const menu = [
    // ---- PIZZA ----
    { id:'p1', c:'pizza', art:'pizza', sq:'Margherita', en:'Margherita', p:500,
      dsq:'Salcë domateje San Marzano, mozzarella, borzilok i freskët.',
      den:'San Marzano tomato, mozzarella, fresh basil.', tags:['veg'] },
    { id:'p2', c:'pizza', art:'pizzaC', sq:'Prosciutto e Funghi', en:'Prosciutto e Funghi', p:700,
      dsq:'Proshutë cotto, kërpudha shampinjon, mozzarella.',
      den:'Cooked ham, champignon mushrooms, mozzarella.', tags:[] },
    { id:'p3', c:'pizza', art:'pizzaC', sq:'Capricciosa', en:'Capricciosa', p:750,
      dsq:'Proshutë, kërpudha, ullinj, angjinare, vezë.',
      den:'Ham, mushrooms, olives, artichokes, egg.', tags:['top'] },
    { id:'p4', c:'pizza', art:'pizzaW', sq:'Quattro Formaggi', en:'Four Cheese', p:800,
      dsq:'Mozzarella, gorgonzola, parmixhan, djathë i bardhë vendi.',
      den:'Mozzarella, gorgonzola, parmesan, local white cheese.', tags:['veg'] },
    { id:'p5', c:'pizza', art:'pizza', sq:'Diavola', en:'Diavola', p:750,
      dsq:'Sallam pikant, spec djegës, mozzarella, vaj ulliri.',
      den:'Spicy salami, chilli, mozzarella, olive oil.', tags:['hot'] },
    { id:'p6', c:'pizza', art:'pizzaC', sq:'Sprint Special', en:'Sprint Special', p:900,
      dsq:'Mish viçi, sallam, proshutë, kërpudha, spec, qepë, dopio djathë.',
      den:'Beef, salami, ham, mushrooms, peppers, onion, double cheese.', tags:['top','new'] },
    { id:'p7', c:'pizza', art:'pizzaV', sq:'Vegetariane', en:'Vegetarian', p:650,
      dsq:'Perime sezonale në skarë, mozzarella, rukola.',
      den:'Grilled seasonal vegetables, mozzarella, rocket.', tags:['veg'] },
    { id:'p8', c:'pizza', art:'pizzaV', sq:'Tonno e Cipolla', en:'Tuna & Onion', p:750,
      dsq:'Ton, qepë e kuqe, ullinj të zinj, origano.',
      den:'Tuna, red onion, black olives, oregano.', tags:[] },

    // ---- FAST FOOD ----
    { id:'f1', c:'fast', art:'gyros', sq:'Suflaqe Pule', en:'Chicken Gyros', p:300,
      dsq:'Pulë e marinuar, patate, domate, qepë, salcë e bardhë.',
      den:'Marinated chicken, fries, tomato, onion, white sauce.', tags:['top'] },
    { id:'f2', c:'fast', art:'gyros', sq:'Suflaqe Viçi', en:'Beef Gyros', p:350,
      dsq:'Viç në gyros, patate, perime të freskëta, salcë e shtëpisë.',
      den:'Beef gyros, fries, fresh vegetables, house sauce.', tags:[] },
    { id:'f3', c:'fast', art:'burger', sq:'Hamburger', en:'Hamburger', p:350,
      dsq:'Kotoletë viçi 150g, sallatë, domate, qepë, turshi.',
      den:'150g beef patty, lettuce, tomato, onion, pickles.', tags:[] },
    { id:'f4', c:'fast', art:'burger', sq:'Cheeseburger', en:'Cheeseburger', p:400,
      dsq:'Kotoletë viçi, çedar i shkrirë, salcë Sprint.',
      den:'Beef patty, melted cheddar, Sprint sauce.', tags:[] },
    { id:'f5', c:'fast', art:'burger', sq:'Sprint Burger XL', en:'Sprint Burger XL', p:600,
      dsq:'Dopio kotoletë 300g, dopio çedar, bacon, qepë e karamelizuar.',
      den:'Double 300g patty, double cheddar, bacon, caramelised onion.', tags:['top','new'] },
    { id:'f6', c:'fast', art:'gyros', sq:'Kebab në Pite', en:'Kebab in Pita', p:400,
      dsq:'Kebab i bërë në shtëpi, pite e ngrohtë, salcë kosi.',
      den:'House-made kebab, warm pita, yoghurt sauce.', tags:[] },
    { id:'f7', c:'fast', art:'fries', sq:'Patate të Skuqura', en:'French Fries', p:200,
      dsq:'Patate të freskëta, kripë deti, rozmarinë.',
      den:'Fresh-cut potatoes, sea salt, rosemary.', tags:['veg'] },
    { id:'f8', c:'fast', art:'wings', sq:'Krahë Pule Pikant', en:'Spicy Chicken Wings', p:500,
      dsq:'8 copë krahë në salcë buffalo, me salcë blu.',
      den:'8 wings in buffalo sauce, with blue cheese dip.', tags:['hot'] },
    { id:'f9', c:'fast', art:'wings', sq:'Crispy Strips', en:'Crispy Strips', p:550,
      dsq:'Fileto pule krokante, patate, dy salca për zgjedhje.',
      den:'Crispy chicken fillets, fries, two dips of choice.', tags:[] },

    // ---- RESTORANT ----
    { id:'r1', c:'rest', art:'steak', sq:'Biftek Viçi me Salcë Kërpudhash', en:'Beef Steak, Mushroom Sauce', p:1200,
      dsq:'Biftek 300g, salcë kremi me kërpudha, patate rustike.',
      den:'300g steak, creamy mushroom sauce, rustic potatoes.', tags:['top'] },
    { id:'r2', c:'rest', art:'steak', sq:'Fileto Pule në Zjarr', en:'Flame-Grilled Chicken Fillet', p:800,
      dsq:'Fileto pule e marinuar, perime në skarë, limon.',
      den:'Marinated chicken fillet, grilled vegetables, lemon.', tags:[] },
    { id:'r3', c:'rest', art:'fish', sq:'Koce e Freskët në Skarë', en:'Grilled Sea Bream', p:1500,
      dsq:'Peshk i ditës nga Adriatiku, vaj ulliri, hudhër, majdanoz.',
      den:'Catch of the day from the Adriatic, olive oil, garlic, parsley.', tags:['top'] },
    { id:'r4', c:'rest', art:'pasta', sq:'Spageti Carbonara', en:'Spaghetti Carbonara', p:600,
      dsq:'Guanciale, veza, pecorino romano, piper i zi.',
      den:'Guanciale, egg, pecorino romano, black pepper.', tags:[] },
    { id:'r5', c:'rest', art:'pasta', sq:'Penne Arrabiata', en:'Penne Arrabbiata', p:550,
      dsq:'Domate e freskët, hudhër, spec djegës, borzilok.',
      den:'Fresh tomato, garlic, chilli, basil.', tags:['hot','veg'] },
    { id:'r6', c:'rest', art:'pasta', sq:'Rizoto me Fruta Deti', en:'Seafood Risotto', p:900,
      dsq:'Oriz carnaroli, midhje, karkaleca, kalamar, verë e bardhë.',
      den:'Carnaroli rice, mussels, prawns, squid, white wine.', tags:[] },
    { id:'r7', c:'rest', art:'salad', sq:'Sallatë Caesar', en:'Caesar Salad', p:550,
      dsq:'Marule, pulë në skarë, krutona, parmixhan, salcë Caesar.',
      den:'Romaine, grilled chicken, croutons, parmesan, Caesar dressing.', tags:[] },
    { id:'r8', c:'rest', art:'salad', sq:'Sallatë Greke', en:'Greek Salad', p:450,
      dsq:'Domate, kastravec, feta, ullinj kalamata, origano.',
      den:'Tomato, cucumber, feta, kalamata olives, oregano.', tags:['veg'] },

    // ---- TRADICIONALE ----
    { id:'t1', c:'trad', art:'tave', sq:'Tavë Kosi', en:'Tavë Kosi (Baked Lamb & Yoghurt)', p:700,
      dsq:'Mish qengji, kos i trashë, oriz, vezë — pjekur në tavë balte.',
      den:'Lamb, thick yoghurt, rice, egg — baked in a clay dish.', tags:['top'] },
    { id:'t2', c:'trad', art:'tave', sq:'Fërgesë Tirane', en:'Fërgesë Tirane', p:650,
      dsq:'Spec i pjekur, domate, gjizë, mish viçi — në tigan balte.',
      den:'Roasted peppers, tomato, curd cheese, beef — in a clay pan.', tags:['top'] },
    { id:'t3', c:'trad', art:'byrek', sq:'Byrek me Spinaq', en:'Spinach Byrek', p:200,
      dsq:'Petë e hapur me dorë, spinaq, gjizë vendi.',
      den:'Hand-rolled filo, spinach, local curd cheese.', tags:['veg'] },
    { id:'t4', c:'trad', art:'tave', sq:'Qofte të Fërguara', en:'Fried Meatballs', p:550,
      dsq:'Qofte viçi me mendër, qepë dhe erëza tradicionale.',
      den:'Beef meatballs with mint, onion and traditional spices.', tags:[] },
    { id:'t5', c:'trad', art:'tave', sq:'Japrak me Gjethe Rrushi', en:'Stuffed Vine Leaves', p:600,
      dsq:'Gjethe rrushi të mbushura me oriz e mish, salcë kosi.',
      den:'Vine leaves stuffed with rice and meat, yoghurt sauce.', tags:[] },
    { id:'t6', c:'trad', art:'tave', sq:'Speca me Gjizë', en:'Peppers with Curd Cheese', p:500,
      dsq:'Speca të pjekur të mbushur me gjizë vendi dhe vezë.',
      den:'Roasted peppers stuffed with local curd cheese and egg.', tags:['veg'] },
    { id:'t7', c:'trad', art:'byrek', sq:'Pite me Mish', en:'Meat Pie', p:350,
      dsq:'Petë shtëpie, mish viçi i grirë, qepë.',
      den:'Homemade filo, minced beef, onion.', tags:[] },
    { id:'t8', c:'trad', art:'fish', sq:'Supë Peshku', en:'Fish Soup', p:700,
      dsq:'Peshk i Adriatikut, perime, limon — receta e bregdetit.',
      den:'Adriatic fish, vegetables, lemon — a coastal recipe.', tags:[] },

    // ---- ËMBËLSIRA & PIJE ----
    { id:'d1', c:'dolce', art:'dessert', sq:'Trileçe', en:'Trileçe', p:300,
      dsq:'Tre qumështrat, karamel i bërë në shtëpi.',
      den:'Three-milk cake with homemade caramel.', tags:['top','veg'] },
    { id:'d2', c:'dolce', art:'dessert', sq:'Tiramisu', en:'Tiramisu', p:350,
      dsq:'Mascarpone, savoiardi, kafe espresso, kakao.',
      den:'Mascarpone, savoiardi, espresso, cocoa.', tags:['veg'] },
    { id:'d3', c:'dolce', art:'dessert', sq:'Bakllava', en:'Baklava', p:250,
      dsq:'Petë të holla, arra, sherbet mjalti.',
      den:'Thin filo, walnuts, honey syrup.', tags:['veg'] },
    { id:'d4', c:'dolce', art:'drink', sq:'Coca-Cola 0.33L', en:'Coca-Cola 0.33L', p:150,
      dsq:'E ftohtë akull.', den:'Ice cold.', tags:['veg'] },
    { id:'d5', c:'dolce', art:'drink', sq:'Ujë 0.5L', en:'Water 0.5L', p:100,
      dsq:'Ujë natyral i pijshëm.', den:'Still natural water.', tags:['veg'] },
    { id:'d6', c:'dolce', art:'drink', sq:'Birrë Korça 0.33L', en:'Korça Beer 0.33L', p:250,
      dsq:'Birra klasike shqiptare.', den:'The classic Albanian lager.', tags:['veg'] },
    { id:'d7', c:'dolce', art:'drink', sq:'Espresso', en:'Espresso', p:100,
      dsq:'Kafe italiane, e pjekur çdo javë.', den:'Italian coffee, roasted weekly.', tags:['veg'] },
  ];

  /* --------------------------------------------------------------------------
     REVIEW — TODO:REAL zëvendëso me review reale nga Google / Facebook
     -------------------------------------------------------------------------- */
  const reviews = [
    { n:'Erisa M.',   s:5, src:'Google',   sq:'Pica më e mirë në Durrës, pa diskutim. Brumi i lehtë dhe shërbimi super i shpejtë.', en:'Best pizza in Durrës, no question. Light dough and lightning-fast service.' },
    { n:'Andi K.',    s:5, src:'Google',   sq:'Tava e kosit si te gjyshja. Erdha për suflaqe, u ktheva për restorantin.', en:'Tavë kosi just like grandma made. Came for the gyros, stayed for the restaurant.' },
    { n:'Marco R.',   s:5, src:'Facebook', sq:'Vendi ku ha çdo herë që zbres nga trageti. Cilësi italiane, çmim shqiptar.', en:'My first stop every time I get off the ferry. Italian quality, Albanian prices.' },
    { n:'Fatjona B.', s:5, src:'Google',   sq:'Porosita në WhatsApp dhe erdhi për 20 minuta, akoma e nxehtë. Sprint Burger XL është bombë.', en:'Ordered on WhatsApp, arrived in 20 minutes still hot. The Sprint Burger XL is unreal.' },
    { n:'Klodian S.', s:5, src:'Google',   sq:'Fërgesa dhe koca në skarë — nivel restoranti, me çmim fast food.', en:'Fërgesë and grilled sea bream — restaurant level at fast-food prices.' },
    { n:'Anna P.',    s:5, src:'Facebook', sq:'Ambient i pastër, stafi shumë i sjellshëm, porcione bujare. E rekomandoj!', en:'Clean space, very friendly staff, generous portions. Highly recommend!' },
  ];

  const stats = [
    { v:'12+',  sq:'Vite përvojë',       en:'Years of experience' },
    { v:'40+',  sq:'Pjata në menu',       en:'Dishes on the menu' },
    { v:'4.8',  sq:'Vlerësimi mesatar',   en:'Average rating' },
    { v:'25\'', sq:'Dërgesë mesatare',    en:'Average delivery' },
  ];

  /* --------------------------------------------------------------------------
     PËRKTHIMET
     -------------------------------------------------------------------------- */
  const t = {
    nav_home:     { sq:'Kreu',        en:'Home' },
    nav_menu:     { sq:'Menuja',      en:'Menu' },
    nav_about:    { sq:'Rreth Nesh',  en:'About' },
    nav_reviews:  { sq:'Vlerësime',   en:'Reviews' },
    nav_contact:  { sq:'Kontakt',     en:'Contact' },
    nav_book:     { sq:'Rezervo',     en:'Book' },

    hero_kicker:  { sq:'Durrës · Që nga 2013', en:'Durrës · Since 2013' },
    hero_t1:      { sq:'Shija që',    en:'Flavour that' },
    hero_t2:      { sq:'nuk pret',    en:"won't wait" },
    hero_sub:     { sq:'Pizza në furrë druri, fast food i porsabërë dhe gatime tradicionale shqiptare — të gjitha nën një çati, në zemër të Durrësit.',
                    en:'Wood-fired pizza, made-to-order fast food and traditional Albanian cooking — all under one roof, in the heart of Durrës.' },
    cta_order:    { sq:'Porosit në WhatsApp', en:'Order on WhatsApp' },
    cta_menu:     { sq:'Shiko Menunë',  en:'Explore the Menu' },
    cta_call:     { sq:'Telefono Tani', en:'Call Now' },
    cta_book:     { sq:'Rezervo Tavolinë', en:'Book a Table' },

    menu_kicker:  { sq:'Menuja Interaktive', en:'Interactive Menu' },
    menu_title:   { sq:'Zgjidh. Shto. Dërgo.', en:'Pick. Add. Send.' },
    menu_sub:     { sq:'Ndërto porosinë tënde dhe dërgoje me një klikim në WhatsApp — pa aplikacione, pa regjistrim.',
                    en:'Build your order and send it to WhatsApp in one tap — no apps, no sign-up.' },
    menu_all:     { sq:'Të gjitha',   en:'All' },
    search_ph:    { sq:'Kërko pjatë…', en:'Search a dish…' },
    add:          { sq:'Shto',        en:'Add' },
    added:        { sq:'U shtua ✓',   en:'Added ✓' },
    empty:        { sq:'Asnjë pjatë nuk përputhet me kërkimin.', en:'No dishes match your search.' },

    cart_title:   { sq:'Porosia jote', en:'Your order' },
    cart_empty:   { sq:'Shporta është bosh. Shto diçka të shijshme!', en:'Your cart is empty. Add something delicious!' },
    cart_sub:     { sq:'Nëntotali',   en:'Subtotal' },
    cart_del:     { sq:'Dërgesa',     en:'Delivery' },
    cart_free:    { sq:'FALAS',       en:'FREE' },
    cart_total:   { sq:'Totali',      en:'Total' },
    cart_send:    { sq:'Dërgo porosinë në WhatsApp', en:'Send order on WhatsApp' },
    cart_note:    { sq:'Do të hapet WhatsApp me porosinë të gatshme. Ti shtyp vetëm «Dërgo».',
                    en:'WhatsApp opens with your order pre-filled. You just hit «Send».' },
    cart_clear:   { sq:'Pastro',      en:'Clear' },

    about_kicker: { sq:'Historia jonë', en:'Our story' },
    about_title:  { sq:'Katër kuzhina. Një pasion.', en:'Four kitchens. One passion.' },
    about_body:   { sq:'Sprint nisi si një dritare e vogël suflaqesh pranë bregut të Durrësit. Sot është furrë druri, skarë restoranti dhe kuzhinë tradicionale në të njëjtën ndërtesë — sepse besojmë se një darkë e mirë nuk duhet të të detyrojë të zgjedhësh.',
                    en:'Sprint began as a small gyros window near the Durrës seafront. Today it is a wood-fired oven, a restaurant grill and a traditional kitchen in the same building — because a good dinner should never force you to choose.' },

    rev_kicker:   { sq:'Çfarë thonë klientët', en:'What guests say' },
    rev_title:    { sq:'4.8 nga 5 yje',  en:'4.8 out of 5 stars' },

    book_kicker:  { sq:'Rezervim', en:'Reservation' },
    book_title:   { sq:'Rezervo tavolinën tënde', en:'Reserve your table' },
    book_sub:     { sq:'Plotëso formularin — njoftimi vjen direkt në WhatsApp-in tonë dhe konfirmohet brenda pak minutash.',
                    en:'Fill in the form — the request lands straight in our WhatsApp and is confirmed within minutes.' },
    f_name:       { sq:'Emri dhe mbiemri', en:'Full name' },
    f_phone:      { sq:'Numri i telefonit', en:'Phone number' },
    f_date:       { sq:'Data',        en:'Date' },
    f_time:       { sq:'Ora',         en:'Time' },
    f_people:     { sq:'Persona',     en:'Guests' },
    f_area:       { sq:'Ambienti',    en:'Seating' },
    f_area_in:    { sq:'Brenda',      en:'Indoor' },
    f_area_out:   { sq:'Jashtë (terracë)', en:'Outdoor (terrace)' },
    f_area_any:   { sq:'S\'ka rëndësi', en:'No preference' },
    f_note:       { sq:'Shënim (ditëlindje, alergji, karrige fëmijësh…)', en:'Note (birthday, allergies, high chair…)' },
    f_send:       { sq:'Dërgo rezervimin në WhatsApp', en:'Send reservation on WhatsApp' },
    f_email:      { sq:'Dërgo edhe me email', en:'Send by email too' },
    f_req:        { sq:'Plotëso emrin, telefonin dhe datën.', en:'Please fill in name, phone and date.' },

    ct_kicker:    { sq:'Na gjeni',    en:'Find us' },
    ct_title:     { sq:'Jemi këtu, në Durrës', en:'We are here, in Durrës' },
    ct_hours:     { sq:'Orari',       en:'Opening hours' },
    ct_addr:      { sq:'Adresa',      en:'Address' },
    ct_phone:     { sq:'Telefoni',    en:'Phone' },
    ct_map:       { sq:'Hape në Google Maps', en:'Open in Google Maps' },

    foot_rights:  { sq:'Të gjitha të drejtat e rezervuara.', en:'All rights reserved.' },
    scroll:       { sq:'Zbrit',       en:'Scroll' },
    b_delivery:   { sq:'Dërgesë',     en:'Delivery' },
    b_dishes:     { sq:'Pjata',       en:'Dishes' },
    b_rating:     { sq:'Vlerësim',    en:'Rating' },
    lang_label:   { sq:'EN',          en:'SQ' },
  };

  /* --------------------------------------------------------------------------
     NDIHMËSA
     -------------------------------------------------------------------------- */
  let lang = 'sq';
  const setLang = (l) => { lang = l; };
  const getLang = () => lang;
  const T  = (k) => (t[k] ? t[k][lang] : k);
  const L  = (o, base) => o[base + (lang === 'sq' ? 'sq' : 'en')] ?? o[lang] ?? '';
  const money = (n) => n.toLocaleString('sq-AL') + ' ' + config.currency;

  const waLink = (text) => 'https://wa.me/' + config.whatsapp + '?text=' + encodeURIComponent(text);
  const mailLink = (subject, body) =>
    'mailto:' + config.email + '?subject=' + encodeURIComponent(subject) + '&body=' + encodeURIComponent(body);
  const mapLink = () =>
    'https://www.google.com/maps/search/?api=1&query=' + config.geo.lat + ',' + config.geo.lng;

  return { config, categories, menu, reviews, stats, t, T, L, setLang, getLang, money, waLink, mailLink, mapLink };
})();
