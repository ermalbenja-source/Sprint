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
- **Shportë → WhatsApp** — klienti ndërton porosinë dhe e dërgon të formatuar te 069 666 7000.
  Shporta ruhet edhe nëse mbyllet faqja.
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

**Ndryshim çmimesh me shumicë:** zgjidh kategorinë, shkruaj përqindjen dhe shtyp «Rrit» ose «Ul» —
p.sh. të gjitha picat +10% me një klikim.

**Fotot** zvogëlohen vetë në 1200 px dhe ngjeshen në shfletues para ngarkimit, që faqja të mos rëndohet.

Asgjë nuk del te klientët derisa të shtypet **«Ruaj ndryshimet»**. Sa herë ka diçka të paruajtur,
poshtë shfaqet një shirit me numrin e ndryshimeve dhe butonin «Anulo».

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
shared/store.js    ← lidhja me Supabase: leximi, shkrimi, ngarkimi i fotove
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
| Vlerësimet | ⛔ Tekst vendmbajtës — **zëvendësoji para se faqja të dalë online** |

### ⚠️ Vlerësimet

Vlerësimet e paravendosura janë tekst bosh vendmbajtës, jo review reale. Zëvendësoji te skeda
«Vlerësimet» me vlerësime të vërteta nga Google ose Facebook përpara publikimit — mos e lër faqen
të dalë online me vlerësime të shpikura.
