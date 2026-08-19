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

- **Menu interaktive** — filtra sipas 5 kategorive (Pizza, Fast Food, Restorant, Tradicionale, Ëmbëlsira & Pije), kërkim i drejtpërdrejtë dhe etiketa (pikante, vegjetarian, i ri, më i shituri).
- **Shportë → WhatsApp** — klienti shton pjata, sheh nëntotalin, dërgesën (falas mbi 1 500 L) dhe totalin, pastaj me një klikim hapet WhatsApp me porosinë e formatuar gati. Shporta ruhet edhe nëse mbyll faqen.
- **Rezervim tavolinash** — emër, telefon, datë, orë, persona, ambient dhe shënim. Dërgohet në WhatsApp; butoni i dytë dërgon të njëjtin rezervim me email si kopje rezervë.
- **Telefonatë me një prekje** — çdo numër është link `tel:`, plus shirit i ngjitur poshtë në telefon.
- **Dygjuhësh shqip / anglisht** — një buton, gjithë faqja ndërron, zgjedhja ruhet.
- **Mobile i plotë** — të gjitha të testuara në iPhone, pa scroll horizontal.
- **Respekton `prefers-reduced-motion`** — animacionet fiken për përdoruesit që i kanë çaktivizuar.

---

## ⚠️ Materialet reale mungojnë — dhe pse

Instagram, Facebook, TikTok, Google Maps, TripAdvisor dhe Wolt janë **të bllokuara nga politika
e rrjetit të këtij mjedisi** (proxy-ja kthen `403` për çdo kërkesë drejt tyre). Prandaj nuk u
shkarkuan dot foto, video, menuja apo review-t reale të biznesit.

Nga kërkimi doli vetëm një gjurmë publike: një postim Instagram me titullin
*"Menu SPRINT Restorant, fast food and Pizza! #durres"* — por përmbajtja e tij nuk u hap dot.

**Çfarë është vendosur në vend të tyre:** ilustrime SVG të vizatuara posaçërisht (pizza në 4
variante, burger, suflaqe, patate, krahë, biftek, peshk, pasta, sallatë, tavë balte, byrek,
ëmbëlsirë, pije), një menu shembull realiste shqiptare me 40 pjata, dhe review shembull.
Të gjitha janë të shënuara me `// TODO:REAL` dhe zëvendësohen pa prekur strukturën.

---

## Si t'i vendos të dhënat reale

Gjithçka rri në **një skedar të vetëm**: `shared/data.js`.

### 1. Kontaktet dhe brand-i

```js
phone: '+355 69 000 0000',      // numri i vërtetë, siç shfaqet
phoneHref: '+35569000000',      // i njëjti numër, pa hapësira (për butonin telefono)
whatsapp: '35569000000',        // ndërkombëtar, PA '+' dhe PA hapësira
email: 'info@sprintdurres.al',  // ku vjen kopja e rezervimit
address: { sq: '…', en: '…' },
geo: { lat: 41.3236, lng: 19.4432 },   // për butonin "Hape në Google Maps"
social: { instagram: '…', facebook: '…', tiktok: '…' },
```

### 2. Menuja

Çdo pjatë është një rresht:

```js
{ id:'p1', c:'pizza', art:'pizza', sq:'Margherita', en:'Margherita', p:500,
  dsq:'Përshkrimi shqip.', den:'English description.', tags:['veg'] },
```

- `c` — kategoria: `pizza` · `fast` · `rest` · `trad` · `dolce`
- `p` — çmimi në lekë (vetëm numër)
- `tags` — `hot` (pikante) · `veg` · `new` · `top` (më i shituri)
- `art` — cili ilustrim përdoret: `pizza` `pizzaV` `pizzaW` `pizzaC` `burger` `gyros` `fries`
  `wings` `steak` `fish` `pasta` `salad` `tave` `byrek` `dessert` `drink`

### 3. Fotot reale (kur t'i keni)

1. Vendosini në `assets/dishes/` — p.sh. `assets/dishes/p1.jpg`
2. Shtoni fushën `img` te pjata:

```js
{ id:'p1', c:'pizza', art:'pizza', img:'assets/dishes/p1.jpg', sq:'Margherita', … }
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
2. **Dërgo materialet:** logon në PNG/SVG, foto e video të pjatave dhe ambientit, menunë reale
   me çmime, numrin e telefonit dhe të WhatsApp-it, adresën e saktë, orarin dhe linket e profileve.
3. I fus të dhënat, publikoj faqen dhe të jap hapat e sakta të DNS-së për domain-in.

### Opsionale, më vonë

- **Njoftim automatik në WhatsApp** pa e prekur klienti — kërkon WhatsApp Cloud API,
  llogari Meta Business dhe verifikim numri. `wa.me` mbetet rruga kryesore sepse është falas
  dhe pa fërkim; automatizimi shtohet mbi të pa e rindërtuar faqen.
- **Panel i thjeshtë** për të ndryshuar menunë pa prekur kodin.
- **Pagesa online** me kartë (Stripe).
