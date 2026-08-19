# SPRINT — Fast Food & Pizza, Durrës

Pesë mockup të plotë dhe funksionalë për faqen e re të biznesit. Zgjidh njërin,
dhe atë e çojmë deri në publikim me materialet reale.

**Faqja e zgjedhjes:** hap `dist/index.html` — aty i sheh të pesta me pamje paraprake të gjalla.

---

## Të pesë drejtimet

| # | Emri | Karakteri | Efektet | Kujt i shkon |
|---|------|-----------|---------|--------------|
| 1 | **Zjarri** | Kinematik, i errët, thëngjij mbi hero | Maksimale | Brand premium që do efektin "wow" |
| 2 | **Rrota** | Rrotë interaktive kategorish, karta që përmbysen | 3D e rëndë | Klientë familjarë, më e paharrueshmja |
| 3 | **Tabela** | Letër krem, terrakotë, menu si e shtypur | Të lehta | Kuzhina tradicionale, konvertim i lartë |
| 4 | **Nata** | Neon dhe qelq, rrjet bento, "hapur tani" | Mesatare | Orare deri vonë dhe delivery |
| 5 | **Editorial** | I çelët, serif i madh, revistë gastronomike | Të përmbajtura | Turistë dhe pamje restoranti premium |

Kombinimet janë të mundshme — p.sh. hero-ja e nr. 1 me menunë e nr. 3.

## Çfarë funksionon në të pesta

- **Menu interaktive** — 122 artikuj në 6 kategori (Pizza, Fast Food, Restorant, Tradicionale, Sallata & Supa, Pije), me filtra, kërkim të drejtpërdrejtë dhe etiketa (pikante, vegjetarian, i ri, i spikatur).
- **Shportë → WhatsApp** — klienti shton pjata, sheh nëntotalin dhe totalin, pastaj me një klikim hapet WhatsApp me porosinë e formatuar gati te numri 069 666 7000. Shporta ruhet edhe nëse mbyll faqen.
- **Rezervim tavolinash** — emër, telefon, datë, orë, persona, ambient (brenda, terracë ose salla e eventeve) dhe shënim. Dërgohet në WhatsApp; kur të vendoset një email, shfaqet edhe butoni për kopjen me email.
- **Telefonatë me një prekje** — çdo numër është link `tel:`, plus shirit i ngjitur poshtë në telefon.
- **Dygjuhësh shqip / anglisht** — një buton, gjithë faqja ndërron, zgjedhja ruhet.
- **Mobile i plotë** — të gjitha të testuara në iPhone, pa scroll horizontal.
- **Respekton `prefers-reduced-motion`** — animacionet fiken për përdoruesit që i kanë çaktivizuar.

---

## Gjendja e të dhënave

| Çfarë | Gjendja |
|-------|---------|
| **Menuja — 122 artikuj me çmime** | ✅ Reale, transkriptuar nga menuja zyrtare në Instagram |
| **Numri i telefonit / WhatsApp** | ✅ Real — 069 666 7000 |
| **Instagram** | ✅ Real — [@sprint_restorant_fast_pizza](https://www.instagram.com/sprint_restorant_fast_pizza/) |
| **Ngjyrat e brand-it** | ✅ Portokalli · e zezë · krem, nxjerrë nga menuja dhe logoja |
| **Salla e eventeve** | ✅ E shtuar te rezervimi dhe te «Rreth Nesh» |
| **Fotot e pjatave dhe ambientit** | ⛔ Ende ilustrime SVG — presin skedarët origjinalë |
| **Adresa e saktë dhe koordinatat** | ⛔ `TODO:REAL` te `shared/data.js` |
| **Orari i hapjes / mbylljes** | ⛔ `TODO:REAL` — vetëm 09:00–15:00 për tavat është i konfirmuar |
| **Tarifa e dërgesës** | ⛔ Shporta shfaq «Sipas zonës» derisa ta konfirmosh |
| **Email për rezervime** | ⛔ Butoni i email-it fshihet vetë derisa të vendoset një adresë |
| **Review-t** | ⛔ Tekst vendmbajtës — **duhen zëvendësuar para se faqja të dalë online** |

### Pse mungojnë ende fotot

Instagram, Facebook, TikTok, Google Maps dhe TripAdvisor janë **të bllokuara nga politika e
rrjetit të këtij mjedisi** (proxy-ja kthen `403`). Menuja u fut duke u lexuar nga pamjet e
ekranit të dërguara nga pronari; fotot, megjithatë, duhen si skedarë për t'u vendosur në
`assets/`. Deri atëherë përdoren ilustrime SVG të vizatuara posaçërisht për këtë projekt
(21 lloje: pica në katër variante, sufllaqe, sanduiç, burger, biftek, peshk, pasta, sallatë,
supë, tavë balte, byrek, meze, kafe, birrë, pije).

### ⚠️ Review-t

`reviews` te `shared/data.js` përmban tekst vendmbajtës, **jo** review reale. Zëvendësoje me
review të vërteta nga Google ose Facebook para publikimit — mos e lër faqen të dalë online me
vlerësime të shpikura.

---

## Si t'i vendos të dhënat reale

Gjithçka rri në **një skedar të vetëm**: `shared/data.js`.

### 1. Kontaktet dhe brand-i

```js
phone: '069 666 7000',          // ✅ real
phoneHref: '+355696667000',     // ✅ real
whatsapp: '355696667000',       // ✅ real — ndërkombëtar, PA '+' dhe PA hapësira
email: '',                      // ⛔ vendose dhe butoni i email-it shfaqet vetë
address: { sq: '…', en: '…' },  // ⛔ adresa e saktë
geo: { lat: 41.3236, lng: 19.4432 },   // ⛔ koordinatat nga Google Maps
deliveryFee: null,              // ⛔ null → shporta shfaq «Sipas zonës»
```

Linket sociale që lihen bosh **fshihen vetvetiu** nga footer-i — nuk mbetet asnjë ikonë e vdekur.

### 2. Menuja

Çdo pjatë është një rresht:

```js
{ id:'pz03', c:'pizza', art:'pizza', sq:'Pica Margarita', en:'Pizza Margherita', p:320,
  dsq:'Salcë domateje dhe djathë — klasikja.', den:'Tomato sauce and cheese — the classic.', tags:['veg'] },
```

- `c` — kategoria: `pizza` · `fast` · `rest` · `trad` · `starter` · `pije`
- `p` — çmimi në lekë (vetëm numër)
- `tags` — `hot` (pikante) · `veg` · `new` · `top` (më i shituri)
- `unit` — teksti pas çmimit kur pjata shitet me copë, p.sh. `'/copë'`
- `note` — shënim i vogël pranë emrit, p.sh. `'09:00–15:00'`
- `art` — cili ilustrim përdoret: `pizza` `pizzaV` `pizzaW` `pizzaC` `burger` `gyros` `sandwich`
  `fries` `wings` `steak` `fish` `pasta` `salad` `soup` `tave` `byrek` `meze` `coffee` `beer`
  `dessert` `drink`

### 3. Fotot reale (kur t'i keni)

1. Vendosini në `assets/dishes/` — p.sh. `assets/dishes/pz03.jpg`
2. Shtoni fushën `img` te pjata:

```js
{ id:'pz03', c:'pizza', art:'pizza', img:'assets/dishes/pz03.jpg', sq:'Pica Margarita', … }
```

Faqja e përdor automatikisht foton; nëse `img` mungon, kthehet te ilustrimi SVG.
Foto katrore ose 4:3, ideal 1200 px anë, JPG/WebP nën 200 KB.

### 4. Review-t

Zëvendësoni listën `reviews` me review reale nga Google ose Facebook (emri, yjet, burimi, teksti).

---

## Ndërtimi

Nuk ka varësi dhe nuk ka nevojë për `npm install`.

```bash
node build.js
```

Skripti merr çdo skedar nga `mockups/`, fut brenda `shared/data.js`, `shared/art.js` dhe
`shared/app.js`, dhe nxjerr te `dist/` faqe krejtësisht të pavarura — një skedar i vetëm secila,
pa asnjë kërkesë drejt jashtë përveç fontit të Google.

Për ta parë lokalisht:

```bash
node build.js && cd dist && python3 -m http.server 8899
# hape http://127.0.0.1:8899/
```

### Struktura

```
shared/data.js    ← TË DHËNAT: menu, çmime, kontakte, përkthime  (këtu punon ti)
shared/art.js     ← ilustrimet SVG të pjatave
shared/app.js     ← motori: filtra, kërkim, shportë, WhatsApp, rezervim, dygjuhësia
mockups/*.html    ← pamja e secilit drejtim (HTML + CSS + efektet e veta)
mockups/_index.html ← faqja e zgjedhjes
build.js          ← bashkon gjithçka në dist/
dist/             ← rezultati që publikohet
```

---

## Publikimi (host + domain)

Faqja është statike, pa server dhe pa bazë të dhënash — hosting-u është falas dhe i shpejtë.

### Netlify

1. Lidh repo-n te [netlify.com](https://netlify.com) → *Add new site* → *Import an existing project*.
2. Konfigurimi lexohet vetë nga `netlify.toml` (build: `node build.js`, publish: `dist`).
3. *Domain settings* → *Add a domain you already own* → shkruaj domain-in.
4. Te regjistruesi ku bleve domain-in, vendos rekordet që të jep Netlify:
   - `A` për `sprintdurres.al` → `75.2.60.5`
   - `CNAME` për `www` → `<emri-i-sajtit>.netlify.app`
5. SSL-ja (Let's Encrypt) lëshohet vetë brenda pak minutash.

### Vercel

1. [vercel.com](https://vercel.com) → *Add New* → *Project* → zgjidh repo-n.
2. `vercel.json` e bën konfigurimin vetë.
3. *Settings → Domains* → shto domain-in, pastaj te regjistruesi:
   - `A` për domain-in rrënjë → `76.76.21.21`
   - `CNAME` për `www` → `cname.vercel-dns.com`

> Rekordet e sakta i konfirmon gjithmonë paneli i Netlify/Vercel pasi shton domain-in —
> përdor ato që të shfaqen atje, jo vlerat e mësipërme nëse ndryshojnë.

### Ku ta blej domain-in

`.al` blihet te [AKEP](https://akep.al) ose te rishitësit shqiptarë; `.com` te Namecheap,
Porkbun ose Cloudflare. Për një fast food në Durrës, `.al` jep besueshmëri lokale —
merr edhe `.com` nëse është i lirë dhe ridrejtoje te `.al`.

---

## Hapat e radhës

1. **Zgjidh mockup-in** (ose kombinimin që të pëlqen).
2. **Dërgo si skedarë:** logon (PNG ose SVG), fotot dhe videot e pjatave dhe të ambientit,
   review reale nga Google, adresën e saktë, orarin e plotë, tarifën e dërgesës dhe një email.
3. I fus, publikoj faqen dhe të jap hapat e sakta të DNS-së për domain-in.

### Opsionale, më vonë

- **Njoftim automatik në WhatsApp** pa e prekur klienti — kërkon WhatsApp Cloud API,
  llogari Meta Business dhe verifikim numri. `wa.me` mbetet rruga kryesore sepse është falas
  dhe pa fërkim; automatizimi shtohet mbi të pa e rindërtuar faqen.
- **Panel i thjeshtë** për të ndryshuar menunë pa prekur kodin.
- **Pagesa online** me kartë (Stripe).
