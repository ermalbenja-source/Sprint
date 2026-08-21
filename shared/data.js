/* ============================================================================
   SPRINT — Fast Food & Pizza · Restaurant, Durrës
   TË DHËNAT QENDRORE — ndrysho VETËM këtë skedar për menunë, çmimet, kontaktet.
   Pas çdo ndryshimi: `node build.js` për të rigjeneruar faqet në dist/.

   MENUJA DHE ÇMIMET janë transkriptuar nga menuja zyrtare e postuar në
   Instagram (@sprint_restorant_fast_pizza).
   Fushat e shënuara me  // TODO:REAL  presin ende konfirmim.
   Përshkrimet e pjatave janë tekst i propozuar — konfirmoji ose ndryshoji.
   ========================================================================== */

window.SPRINT = (function () {
  const config = {
    brand: 'SPRINT',
    tagline: { sq: 'Fast Food & Pizza · Restorant', en: 'Fast Food & Pizza · Restaurant' },
    city: 'Durrës',

    phone: '069 666 7000',
    phoneHref: '+355696667000',
    whatsapp: '355696667000',

    // TODO:REAL — email ku do të vijë kopja e rezervimit
    email: '',

    // TODO:REAL — adresa e saktë e lokalit
    address: { sq: 'Durrës, Shqipëri', en: 'Durrës, Albania' },

    // TODO:REAL — koordinatat e sakta (Google Maps → Share → kopjo koordinatat)
    geo: { lat: 41.3236, lng: 19.4432 },

    hours: {
      // TODO:REAL — konfirmo orarin e hapjes dhe të mbylljes
      sq: [['Çdo ditë', '09:00 – 23:00'], ['Gatime tradicionale', '09:00 – 15:00'], ['Delivery', 'Pyet në WhatsApp']],
      en: [['Every day', '09:00 – 23:00'], ['Traditional dishes', '09:00 – 15:00'], ['Delivery', 'Ask on WhatsApp']],
    },

    social: {
      instagram: 'https://www.instagram.com/sprint_restorant_fast_pizza/',
      facebook: '',   // TODO:REAL — linku i faqes në Facebook, nëse ka
      tiktok: '',     // TODO:REAL — linku i profilit në TikTok, nëse ka
    },

    // Salla e eventeve — nga postimi «Për çdo event tuaj jemi pranë jush!»
    events: {
      sq: 'Salla jonë pritëse është e hapur për ditëlindje, darka pune dhe festa familjare.',
      en: 'Our function room hosts birthdays, business dinners and family celebrations.',
    },

    // Vlerësimet nga Google — plotësohen nga paneli, skeda «Cilësimet».
    google: {
      enabled: true,
      key: '',        // çelës i Google Maps, i kufizuar sipas domain-it
      placeId: '',    // gjendet vetë nga paneli me butonin «Gjej biznesin»
      mapsUri: '',    // lidhja e faqes në Google Maps
    },

    currency: 'L',
    // deliveryFee: null → shporta shfaq «Sipas zonës» në vend të një shifre të pasaktë.
    deliveryFee: null,          // TODO:REAL — vendos shifrën kur ta konfirmosh tarifën
    freeDeliveryOver: null,
  };

  /* --------------------------------------------------------------------------
     KATEGORITË — gjashtë shtyllat, sipas menusë zyrtare
     -------------------------------------------------------------------------- */
  const categories = [
    { id:'pizza', art:'pizza', sq:'Pizza', en:'Pizza',
      dsq:'Nga Margarita te Pica Sprint — pesëmbëdhjetë pica dhe fokaçe.',
      den:'From the Margherita to the Pizza Sprint — fifteen pizzas and focaccias.' },
    { id:'fast', art:'gyros', sq:'Fast Food', en:'Fast Food',
      dsq:'Sufllaqe, doner, burger dhe sanduiçë me brumë pice.',
      den:'Gyros, doner, burgers and pizza-dough sandwiches.' },
    { id:'rest', art:'steak', sq:'Restorant', en:'Restaurant',
      dsq:'Pasta, rizoto, mish në zgarë dhe peshk i freskët.',
      den:'Pasta, risotto, grilled meats and fresh fish.' },
    { id:'trad', art:'tave', sq:'Tradicionale', en:'Traditional',
      dsq:'Tavat dhe gatimet e ditës — çdo ditë nga 09:00 deri 15:00.',
      den:'Clay-pot bakes and dishes of the day — daily from 09:00 to 15:00.' },
    { id:'starter', art:'salad', sq:'Sallata & Supa', en:'Salads & Soups',
      dsq:'Sallata të freskëta, supa dhe shoqëruese për tavolinën.',
      den:'Fresh salads, soups and sides for the table.' },
    { id:'pije', art:'drink', sq:'Pije', en:'Drinks',
      dsq:'Kafe, pije freskuese, birra dhe verë.',
      den:'Coffee, soft drinks, beer and wine.' },
  ];

  /* --------------------------------------------------------------------------
     MENUJA — transkriptuar nga menuja zyrtare
     tags: 'hot' (pikante) · 'veg' · 'new' · 'top' (i spikatur)
     unit: teksti pas çmimit, p.sh. '/copë'
     note: shënim i vogël mbi pjatën, p.sh. orari
     -------------------------------------------------------------------------- */
  const menu = [
    /* ─────────────── PIZZA ─────────────── */
    { id:'pz01', c:'pizza', art:'pizzaW', sq:'Fokaçe', en:'Focaccia', p:150,
      dsq:'Bukë pice e ngrohtë me vaj ulliri.', den:'Warm pizza bread with olive oil.', tags:['veg'] },
    { id:'pz02', c:'pizza', art:'pizzaW', sq:'Fokaçe Bruskete', en:'Bruschetta Focaccia', p:250,
      dsq:'Fokaçe me domate të freskëta dhe hudhër.', den:'Focaccia with fresh tomato and garlic.', tags:['veg'] },
    { id:'pz03', c:'pizza', art:'pizza', sq:'Pica Margarita', en:'Pizza Margherita', p:320,
      dsq:'Salcë domateje dhe djathë — klasikja.', den:'Tomato sauce and cheese — the classic.', tags:['veg'] },
    { id:'pz04', c:'pizza', art:'pizzaC', sq:'Pica me Proshutë Viçi', en:'Beef Ham Pizza', p:370,
      dsq:'Proshutë viçi mbi bazën e shtëpisë.', den:'Beef ham on the house base.', tags:[] },
    { id:'pz05', c:'pizza', art:'pizzaW', sq:'Pica 4 Djathërat', en:'Four Cheese Pizza', p:480,
      dsq:'Katër djathëra të shkrirë.', den:'Four melted cheeses.', tags:['veg'] },
    { id:'pz06', c:'pizza', art:'pizzaV', sq:'Pica Vegjetariane', en:'Vegetarian Pizza', p:400,
      dsq:'Perime sezonale mbi salcë domateje dhe djathë.', den:'Seasonal vegetables on tomato and cheese.', tags:['veg'] },
    { id:'pz07', c:'pizza', art:'pizzaC', sq:'Pica Delicioza', en:'Pizza Deliziosa', p:580,
      dsq:'Përbërës të pasur — pyet kamarierin për sot.', den:'A rich topping — ask the waiter about today’s.', tags:[] },
    { id:'pz08', c:'pizza', art:'pizzaC', sq:'Pica Kapriçoza', en:'Pizza Capricciosa', p:480,
      dsq:'Proshutë, kërpudha dhe ullinj.', den:'Ham, mushrooms and olives.', tags:['top'] },
    { id:'pz09', c:'pizza', art:'pizza', sq:'Pica Diavola', en:'Pizza Diavola', p:480,
      dsq:'Sallam pikant dhe spec djegës.', den:'Spicy salami and chilli.', tags:['hot'] },
    { id:'pz10', c:'pizza', art:'pizzaV', sq:'Pica me Ton & Qepë', en:'Tuna & Onion Pizza', p:450,
      dsq:'Ton dhe qepë e freskët.', den:'Tuna and fresh onion.', tags:[] },
    { id:'pz11', c:'pizza', art:'pizzaC', sq:'Pica Milano', en:'Pizza Milano', p:480,
      dsq:'Kombinim italian me sallam dhe djathë.', den:'An Italian combination of salami and cheese.', tags:[] },
    { id:'pz12', c:'pizza', art:'pizzaC', sq:'Pica Amerikane', en:'American Pizza', p:470,
      dsq:'Sallam, wudy dhe djathë i bollshëm.', den:'Salami, frankfurter and plenty of cheese.', tags:[] },
    { id:'pz13', c:'pizza', art:'pizzaC', sq:'Pica 4 Stinët', en:'Four Seasons Pizza', p:500,
      dsq:'Katër çerekë, katër shije.', den:'Four quarters, four toppings.', tags:[] },
    { id:'pz14', c:'pizza', art:'pizzaC', sq:'Pica me Fileto Pule', en:'Chicken Fillet Pizza', p:480,
      dsq:'Fileto pule në copa mbi djathë.', den:'Chicken fillet strips over cheese.', tags:[] },
    { id:'pz15', c:'pizza', art:'pizzaC', sq:'Pica Sprint', en:'Pizza Sprint', p:680,
      dsq:'Specialiteti i shtëpisë — pica jonë më e plotë.', den:'The house speciality — our most loaded pizza.', tags:['top','new'] },

    /* ─────────────── FAST FOOD ─────────────── */
    { id:'ff01', c:'fast', art:'gyros', sq:'Sufllaqe', en:'Gyros', p:250,
      dsq:'Pita e mbushur me mish, patate dhe salcë.', den:'Pita filled with meat, fries and sauce.', tags:['top'] },
    { id:'ff02', c:'fast', art:'gyros', sq:'Sufllaqe Dopio Pitë', en:'Double-Pita Gyros', p:280,
      dsq:'E njëjta sufllaqe, me dy pita.', den:'The same gyros, with two pitas.', tags:[] },
    { id:'ff03', c:'fast', art:'gyros', sq:'Sufllaqe Wudy', en:'Frankfurter Gyros', p:250,
      dsq:'Sufllaqe me wudy dhe patate.', den:'Gyros with frankfurter and fries.', tags:[] },
    { id:'ff04', c:'fast', art:'gyros', sq:'Sufllaqe e Hapur', en:'Open Gyros', p:450,
      dsq:'Në pjatë, me porcion të plotë mishi.', den:'On a plate, with a full portion of meat.', tags:[] },
    { id:'ff05', c:'fast', art:'gyros', sq:'Doner', en:'Doner', p:250,
      dsq:'Doner i prerë nga hosti, në pitë.', den:'Doner carved from the spit, in pita.', tags:[] },
    { id:'ff06', c:'fast', art:'gyros', sq:'Doner me Brumë Pice', en:'Doner in Pizza Dough', p:320,
      dsq:'Doner i mbështjellë në brumë pice.', den:'Doner wrapped in pizza dough.', tags:[] },
    { id:'ff07', c:'fast', art:'sandwich', sq:'Hot Dog', en:'Hot Dog', p:250,
      dsq:'Wudy në bukë të gjatë me salca.', den:'Frankfurter in a long roll with sauces.', tags:[] },
    { id:'ff08', c:'fast', art:'sandwich', sq:'Sanduiç', en:'Sandwich', p:200,
      dsq:'Sanduiçi klasik i shtëpisë.', den:'The classic house sandwich.', tags:[] },
    { id:'ff09', c:'fast', art:'burger', sq:'Hamburger Tradicional', en:'Traditional Hamburger', p:200,
      dsq:'Kotoletë, perime të freskëta dhe salcë.', den:'Patty, fresh vegetables and sauce.', tags:['top'] },
    { id:'ff10', c:'fast', art:'sandwich', sq:'Tost', en:'Toastie', p:120,
      dsq:'Tost i ngrohtë me djathë dhe proshutë.', den:'Warm toastie with cheese and ham.', tags:[] },
    { id:'ff11', c:'fast', art:'sandwich', sq:'Club Sanduiç', en:'Club Sandwich', p:300,
      dsq:'Tre kate, me pulë dhe perime.', den:'Three layers, with chicken and vegetables.', tags:[] },
    { id:'ff12', c:'fast', art:'wings', sq:'Chicken Fingers', en:'Chicken Fingers', p:250,
      dsq:'Fileto pule krokante.', den:'Crispy chicken fillet strips.', tags:[] },
    { id:'ff13', c:'fast', art:'wings', sq:'Chicken Nuggets', en:'Chicken Nuggets', p:250,
      dsq:'Nagets pule me salcë për zgjedhje.', den:'Chicken nuggets with a dip of your choice.', tags:[] },
    { id:'ff14', c:'fast', art:'steak', sq:'Shishqebap Pule', en:'Chicken Skewer', p:120, unit:'/copë',
      dsq:'Hell pule në zgarë.', den:'Chicken skewer off the grill.', tags:[] },
    { id:'ff15', c:'fast', art:'steak', sq:'Shishqebap Derri', en:'Pork Skewer', p:100, unit:'/copë',
      dsq:'Hell derri në zgarë.', den:'Pork skewer off the grill.', tags:[] },
    { id:'ff16', c:'fast', art:'steak', sq:'Llukank Derri', en:'Pork Sausage', p:100, unit:'/copë',
      dsq:'Llukanka vendi në zgarë.', den:'Local sausage off the grill.', tags:[] },
    { id:'ff17', c:'fast', art:'steak', sq:'Mikse Mishi', en:'Mixed Grill', p:1200,
      dsq:'Pjatë e madhe me mishra të ndryshëm — për ta ndarë.', den:'A large platter of assorted grilled meats — made to share.', tags:['top'] },

    /* ─────────────── PICERI · sanduiçë me brumë pice ─────────────── */
    { id:'sp01', c:'fast', art:'sandwich', sq:'Sanduiç me Sallam', en:'Salami Sandwich', p:250,
      dsq:'Me brumë pice, i pjekur në furrë.', den:'In pizza dough, baked in the oven.', tags:[] },
    { id:'sp02', c:'fast', art:'sandwich', sq:'Sanduiç Pikant', en:'Spicy Sandwich', p:250,
      dsq:'Me brumë pice dhe sallam pikant.', den:'In pizza dough with spicy salami.', tags:['hot'] },
    { id:'sp03', c:'fast', art:'sandwich', sq:'Sanduiç me Proshutë Viçi', en:'Beef Ham Sandwich', p:250,
      dsq:'Me brumë pice dhe proshutë viçi.', den:'In pizza dough with beef ham.', tags:[] },
    { id:'sp04', c:'fast', art:'sandwich', sq:'Sanduiç me Wudy', en:'Frankfurter Sandwich', p:250,
      dsq:'Me brumë pice dhe wudy.', den:'In pizza dough with frankfurter.', tags:[] },
    { id:'sp05', c:'fast', art:'sandwich', sq:'Sanduiç me Ton', en:'Tuna Sandwich', p:250,
      dsq:'Me brumë pice dhe ton.', den:'In pizza dough with tuna.', tags:[] },
    { id:'sp06', c:'fast', art:'sandwich', sq:'Sanduiç me Ton & Sallam Pikant', en:'Tuna & Spicy Salami Sandwich', p:300,
      dsq:'Ton dhe sallam pikant në brumë pice.', den:'Tuna and spicy salami in pizza dough.', tags:['hot'] },
    { id:'sp07', c:'fast', art:'sandwich', sq:'Sanduiç Fshati', en:'Village Sandwich', p:250,
      dsq:'Me produkte vendi.', den:'Made with local produce.', tags:[] },
    { id:'sp08', c:'fast', art:'sandwich', sq:'Sanduiç Miks', en:'Mixed Sandwich', p:300,
      dsq:'Kombinimi ynë i plotë në brumë pice.', den:'Our full combination in pizza dough.', tags:[] },
    { id:'sp09', c:'fast', art:'sandwich', sq:'Sanduiç Vegjetarian', en:'Vegetarian Sandwich', p:220,
      dsq:'Vetëm perime dhe djathë.', den:'Vegetables and cheese only.', tags:['veg'] },
    { id:'sp10', c:'fast', art:'sandwich', sq:'Sanduiç me Proshutë & Kërpudha', en:'Ham & Mushroom Sandwich', p:250,
      dsq:'Proshutë dhe kërpudha në brumë pice.', den:'Ham and mushrooms in pizza dough.', tags:[] },
    { id:'sp11', c:'fast', art:'sandwich', sq:'Sanduiç Pikant & Kërpudha', en:'Spicy & Mushroom Sandwich', p:250,
      dsq:'Sallam pikant dhe kërpudha.', den:'Spicy salami and mushrooms.', tags:['hot'] },

    /* ─────────────── RESTORANT · pasta dhe rizoto ─────────────── */
    { id:'pa01', c:'rest', art:'pasta', sq:'Linguini me Fruta Deti', en:'Seafood Linguine', p:600,
      dsq:'Fruta deti të freskëta mbi linguini.', den:'Fresh seafood over linguine.', tags:['top'] },
    { id:'pa02', c:'rest', art:'pasta', sq:'Linguini me Pomodorini & Karkaleca', en:'Linguine, Cherry Tomato & Prawns', p:600,
      dsq:'Karkaleca dhe domate qershi.', den:'Prawns and cherry tomatoes.', tags:[] },
    { id:'pa03', c:'rest', art:'pasta', sq:'Linguini Bolognese', en:'Linguine Bolognese', p:350,
      dsq:'Salcë mishi e zier gjatë.', den:'Slow-cooked meat sauce.', tags:[] },
    { id:'pa04', c:'rest', art:'pasta', sq:'Linguini me Salcë ose Gjalpë', en:'Linguine with Sauce or Butter', p:250,
      dsq:'E thjeshtë, sipas dëshirës.', den:'Simple, however you like it.', tags:['veg'] },
    { id:'pa05', c:'rest', art:'pasta', sq:'Pene me Pana & Proshutë', en:'Penne with Cream & Ham', p:350,
      dsq:'Krem i lehtë dhe proshutë.', den:'Light cream and ham.', tags:[] },
    { id:'pa06', c:'rest', art:'pasta', sq:'Rizoto me Fruta Deti', en:'Seafood Risotto', p:600,
      dsq:'Oriz i gatuar me fruta deti.', den:'Rice cooked with seafood.', tags:[] },
    { id:'pa07', c:'rest', art:'pasta', sq:'Rizoto me Kungull & Karkaleca', en:'Courgette & Prawn Risotto', p:600,
      dsq:'Kungull i njomë dhe karkaleca.', den:'Courgette and prawns.', tags:[] },

    /* ─────────────── RESTORANT · pjata kryesore ─────────────── */
    { id:'pk01', c:'rest', art:'steak', sq:'Fileto Pule me Garniturë', en:'Chicken Fillet with Garnish', p:500,
      dsq:'Fileto pule me garniturë sezonale.', den:'Chicken fillet with a seasonal garnish.', tags:[] },
    { id:'pk02', c:'rest', art:'steak', sq:'Fileto Pule me Pana & Kërpudha', en:'Chicken Fillet, Cream & Mushrooms', p:600,
      dsq:'Salcë kremi me kërpudha.', den:'Creamy mushroom sauce.', tags:[] },
    { id:'pk03', c:'rest', art:'steak', sq:'Biftek Viçi', en:'Beef Steak', p:800,
      dsq:'Biftek viçi në zgarë.', den:'Grilled beef steak.', tags:['top'] },
    { id:'pk04', c:'rest', art:'steak', sq:'Bërxollë Viçi', en:'Beef Chop', p:800,
      dsq:'Bërxollë me kockë, në zgarë.', den:'Bone-in chop, off the grill.', tags:[] },
    { id:'pk05', c:'rest', art:'steak', sq:'Mish Qengji në Zgarë', en:'Grilled Lamb', p:900,
      dsq:'Qengj i njomë në zgarë.', den:'Tender lamb off the grill.', tags:['top'] },
    { id:'pk06', c:'rest', art:'fish', sq:'Karkaleca në Zgarë', en:'Grilled Prawns', p:800,
      dsq:'Karkaleca të freskëta me limon.', den:'Fresh prawns with lemon.', tags:[] },
    { id:'pk07', c:'rest', art:'fish', sq:'Friturë Mikse', en:'Mixed Fried Seafood', p:650,
      dsq:'Peshk e fruta deti të skuqura.', den:'Fried fish and seafood.', tags:[] },
    { id:'pk08', c:'rest', art:'fish', sq:'Koce / Levrek në Zgarë', en:'Grilled Sea Bream / Sea Bass', p:700,
      dsq:'Peshk i freskët me perime në zgarë.', den:'Fresh fish with grilled vegetables.', tags:['top'] },

    /* ─────────────── TRADICIONALE ─────────────── */
    { id:'tr01', c:'trad', art:'tave', sq:'Tavë Dheu', en:'Tavë Dheu', p:400, note:'09:00–15:00',
      dsq:'Pjekur në tavë balte, si dikur.', den:'Baked in a clay dish, the old way.', tags:['top'] },
    { id:'tr02', c:'trad', art:'tave', sq:'Tavë Balte', en:'Clay-Pot Bake', p:400, note:'09:00–15:00',
      dsq:'Gatim i ngadaltë në tavë balte.', den:'Slow-cooked in a clay pot.', tags:[] },
    { id:'tr03', c:'trad', art:'tave', sq:'Tavë Kosi', en:'Tavë Kosi', p:400, note:'09:00–15:00',
      dsq:'Mish, oriz dhe kos i trashë në furrë.', den:'Meat, rice and thick yoghurt, oven-baked.', tags:['top'] },
    { id:'tr04', c:'trad', art:'tave', sq:'Pilaf', en:'Pilaf', p:100, note:'09:00–15:00',
      dsq:'Oriz i gatuar në lëng mishi.', den:'Rice cooked in meat stock.', tags:[] },
    { id:'tr05', c:'trad', art:'tave', sq:'Qofte Shtëpie', en:'House Meatballs', p:50, unit:'/copë', note:'09:00–15:00',
      dsq:'Qofte të fërguara, receta e shtëpisë.', den:'Fried meatballs, the house recipe.', tags:[] },
    { id:'tr06', c:'trad', art:'soup', sq:'Paçe Koke', en:'Paçe Koke', p:250, note:'09:00–15:00',
      dsq:'Supa tradicionale e mëngjesit.', den:'The traditional morning soup.', tags:[] },
    { id:'tr07', c:'trad', art:'tave', sq:'Tasqebap', en:'Tasqebap', p:300, note:'09:00–15:00',
      dsq:'Mish i zier ngadalë me qepë.', den:'Slowly braised meat with onion.', tags:[] },
    { id:'tr08', c:'trad', art:'tave', sq:'Lazanja', en:'Lasagne', p:350,
      dsq:'Petë, salcë mishi dhe beshamel.', den:'Pasta sheets, meat sauce and béchamel.', tags:[] },
    { id:'tr09', c:'trad', art:'tave', sq:'Pastice', en:'Pastiçio', p:250,
      dsq:'Makarona të pjekura në furrë.', den:'Oven-baked pasta.', tags:[] },
    { id:'tr10', c:'trad', art:'tave', sq:'Musaka', en:'Moussaka', p:300,
      dsq:'Shtresa patatesh, mishi dhe beshameli.', den:'Layers of potato, meat and béchamel.', tags:[] },
    { id:'tr11', c:'trad', art:'tave', sq:'Tavë Kosi me Mish Qengji', en:'Tavë Kosi with Lamb', p:500,
      dsq:'Versioni me mish qengji.', den:'The version made with lamb.', tags:['top'] },
    { id:'tr12', c:'trad', art:'tave', sq:'Speca të Mbushura', en:'Stuffed Peppers', p:250,
      dsq:'Speca të mbushur me oriz dhe erëza.', den:'Peppers stuffed with rice and herbs.', tags:['veg'] },
    { id:'tr13', c:'trad', art:'tave', sq:'Patëllxhanë të Mbushur', en:'Stuffed Aubergines', p:300,
      dsq:'Patëllxhanë të pjekur e të mbushur.', den:'Roasted and stuffed aubergines.', tags:['veg'] },
    { id:'tr14', c:'trad', art:'tave', sq:'Turli me Mish', en:'Turli with Meat', p:300,
      dsq:'Perime të pjekura bashkë me mish.', den:'Vegetables baked together with meat.', tags:[] },
    { id:'tr15', c:'trad', art:'soup', sq:'Fasule Jani', en:'Bean Stew', p:150,
      dsq:'Fasule të ziera me perime.', den:'Beans stewed with vegetables.', tags:['veg'] },
    { id:'tr16', c:'trad', art:'soup', sq:'Fasule me Mish', en:'Beans with Meat', p:300,
      dsq:'Fasule të ziera me mish.', den:'Beans stewed with meat.', tags:[] },
    { id:'tr17', c:'trad', art:'soup', sq:'Kos Shtëpie', en:'House Yoghurt', p:80,
      dsq:'Kos i trashë, i bërë në shtëpi.', den:'Thick, house-made yoghurt.', tags:['veg'] },

    /* ─────────────── SALLATA ─────────────── */
    { id:'sl01', c:'starter', art:'salad', sq:'Sallatë Greke', en:'Greek Salad', p:300,
      dsq:'Domate, kastravec, ullinj dhe djathë.', den:'Tomato, cucumber, olives and cheese.', tags:['veg','top'] },
    { id:'sl02', c:'starter', art:'salad', sq:'Sallatë Mikse', en:'Mixed Salad', p:300,
      dsq:'Perime të freskëta të stinës.', den:'Fresh seasonal vegetables.', tags:['veg'] },
    { id:'sl03', c:'starter', art:'salad', sq:'Sallatë me Rukola', en:'Rocket Salad', p:350,
      dsq:'Rukolë, domate qershi dhe djathë i thekur.', den:'Rocket, cherry tomatoes and shaved cheese.', tags:['veg'] },
    { id:'sl04', c:'starter', art:'salad', sq:'Sallatë Cezar', en:'Caesar Salad', p:350,
      dsq:'Marule, pulë, krutona dhe salcë Cezar.', den:'Romaine, chicken, croutons and Caesar dressing.', tags:[] },
    { id:'sl05', c:'starter', art:'salad', sq:'Sallatë Turshi', en:'Pickle Salad', p:200,
      dsq:'Turshi shtëpie të përziera.', den:'Assorted house pickles.', tags:['veg'] },
    { id:'sl06', c:'starter', art:'salad', sq:'Perime në Zgarë', en:'Grilled Vegetables', p:300,
      dsq:'Perime sezonale në zgarë me vaj ulliri.', den:'Seasonal vegetables grilled with olive oil.', tags:['veg'] },
    { id:'sl07', c:'starter', art:'salad', sq:'Perime në Avull', en:'Steamed Vegetables', p:300,
      dsq:'Perime të ziera në avull.', den:'Lightly steamed vegetables.', tags:['veg'] },

    /* ─────────────── SUPA ─────────────── */
    { id:'su01', c:'starter', art:'soup', sq:'Supë me Perime', en:'Vegetable Soup', p:200,
      dsq:'Supë e lehtë me perime të stinës.', den:'A light soup of seasonal vegetables.', tags:['veg'] },
    { id:'su02', c:'starter', art:'soup', sq:'Supë Pule', en:'Chicken Soup', p:250,
      dsq:'Lëng pule i gatuar në shtëpi.', den:'House-made chicken broth.', tags:[] },
    { id:'su03', c:'starter', art:'soup', sq:'Supë Peshku', en:'Fish Soup', p:300,
      dsq:'Supë peshku sipas recetës së bregdetit.', den:'Fish soup, the coastal way.', tags:[] },

    /* ─────────────── SHOQËRUESE ─────────────── */
    { id:'sh01', c:'starter', art:'meze', sq:'Fokaçe Bruskete (shoqëruese)', en:'Bruschetta Focaccia (side)', p:150,
      dsq:'Porcion shoqërues për tavolinën.', den:'A side portion for the table.', tags:['veg'] },
    { id:'sh02', c:'starter', art:'byrek', sq:'Bukë Misri me Shëllirë', en:'Cornbread with Brine Cheese', p:100,
      dsq:'Bukë misri dhe djathë shëllire.', den:'Cornbread with brined cheese.', tags:['veg'] },
    { id:'sh03', c:'starter', art:'meze', sq:'Djathë i Bardhë', en:'White Cheese', p:150,
      dsq:'Djathë i bardhë vendi.', den:'Local white cheese.', tags:['veg'] },
    { id:'sh04', c:'starter', art:'meze', sq:'Djathë Kaçkavall', en:'Kaçkavall Cheese', p:200,
      dsq:'Kaçkavall i prerë në feta.', den:'Sliced kaçkavall cheese.', tags:['veg'] },
    { id:'sh05', c:'starter', art:'meze', sq:'Ullinj të Marinuar', en:'Marinated Olives', p:150,
      dsq:'Ullinj vendi të marinuar.', den:'Marinated local olives.', tags:['veg'] },
    { id:'sh06', c:'starter', art:'fries', sq:'Patate të Skuqura', en:'French Fries', p:150,
      dsq:'Patate të skuqura, të kripura sa duhet.', den:'Fries, salted just right.', tags:['veg'] },
    { id:'sh07', c:'starter', art:'meze', sq:'Xaxiq', en:'Tzatziki', p:150,
      dsq:'Kos me kastravec dhe hudhër.', den:'Yoghurt with cucumber and garlic.', tags:['veg'] },

    /* ─────────────── BAR · të ngrohta ─────────────── */
    { id:'bt01', c:'pije', art:'coffee', sq:'Kafe', en:'Coffee', p:70,
      dsq:'Espreso italiane.', den:'Italian espresso.', tags:['veg'] },
    { id:'bt02', c:'pije', art:'coffee', sq:'Makijato', en:'Macchiato', p:80,
      dsq:'Espreso me pak qumësht.', den:'Espresso with a little milk.', tags:['veg'] },
    { id:'bt03', c:'pije', art:'coffee', sq:'Çaj i Ngrohtë', en:'Hot Tea', p:60,
      dsq:'Çaj i ngrohtë me limon.', den:'Hot tea with lemon.', tags:['veg'] },
    { id:'bt04', c:'pije', art:'coffee', sq:'Kapuçino me Kafe', en:'Cappuccino with Coffee', p:120,
      dsq:'Kapuçino mbi bazë espreso.', den:'Cappuccino on an espresso base.', tags:['veg'] },
    { id:'bt05', c:'pije', art:'coffee', sq:'Kapuçino me Bustinë', en:'Sachet Cappuccino', p:150,
      dsq:'Kapuçino me bustinë.', den:'Cappuccino made from a sachet.', tags:['veg'] },
    { id:'bt06', c:'pije', art:'coffee', sq:'Kakao', en:'Hot Chocolate', p:150,
      dsq:'Kakao e ngrohtë.', den:'Warm cocoa.', tags:['veg'] },
    { id:'bt07', c:'pije', art:'coffee', sq:'Kakao e Vogël', en:'Small Hot Chocolate', p:80,
      dsq:'Porcion i vogël kakaoje.', den:'A small portion of cocoa.', tags:['veg'] },
    { id:'bt08', c:'pije', art:'coffee', sq:'Çokollatë e Zezë', en:'Dark Chocolate', p:150,
      dsq:'Çokollatë e zezë e ngrohtë.', den:'Warm dark chocolate.', tags:['veg'] },
    { id:'bt09', c:'pije', art:'coffee', sq:'Çokollatë e Bardhë', en:'White Chocolate', p:150,
      dsq:'Çokollatë e bardhë e ngrohtë.', den:'Warm white chocolate.', tags:['veg'] },
    { id:'bt10', c:'pije', art:'coffee', sq:'Salep', en:'Salep', p:120,
      dsq:'Pija e ngrohtë e dimrit.', den:'The warm winter drink.', tags:['veg'] },

    /* ─────────────── PIJE FRESKUESE ─────────────── */
    { id:'pf01', c:'pije', art:'drink', sq:'Bravo', en:'Bravo Juice', p:150,
      dsq:'Lëng frutash i ftohtë.', den:'Chilled fruit juice.', tags:['veg'] },
    { id:'pf02', c:'pije', art:'drink', sq:'Fanta', en:'Fanta', p:150, dsq:'E ftohtë akull.', den:'Ice cold.', tags:['veg'] },
    { id:'pf03', c:'pije', art:'drink', sq:'Coca-Cola', en:'Coca-Cola', p:150, dsq:'E ftohtë akull.', den:'Ice cold.', tags:['veg'] },
    { id:'pf04', c:'pije', art:'drink', sq:'Çaj i Ftohtë', en:'Iced Tea', p:150, dsq:'Me limon ose pjeshkë.', den:'Lemon or peach.', tags:['veg'] },
    { id:'pf05', c:'pije', art:'drink', sq:'Lemon / Orange Soda', en:'Lemon / Orange Soda', p:150, dsq:'Sodë me limon ose portokall.', den:'Lemon or orange soda.', tags:['veg'] },
    { id:'pf06', c:'pije', art:'drink', sq:'Schweppes', en:'Schweppes', p:120, dsq:'Tonik i hidhur.', den:'Bitter tonic.', tags:['veg'] },
    { id:'pf07', c:'pije', art:'drink', sq:'B52', en:'B52', p:150, dsq:'Pije energjike.', den:'Energy drink.', tags:['veg'] },
    { id:'pf08', c:'pije', art:'drink', sq:'Golden Eagle', en:'Golden Eagle', p:150, dsq:'Pije energjike.', den:'Energy drink.', tags:['veg'] },
    { id:'pf09', c:'pije', art:'drink', sq:'Red Bull', en:'Red Bull', p:250, dsq:'Pije energjike.', den:'Energy drink.', tags:['veg'] },
    { id:'pf10', c:'pije', art:'drink', sq:'Bitter', en:'Bitter', p:70, dsq:'Aperitiv pa alkool.', den:'Non-alcoholic aperitif.', tags:['veg'] },
    { id:'pf11', c:'pije', art:'drink', sq:'Crodino', en:'Crodino', p:150, dsq:'Aperitiv italian pa alkool.', den:'Italian non-alcoholic aperitif.', tags:['veg'] },
    { id:'pf12', c:'pije', art:'drink', sq:'Suko', en:'Suko', p:70, dsq:'Lëng frutash.', den:'Fruit juice.', tags:['veg'] },
    { id:'pf13', c:'pije', art:'drink', sq:'Ujë 0.5L', en:'Water 0.5L', p:60, dsq:'Ujë natyral.', den:'Still water.', tags:['veg'] },

    /* ─────────────── ALKOOLIKE ─────────────── */
    { id:'al01', c:'pije', art:'drink', sq:'Raki', en:'Raki', p:70,
      dsq:'Raki vendi, gota.', den:'Local raki, by the glass.', tags:['veg'] },
    { id:'al02', c:'pije', art:'drink', sq:'Gotë Verë e Bardhë / e Kuqe', en:'Glass of White / Red Wine', p:200,
      dsq:'Verë e shtëpisë, gota.', den:'House wine, by the glass.', tags:['veg'] },
    { id:'al03', c:'pije', art:'beer', sq:'Heineken', en:'Heineken', p:200, dsq:'Birrë e ftohtë.', den:'Cold beer.', tags:['veg'] },
    { id:'al04', c:'pije', art:'beer', sq:'Peroni', en:'Peroni', p:150, dsq:'Birrë italiane.', den:'Italian lager.', tags:['veg'] },
    { id:'al05', c:'pije', art:'beer', sq:'Korça', en:'Korça', p:150, dsq:'Birra klasike shqiptare.', den:'The classic Albanian lager.', tags:['veg','top'] },
    { id:'al06', c:'pije', art:'beer', sq:'Paulaner', en:'Paulaner', p:300, dsq:'Birrë gjermane gruri.', den:'German wheat beer.', tags:['veg'] },
    { id:'al07', c:'pije', art:'beer', sq:'Bavaria 0 Alkool', en:'Bavaria 0.0', p:150, dsq:'Birrë pa alkool.', den:'Alcohol-free beer.', tags:['veg'] },
  ];

  /* --------------------------------------------------------------------------
     ⚠️ REVIEW — TODO:REAL
     Këto NUK janë review reale, janë tekst vendmbajtës. Zëvendësoji me review
     të vërteta nga Google ose Facebook PARA se faqja të dalë online.
     -------------------------------------------------------------------------- */
  const reviews = [
    { n:'—', s:5, src:'Vendmbajtës', sq:'Këtu vjen review-ja e parë reale nga Google.', en:'The first real Google review goes here.' },
    { n:'—', s:5, src:'Vendmbajtës', sq:'Këtu vjen review-ja e dytë reale nga Google.', en:'The second real Google review goes here.' },
    { n:'—', s:5, src:'Vendmbajtës', sq:'Këtu vjen një review nga Facebook ose Instagram.', en:'A Facebook or Instagram review goes here.' },
  ];

  const stats = [
    { v:'120+', sq:'Pjata në menu',        en:'Dishes on the menu' },
    { v:'4',    sq:'Kuzhina nën një çati', en:'Kitchens under one roof' },
    { v:'15',   sq:'Pica dhe fokaçe',      en:'Pizzas and focaccias' },
    { v:'30+',  sq:'Pije në bar',          en:'Drinks at the bar' },
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

    hero_kicker:  { sq:'Durrës · Fast Food & Pizza · Restorant', en:'Durrës · Fast Food & Pizza · Restaurant' },
    hero_t1:      { sq:'Shija që',    en:'Flavour that' },
    hero_t2:      { sq:'nuk pret',    en:"won't wait" },
    hero_sub:     { sq:'Pica në furrë, sufllaqe e doner, skarë dhe peshk i freskët, dhe tavat tradicionale çdo mëngjes — mbi 120 pjata nën një çati, në Durrës.',
                    en:'Oven-baked pizza, gyros and doner, grilled meats and fresh fish, and traditional clay-pot bakes every morning — over 120 dishes under one roof, in Durrës.' },
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
    cart_zone:    { sq:'Sipas zonës', en:'By area' },
    cart_total:   { sq:'Totali',      en:'Total' },
    cart_send:    { sq:'Dërgo porosinë në WhatsApp', en:'Send order on WhatsApp' },
    cart_note:    { sq:'Do të hapet WhatsApp me porosinë të gatshme. Ti shtyp vetëm «Dërgo».',
                    en:'WhatsApp opens with your order pre-filled. You just hit «Send».' },
    cart_clear:   { sq:'Pastro',      en:'Clear' },

    about_kicker: { sq:'Historia jonë', en:'Our story' },
    about_title:  { sq:'Katër kuzhina. Një adresë.', en:'Four kitchens. One address.' },
    about_body:   { sq:'Në SPRINT nuk të duhet të zgjedhësh. Në mëngjes dalin tavat e baltës dhe gatimet e ditës, gjatë gjithë ditës punojnë furra e picës dhe banaku i sufllaqes, dhe në darkë skara nxjerr biftekun, qengjin dhe peshkun e freskët. E njëjta kuzhinë, e njëjta tavolinë.',
                    en:'At SPRINT you never have to choose. Mornings bring the clay-pot bakes and the dishes of the day; the pizza oven and the gyros counter run all day; and at night the grill turns out steak, lamb and fresh fish. One kitchen, one table.' },
    about_events: { sq:'Evente',      en:'Events' },

    rev_kicker:   { sq:'Çfarë thonë klientët', en:'What guests say' },
    rev_title:    { sq:'Vlerësimet tuaja',  en:'Your reviews' },
    rev_on_g:     { sq:'nga {n} vlerësime në Google', en:'from {n} Google reviews' },
    rev_all:      { sq:'Shiko të gjitha në Google', en:'See them all on Google' },
    rev_write:    { sq:'Shkruaj një vlerësim', en:'Write a review' },
    rev_src:      { sq:'Vlerësimet vijnë drejtpërdrejt nga Google.',
                    en:'Reviews come straight from Google.' },
    rev_none:     { sq:'Ende s’kemi vlerësime këtu — na gjej në Google dhe na thuaj si ishte.',
                    en:'No reviews here yet — find us on Google and tell us how it was.' },

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
    f_area_ev:    { sq:'Salla e eventeve', en:'Function room' },
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
    b_pizzas:     { sq:'Pica',        en:'Pizzas' },
    b_kitchens:   { sq:'Kuzhina',     en:'Kitchens' },
    b_rating:     { sq:'Vlerësim',    en:'Rating' },

    /* ---- arka dhe ndjekja e porosisë ---- */
    co_title:     { sq:'Përfundo porosinë', en:'Complete your order' },
    co_kind:      { sq:'Si e do porosinë?', en:'How would you like it?' },
    co_delivery:  { sq:'Me dërgesë',    en:'Delivery' },
    co_pickup:    { sq:'Marr vetë',     en:'Pick-up' },
    co_name:      { sq:'Emri',          en:'Name' },
    co_phone:     { sq:'Telefoni',      en:'Phone' },
    co_addr:      { sq:'Adresa e plotë', en:'Full address' },
    co_addr_ph:   { sq:'Rruga, ndërtesa, kati, apartamenti', en:'Street, building, floor, flat' },
    co_when:      { sq:'Kur',           en:'When' },
    co_asap:      { sq:'Sa më shpejt',  en:'As soon as possible' },
    co_time:      { sq:'Për një orë të caktuar', en:'At a set time' },
    co_pay:       { sq:'Pagesa',        en:'Payment' },
    co_cash:      { sq:'Para në dorë',  en:'Cash' },
    co_card:      { sq:'Me kartë',      en:'Card' },
    co_note:      { sq:'Shënim për kuzhinën', en:'Note for the kitchen' },
    co_note_ph:   { sq:'Pa qepë, kampanellë e prishur, kati i 3-të…', en:'No onion, broken doorbell, third floor…' },
    co_send:      { sq:'Dërgo porosinë', en:'Place the order' },
    co_back:      { sq:'Kthehu te shporta', en:'Back to the cart' },
    co_req:       { sq:'Plotëso emrin dhe telefonin.', en:'Please fill in your name and phone.' },
    co_req_addr:  { sq:'Për dërgesë duhet edhe adresa.', en:'Delivery also needs an address.' },
    co_fail:      { sq:'Porosia nuk u regjistrua dot. Provo sërish ose na merr në telefon.',
                    en:'The order could not be saved. Try again or give us a call.' },

    ok_title:     { sq:'Porosia u regjistrua!', en:'Your order is in!' },
    ok_sub:       { sq:'Na dërgo edhe një mesazh në WhatsApp që ta konfirmojmë menjëherë.',
                    en:'Send us a WhatsApp message too so we can confirm right away.' },
    ok_wa:        { sq:'Hap WhatsApp', en:'Open WhatsApp' },
    ok_track:     { sq:'Ndiq porosinë', en:'Track the order' },
    ok_new:       { sq:'Porosi e re',   en:'New order' },
    ok_no:        { sq:'Porosia nr.',   en:'Order no.' },
    ok_code:      { sq:'Kodi i gjurmimit', en:'Tracking code' },
    ok_keep:      { sq:'Ruaje këtë kod. Me të ndjek porosinë në çdo moment, edhe nga një telefon tjetër.',
                    en:'Keep this code. It lets you follow the order at any time, even from another phone.' },
    ok_copy:      { sq:'Kopjo kodin',  en:'Copy the code' },

    /* vendndodhja */
    loc_btn:      { sq:'📍 Dërgo vendndodhjen', en:'📍 Share your location' },
    loc_wait:     { sq:'Po kërkohet vendndodhja…', en:'Finding your location…' },
    loc_drag:     { sq:'Lëvize hartën derisa pini të jetë te dera jote.',
                    en:'Drag the map until the pin sits at your door.' },
    loc_good:     { sq:'Vendndodhja u mor saktë.', en:'Location captured accurately.' },
    loc_ok:       { sq:'Vendndodhja u mor. Saktësoje pinin nëse nuk është te dera.',
                    en:'Location captured. Nudge the pin if it is not at your door.' },
    loc_poor:     { sq:'Vendndodhja nuk është e saktë — lëvize pinin te dera jote.',
                    en:'This location is not precise — drag the pin to your door.' },
    loc_set:      { sq:'Pini u vendos ✓', en:'Pin set ✓' },
    loc_clear:    { sq:'Hiqe pinin', en:'Remove the pin' },
    loc_why:      { sq:'Pini e çon motorristin te dera, jo te rruga. Adresa mbetet e nevojshme.',
                    en:'The pin takes the driver to your door, not just the street. The address is still needed.' },
    ok_copied:    { sq:'U kopjua ✓',   en:'Copied ✓' },

    /* ---- motori i gjurmimit ---- */
    tk_kicker:    { sq:'Gjurmo porosinë', en:'Track your order' },
    tk_title:     { sq:'Ku ndodhet porosia jote', en:'Where your order is' },
    tk_sub:       { sq:'Shkruaj kodin që more kur porosite, ose numrin e telefonit me të cilin e bëre.',
                    en:'Enter the code you were given when you ordered, or the phone number you used.' },
    tk_by_code:   { sq:'Me kod',       en:'By code' },
    tk_by_phone:  { sq:'Me telefon',   en:'By phone' },
    tk_code_ph:   { sq:'p.sh. A4F7-K2M9', en:'e.g. A4F7-K2M9' },
    tk_phone_ph:  { sq:'p.sh. 069 123 4567', en:'e.g. 069 123 4567' },
    tk_go:        { sq:'Gjurmo',       en:'Track' },
    tk_short:     { sq:'Kodi ka tetë shenja — kontrollo dhe provo sërish.',
                    en:'The code has eight characters — check it and try again.' },
    tk_phone_short:{ sq:'Shkruaj numrin e plotë të telefonit.', en:'Enter the full phone number.' },
    tk_nofind:    { sq:'Nuk u gjet asnjë porosi me këtë kod.', en:'No order was found with that code.' },
    tk_nophone:   { sq:'Nuk ka porosi në punë me këtë numër. Porositë e mbyllura nuk kërkohen dot me telefon — përdor kodin.',
                    en:'No orders in progress for that number. Completed orders cannot be found by phone — use the code.' },
    tk_found:     { sq:'porosi në punë', en:'orders in progress' },
    tk_open:      { sq:'Hape',         en:'Open' },
    tk_hint:      { sq:'Kërkimi me telefon gjen vetëm porositë e 24 orëve të fundit që janë ende në punë.',
                    en:'Phone search only finds orders from the last 24 hours that are still in progress.' },

    tr_title:     { sq:'Porosia jote',  en:'Your order' },
    tr_code:      { sq:'Kodi',          en:'Code' },
    tr_again:     { sq:'Gjurmo një tjetër', en:'Track another' },
    tr_elapsed:   { sq:'Nga porosia',   en:'Since ordered' },
    tr_left:      { sq:'Mbeten',        en:'Remaining' },
    tr_late:      { sq:'Me vonesë',     en:'Running late' },
    tr_notfound:  { sq:'Kjo porosi nuk u gjet.', en:'That order was not found.' },
    tr_back:      { sq:'Kthehu te faqja', en:'Back to the site' },

    st_new:        { sq:'Pritet konfirmimi', en:'Awaiting confirmation' },
    st_accepted:   { sq:'E pranuar',      en:'Accepted' },
    st_preparing:  { sq:'Në përgatitje',  en:'Being prepared' },
    st_ready:      { sq:'Gati',           en:'Ready' },
    st_delivering: { sq:'Në rrugë',       en:'On the way' },
    st_done:       { sq:'Përfunduar',     en:'Completed' },
    st_cancelled:  { sq:'E anuluar',      en:'Cancelled' },
    lang_label:   { sq:'EN',          en:'SQ' },
  };

  /* --------------------------------------------------------------------------
     NDIHMËSA
     -------------------------------------------------------------------------- */
  menu.forEach((m) => { m.tags = m.tags || []; m.dsq = m.dsq || ''; m.den = m.den || ''; });

  let lang = 'sq';
  const setLang = (l) => { lang = l; };
  const getLang = () => lang;
  const T  = (k) => (t[k] ? t[k][lang] : k);
  const money = (n) => n.toLocaleString('sq-AL') + ' ' + config.currency;
  /** Çmimi siç shfaqet, bashkë me njësinë nëse pjata shitet me copë. */
  const price = (m) => money(m.p) + (m.unit ? ' ' + m.unit : '');

  const waLink = (text) => 'https://wa.me/' + config.whatsapp + '?text=' + encodeURIComponent(text);
  const mailLink = (subject, body) =>
    'mailto:' + (config.email || '') + '?subject=' + encodeURIComponent(subject) + '&body=' + encodeURIComponent(body);
  const mapLink = () =>
    'https://www.google.com/maps/search/?api=1&query=' + config.geo.lat + ',' + config.geo.lng;

  return { config, categories, menu, reviews, stats, t, T, setLang, getLang, money, price, waLink, mailLink, mapLink };
})();
