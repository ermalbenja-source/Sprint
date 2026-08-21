# SPRINT — Fast Food & Pizza · Restaurant, Durrës

Faqja zyrtare e biznesit, plus një panel menaxhimi ku ndryshohen çmimet dhe ngarkohen fotot
pa prekur kodin.

- **Faqja** → `dist/index.html`
- **Paneli** → `dist/admin/index.html` (në internet: `sajti-yt.al/admin`)
- **Mockup-et e fazës 1** → `dist/mockups/` (ruhen si referencë)

---

## Çfarë bën faqja

- **Rrota e kategorive** — kliko një fetë, ajo rrotullohet dhe menuja poshtë filtrohet vetë.
- **Menu interaktive** — 122 artikuj në 6 kategori, me filtra, kërkim dhe etiketa
  (i spikatur, i ri, pikante, vegjetarian). Kartat përmbysen dhe tregojnë përbërësit.
- **Shportë → arkë → porosi e regjistruar** — klienti zgjedh dërgesë ose marrje vetë, lë të dhënat,
  dhe porosia ruhet me numrin e vet përpara se të hapet WhatsApp-i. Shporta ruhet edhe nëse mbyllet faqja.
- **Ndjekje porosie me kod** — çdo porosi merr një kod (`A4F7-K2M9`) dhe një motorr kërkimi
  në faqe: kërko me kod ose me numër telefoni dhe shih hapin ku ndodhet, me kohëmatës të gjallë.
- **Rezervim tavoline** — WhatsApp, plus kopje me email kur të vendoset një adresë.
  Ambientet: brenda, terracë ose salla e eventeve.
- **Galeri** — shfaq fotot e ngarkuara nga paneli; pa to, përdor ilustrimet.
- **Salla e eventeve** — seksion i vetin, me buton që hap WhatsApp-in.
- **Dygjuhësh shqip / anglisht**, mobile i plotë, respekton `prefers-reduced-motion`.

---

## Paneli i menaxhimit

Hapet te `/admin`. Hyrja bëhet me email dhe fjalëkalim.

| Skeda | Çfarë ndryshon |
|-------|----------------|
| **Menuja** | Çmimin direkt në listë, ose gjithçka te sirtari: emrin, përshkrimin, kategorinë, etiketat, njësinë (`/copë`), shënimin (`09:00–15:00`), renditjen dhe foton — e ngarkuar ose e bërë me kamerën aty për aty. Fsheh një pjatë me një çelës pa e fshirë. |
| **Kategoritë** | Emrat në të dyja gjuhët dhe renditjen — e njëjta renditje del te fetat e rrotës. |
| **Cilësimet** | Telefonin, WhatsApp-in, email-in, adresën, koordinatat, tarifën e dërgesës, orarin, rrjetet sociale, tekstin dhe foton e sallës. |
| **Vlerësimet** | Rrugë rezervë kur Google nuk është lidhur. Me Google të lidhur, faqja i merr vetë. |
| **Publikimi** | Dërgon gjithçka në Supabase, shkarkon një kopje JSON, rikthen një kopje ose kthen menunë fillestare. |

Dy skedat e para — **Porositë** dhe **Rezervimet** — janë ekrani i punës së përditshme; shih më sipër.

**Ndryshim çmimesh me shumicë:** zgjidh kategorinë, shkruaj përqindjen dhe shtyp «Rrit» ose «Ul» —
p.sh. të gjitha picat +10% me një klikim.

### Fotot e pjatave

Hap një pjatë te skeda **Menuja** dhe ke tri butona:

- **📁 Ngarko foto** — zgjidh një skedar nga pajisja.
- **📷 Bëj foto** — hap kamerën aty për aty, me pamje të gjallë, buton shkrepjeje dhe kalim
  midis kamerës së pasme e asaj të përparme. Pas shkrepjes zgjedh «Përdore këtë» ose
  «Provo sërish». Në telefonat e vjetër që s'e mbështesin kamerën në shfletues, hapet vetë
  aplikacioni i kamerës.
- **Hiq foton** — e heq nga pjata dhe e fshin skedarin nga Supabase, që hapësira të mos mbushet.

Fotoja zvogëlohet në 1200 px dhe ngjeshet brenda telefonit para se të niset, ndaj ngarkohet
shpejt edhe me internet të dobët. Kur ndërron një foto, e vjetra fshihet vetvetiu.

Sapo shtypësh «Ruaj ndryshimet», fotoja del në kartën e pjatës, në galeri dhe në shportë.
Pa foto, faqja kthehet te ilustrimi i zgjedhur. I njëjti çift butonash gjendet edhe te
fotoja e sallës së eventeve, te **Cilësimet**.

Asgjë nuk del te klientët derisa të shtypet **«Ruaj ndryshimet»**. Sa herë ka diçka të paruajtur,
poshtë shfaqet një shirit me numrin e ndryshimeve dhe butonin «Anulo».


---

## Porositë dhe rezervimet

Porosia **shkruhet në bazë përpara** se të hapet WhatsApp-i, që të mos humbasë asnjë edhe nëse
klienti nuk e dërgon mesazhin.

### Si e bën klienti

1. Ndërton shportën dhe shtyp «Dërgo porosinë në WhatsApp».
2. Hapet arka: me dërgesë apo marr vetë, emri, telefoni, adresa, kur e do, si paguan, shënim.
3. Porosia regjistrohet dhe merr një numër (`#1042`) plus një **kod gjurmimi** (`A4F7-K2M9`).
   Shporta pastrohet vetë.
4. Kodi shfaqet i madh në konfirmim, me butonin **Kopjo kodin** dhe me shënimin që ta ruajë:
   *«Ruaje këtë kod. Me të ndjek porosinë në çdo moment, edhe nga një telefon tjetër.»*
5. Klienti sheh dy butona: **Hap WhatsApp** (mesazhi del i gatshëm, me numrin e porosisë **dhe
   kodin**) dhe **Ndiq porosinë**.

### Kodi i porosisë

Kodi është 8 shenja nga një alfabet pa shkronja që ngatërrohen — pa `I`, `O`, `0`, `1` — dhe
shfaqet i ndarë me vizë (`A4F7-K2M9`) që të lexohet e të diktohet lehtë në telefon. Prodhohet nga
baza (`gen_order_code()`), jo nga shfletuesi, dhe shkon:

- te konfirmimi i porosisë, me butonin e kopjimit;
- te mesazhi i WhatsApp-it: `🔖 Kodi i gjurmimit: *A4F7-K2M9*`;
- te linku `?kodi=A4F7K2M9` që hap ndjekjen drejtpërdrejt;
- te çdo kartë porosie në panel, si distinktiv, që ta gjesh klientin kur të marrë në telefon.

### Motorri i kërkimit — seksioni «Gjurmo»

Në faqe, midis hapave dhe kategorive, ka një seksion **«Ku ndodhet porosia jote»** që punon si
gjurmimi i një dërgese poste. Dy mënyra kërkimi:

- **Me kod** — klienti shkruan kodin (viza vihet vetë ndërsa shkruan, shkronjat e vogla pranohen)
  dhe i hapet menjëherë faqja e ndjekjes.
- **Me telefon** — nëse e ka humbur kodin, shkruan numrin me të cilin porositi dhe i del lista e
  porosive të tij në punë, secila me kodin, gjendjen, numrin dhe totalin, plus butonin **Hape**.

Kërkimi me telefon gjen **vetëm porositë e 24 orëve të fundit që janë ende në punë** — jo
historikun. Kështu numri i telefonit i dikujt nuk bëhet çelës për të parë çfarë ka porositur
javën e kaluar.

### Ndjekja nga klienti

Linku `sajti-yt.al/?kodi=KODI` (ose kërkimi më sipër) hap faqen e ndjekjes me hapat e porosisë,
kohëmatësin e gjallë dhe listën e pjatave. Përpara pranimit numëron kohën që ka kaluar; pas
pranimit numëron **mbrapsht** drejt kohës që i ke premtuar, dhe kalon në të kuqe kur kalon afati.
Gjendja rifreskohet vetë çdo 30 sekonda.

Faqja e ndjekjes kthen vetëm fusha jo-personale (numri, kodi, gjendja, koha, pjatët) dhe vetëm
për një kod të saktë — jo emrin, telefonin apo adresën e askujt. Të dyja kërkimet kalojnë përmes
funksioneve `security definer` në bazë (`track_order`, `find_orders_by_phone`), që tabela
`orders` të mbetet e palexueshme nga jashtë.

### Tabela e porosive te paneli

Skeda **Porositë** është ekrani i punës së përditshme:

- **Kohëmatësi i gjallë** në çdo kartë. Përpara pranimit numëron nga zero dhe kalon në portokalli
  pas 3 minutash, në të kuqe pas 6 — sa shpejt përgjigjesh është pjesë e shërbimit. Pas pranimit
  numëron mbrapsht drejt kohës së premtuar dhe shkon `+02:14` e kuqe kur je me vonesë.
- **Rrjedha e gjendjeve:** E re → Pranuar → Në përgatitje → Gati → Në rrugë → Përfunduar.
  Për porositë «marr vetë», hapi «Në rrugë» kapërcehet vetë.
- **Pranimi me një prekje:** 10′ · 15′ · 20′ · 30′ · 45′ · 60′. Koha që zgjedh është ajo që sheh klienti.
- **Zilja** për çdo porosi të re, plus titulli i skedës që pulson. Fiket me butonin 🔔.
- **Rifreskim vetvetiu** çdo 15 sekonda; ndalon kur skeda nuk është në pamje.
- **Numri i telefonit klikohet** për të marrë klientin, **adresa** hap Google Maps, dhe një link
  hap WhatsApp-in e tij drejtpërdrejt.
- **Statistikat e ditës:** porositë, xhiroja, sa janë në punë dhe koha mesatare e pranimit.
  Zgjidh një datë tjetër për të parë ditët e shkuara.
- **Filtrat** me numra: Në punë · Të reja · Në përgatitje · Gati · Në rrugë · Përfunduar.

Skeda **Rezervimet** punon njësoj, me rrjedhën I ri → Konfirmuar → Erdhi → Përfunduar.

> Pa Supabase, tabela shfaq tri porosi dhe dy rezervime **shembull**, të shënuara qartë, që ta
> shohësh si punon. Ato nuk shkojnë kurrë në bazë.

### Një shënim për sigurinë

Që klienti të porosisë pa llogari, tabela `orders` pranon shkrime nga këdo — por **vetëm krijim**,
kurrë lexim. Kufizimet në bazë (gjatësia e fushave, maksimumi 60 artikuj, totali deri 500 000 L)
dhe një ndalesë prej 25 sekondash midis porosive nga i njëjti shfletues e mbajnë të kontrolluar.
Nëse ndonjëherë has spam, hapi tjetër është ta kalosh krijimin e porosisë përmes një funksioni
Netlify me Turnstile përpara.

---

## Lidhja e Supabase (një herë, ~10 minuta)

Supabase mban çmimet, tekstet dhe fotot. Plani falas mjafton me tepri.

1. Hap [supabase.com](https://supabase.com) → **New project** (zgjidh rajonin *Frankfurt* — më afër Shqipërisë).
2. **SQL Editor → New query** → ngjit të gjithë skedarin [`supabase/schema.sql`](supabase/schema.sql) → **Run**.
   Skedari është i shkruar që të ekzekutohet sa herë të duash: nëse e ke lidhur bazën më parë,
   ekzekutoje sërish pas çdo përditësimi — kështu shtohen edhe kodet e porosive dhe funksionet e kërkimit.
   Kjo krijon tabelat, rregullat e sigurisë dhe hapësirën e fotove.
3. **Authentication → Users → Add user** → vendos email-in dhe fjalëkalimin me të cilin do të hysh
   në panel. (Regjistrimi publik mbetet i mbyllur — vetëm ky përdorues shkruan.)
4. **Project Settings → Data API** → kopjo `Project URL` dhe çelësin `anon public` te
   [`shared/config.js`](shared/config.js):

   ```js
   window.SPRINT_CONFIG = {
     SUPABASE_URL: 'https://xxxxxxxx.supabase.co',
     SUPABASE_ANON_KEY: 'eyJhbGciOi...',
     PHOTO_BUCKET: 'photos',
   };
   ```

5. Ribëj publikimin (`git push` — Netlify e ndërton vetë), hap `/admin`, hyr, dhe te skeda
   **Publikimi** shtyp **«Dërgo tani»**. Kjo mbush bazën me 122 pjatët.

> Çelësi `anon` është i sigurt të jetë publik: rregullat e sigurisë lejojnë vetëm **leximin**.
> Çdo shkrim kërkon hyrjen me fjalëkalim.

Pa këtë hap faqja punon njësoj, por me menunë e ngurtë nga `shared/data.js`, dhe paneli ruan
vetëm në atë shfletues (butoni «Provoje pa llogari»).


---

## Vlerësimet nga Google

Faqja i merr **notën, numrin e vlerësimeve dhe vetë vlerësimet drejtpërdrejt nga profili juaj
në Google**. Asgjë nuk shkruhet me dorë dhe asgjë nuk vjetërohet: sa herë dikush hap faqen,
sheh atë që është në Google në atë moment.

### Si lidhet (një herë)

1. Hap [console.cloud.google.com](https://console.cloud.google.com) → krijo një projekt.
2. **APIs & Services → Library** → aktivizo **Places API (New)**.
3. **Credentials → Create credentials → API key.**
4. Kliko çelësin → **Application restrictions → Websites** → shto domain-in e faqes
   (`sprintdurres.al/*` dhe `www.sprintdurres.al/*`). Te **API restrictions** lejo vetëm
   *Places API (New)*.
   Ky hap është i rëndësishëm: i kufizuar kështu, çelësi është i sigurt të jetë publik, sepse
   punon vetëm kur thirret nga faqja juaj.
5. Në panel → **Cilësimet → Vlerësimet nga Google** → ngjit çelësin, shtyp **«Gjej biznesin»**,
   zgjidh SPRINT nga lista dhe shtyp **«Ruaj ndryshimet»**.

Paneli e gjen vetë kodin e vendit (Place ID) — nuk ka nevojë ta kërkosh askund.

### Falas dhe dy detaje

Google kërkon një llogari faturimi te Cloud, por jep një kredi mujore falas që një faqe restoranti
nuk e shteron kurrë — faqja e thërret Google një herë për vizitor, jo një herë për klikim.
Kontrollo çmimet aktuale te [Google Maps Platform Pricing](https://mapsplatform.google.com/pricing/),
sepse ndryshojnë herë pas here.

Dy gjëra për t'i ditur:

- **Google jep maksimumi 5 vlerësime** për çdo vend, dhe i zgjedh vetë — nuk mund të zgjedhësh ti
  cilat të dalin, as të fshihen ato negative. Kjo është edhe arsyeja pse janë të besueshme.
- Vlerësimet shfaqen **në kohë reale, jo të ruajtura**, me emrin e autorit dhe me lidhje drejt
  Google, siç kërkojnë kushtet e tyre.

### Shtesë: adresa, koordinatat dhe orari

Në të njëjtën skedë, butoni **«Merr adresën, koordinatat dhe orarin nga Google»** i mbush vetë ato
tri fusha nga profili juaj — pra edhe tri nga rreshtat që ishin ende bosh te tabela më poshtë.

### Nëse Google nuk lidhet

Faqja nuk prishet: bie te vlerësimet e vendosura me dorë te skeda **Vlerësimet**, dhe nëse edhe ato
janë bosh, shfaq vetëm ftesën për t'ju gjetur në Google. Çelësin mund ta fikësh kur të duash me
çelësin **«Shfaq vlerësimet e Google në faqe»**.

---

## Publikimi në Netlify

1. [netlify.com](https://netlify.com) → **Add new site → Import an existing project** → zgjidh repo-n.
2. Konfigurimi lexohet vetë nga `netlify.toml` (ndërtimi `node build.js`, dosja `dist`).
3. **Domain settings → Add a domain you already own** → shkruaj domain-in.
4. Te regjistruesi ku bleve domain-in, vendos rekordet që të jep Netlify — zakonisht:
   - `A` për domain-in rrënjë → `75.2.60.5`
   - `CNAME` për `www` → `emri-i-sajtit.netlify.app`

   Përdor gjithmonë vlerat që shfaq paneli i Netlify, jo këto nëse ndryshojnë.
5. SSL-ja lëshohet vetë brenda pak minutash.

### Mbroje panelin edhe një shtresë

Hyrja te paneli kërkon fjalëkalimin e Supabase, dhe `/admin` është i shënuar `noindex`.
Për një mbrojtje të dytë, te Netlify: **Site configuration → Access control → Password protection**,
ose një rregull në `netlify.toml` që kërkon fjalëkalim vetëm për `/admin`.

### Ku ta blej domain-in

`.al` blihet te [AKEP](https://akep.al) ose te rishitësit shqiptarë; `.com` te Namecheap,
Porkbun ose Cloudflare. Për një lokal në Durrës, `.al` jep besueshmëri lokale — merr edhe `.com`
nëse është i lirë dhe ridrejtoje te `.al`.

---

## Ndërtimi

Pa varësi, pa `npm install`.

```bash
node build.js                                   # ndërton dist/
cd dist && python3 -m http.server 8899          # hape http://127.0.0.1:8899/
```

### Struktura

```
shared/config.js   ← çelësat e Supabase (këtu i vendos)
shared/data.js     ← menuja fillestare, kontaktet dhe përkthimet
shared/art.js      ← 21 ilustrimet SVG të pjatave
shared/store.js    ← lidhja me Supabase: menuja, porositë, rezervimet, fotot
shared/reviews.js  ← vlerësimet dhe të dhënat e vendit nga Google Places
shared/app.js      ← motori: filtra, kërkim, shportë, WhatsApp, rezervim, dygjuhësia
src/site.html      ← faqja zyrtare
src/admin.html     ← pamja e panelit
src/admin.js       ← logjika e panelit
supabase/schema.sql← skema e bazës, rregullat e sigurisë dhe hapësira e fotove
mockups/           ← të pesë drejtimet e fazës 1
build.js           ← bashkon gjithçka në dist/
```

Përmbajtja lexohet nga Supabase **pasi** faqja është shfaqur, ndaj vizitori sheh menunë
menjëherë edhe në internet të ngadaltë; pastaj ajo zëvendësohet pa u dridhur.

---

## Gjendja e të dhënave

| Çfarë | Gjendja |
|-------|---------|
| Menuja — 122 artikuj me çmime | ✅ Reale, nga menuja zyrtare |
| Telefoni / WhatsApp | ✅ 069 666 7000 |
| Instagram | ✅ [@sprint_restorant_fast_pizza](https://www.instagram.com/sprint_restorant_fast_pizza/) |
| Ngjyrat e brand-it | ✅ Portokalli · e zezë · krem |
| Salla e eventeve | ✅ Seksion i vetin + zgjedhje te rezervimi |
| Fotot e pjatave | ⛔ Ngarkohen ose bëhen me kamerë nga paneli — deri atëherë, ilustrime |
| Adresa dhe koordinatat | ⛔ Vendosen te skeda «Cilësimet» |
| Orari i plotë | ⛔ Vetëm 09:00–15:00 për tavat është i konfirmuar |
| Tarifa e dërgesës | ⛔ Bosh → shporta shfaq «Sipas zonës» |
| Email për rezervimet | ⛔ Bosh → butoni i email-it fshihet vetë |
| Porositë dhe rezervimet | ✅ Regjistrohen dhe menaxhohen te paneli |
| Vlerësimet | ✅ Vijnë nga Google — mjafton çelësi te «Cilësimet» |

### Vlerësimet

Me çelësin e Google të vendosur, vlerësimet vijnë vetë nga profili juaj dhe skeda «Vlerësimet»
mbetet vetëm si rrugë rezervë. Pa çelës, ajo skedë përmban tekst bosh vendmbajtës që duhet
zëvendësuar me vlerësime të vërteta — mos e lër faqen të dalë online me vlerësime të shpikura.
