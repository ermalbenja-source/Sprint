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
- **Ndjekje porosie** — çdo porosi merr një link me hapat dhe kohëmatësin e gjallë.
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
| **Menuja** | Çmimin direkt në listë, ose gjithçka te sirtari: emrin, përshkrimin, kategorinë, etiketat, njësinë (`/copë`), shënimin (`09:00–15:00`), renditjen, foton. Fsheh një pjatë me një çelës pa e fshirë. |
| **Kategoritë** | Emrat në të dyja gjuhët dhe renditjen — e njëjta renditje del te fetat e rrotës. |
| **Cilësimet** | Telefonin, WhatsApp-in, email-in, adresën, koordinatat, tarifën e dërgesës, orarin, rrjetet sociale, tekstin dhe foton e sallës. |
| **Vlerësimet** | Shton, ndryshon dhe fshin vlerësimet që dalin në faqe. |
| **Publikimi** | Dërgon gjithçka në Supabase, shkarkon një kopje JSON, rikthen një kopje ose kthen menunë fillestare. |

Dy skedat e para — **Porositë** dhe **Rezervimet** — janë ekrani i punës së përditshme; shih më sipër.

**Ndryshim çmimesh me shumicë:** zgjidh kategorinë, shkruaj përqindjen dhe shtyp «Rrit» ose «Ul» —
p.sh. të gjitha picat +10% me një klikim.

**Fotot** zvogëlohen vetë në 1200 px dhe ngjeshen në shfletues para ngarkimit, që faqja të mos rëndohet.

Asgjë nuk del te klientët derisa të shtypet **«Ruaj ndryshimet»**. Sa herë ka diçka të paruajtur,
poshtë shfaqet një shirit me numrin e ndryshimeve dhe butonin «Anulo».


---

## Porositë dhe rezervimet

Porosia **shkruhet në bazë përpara** se të hapet WhatsApp-i, që të mos humbasë asnjë edhe nëse
klienti nuk e dërgon mesazhin.

### Si e bën klienti

1. Ndërton shportën dhe shtyp «Dërgo porosinë në WhatsApp».
2. Hapet arka: me dërgesë apo marr vetë, emri, telefoni, adresa, kur e do, si paguan, shënim.
3. Porosia regjistrohet dhe merr një numër (`#1042`). Shporta pastrohet vetë.
4. Klienti sheh dy butona: **Hap WhatsApp** (mesazhi del i gatshëm, me numrin e porosisë) dhe
   **Ndiq porosinë**.

### Ndjekja nga klienti

Linku `sajti-yt.al/?p=KODI` hap një faqe ndjekjeje me hapat e porosisë, kohëmatësin e gjallë dhe
listën e pjatave. Përpara pranimit numëron kohën që ka kaluar; pas pranimit numëron **mbrapsht**
drejt kohës që i ke premtuar, dhe kalon në të kuqe kur kalon afati. Gjendja rifreskohet vetë çdo
30 sekonda.

Faqja e ndjekjes kthen vetëm fusha jo-personale (numri, gjendja, koha, pjatët) dhe vetëm për një
kod të saktë — jo emrin, telefonin apo adresën e askujt.

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
| Fotot e pjatave | ⛔ Ngarkohen nga paneli — deri atëherë, ilustrime |
| Adresa dhe koordinatat | ⛔ Vendosen te skeda «Cilësimet» |
| Orari i plotë | ⛔ Vetëm 09:00–15:00 për tavat është i konfirmuar |
| Tarifa e dërgesës | ⛔ Bosh → shporta shfaq «Sipas zonës» |
| Email për rezervimet | ⛔ Bosh → butoni i email-it fshihet vetë |
| Porositë dhe rezervimet | ✅ Regjistrohen dhe menaxhohen te paneli |
| Vlerësimet | ⛔ Tekst vendmbajtës — **zëvendësoji para se faqja të dalë online** |

### ⚠️ Vlerësimet

Vlerësimet e paravendosura janë tekst bosh vendmbajtës, jo review reale. Zëvendësoji te skeda
«Vlerësimet» me vlerësime të vërteta nga Google ose Facebook përpara publikimit — mos e lër faqen
të dalë online me vlerësime të shpikura.
