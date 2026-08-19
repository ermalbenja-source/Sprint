# Materialet reale

Këtu vendosen fotot, videot dhe logoja e biznesit. Gjithçka në këtë dosje
kopjohet automatikisht te `dist/assets/` kur ekzekutohet `node build.js`.

## Fotot e pjatave — `assets/dishes/`

Emërtoji sipas `id`-së së pjatës te `shared/data.js`, p.sh. `p1.jpg` për Margheritën.
Pastaj shto fushën `img` te ajo pjatë:

```js
{ id:'p1', c:'pizza', art:'pizza', img:'assets/dishes/p1.jpg', sq:'Margherita', … }
```

Nëse `img` mungon, faqja përdor ilustrimin SVG — asgjë nuk prishet.

**Specifikat:** katrore ose 4:3 · 1200 px anë · JPG ose WebP · nën 200 KB ·
ushqimi në qendër, sfond i thjeshtë, dritë natyrale.

## Logoja — `assets/logo.svg` ose `assets/logo.png`

SVG është ideale (mprehtë në çdo madhësi). Nëse ke vetëm PNG, dërgoje me sfond
transparent dhe të paktën 512 px të gjerë. Nga logoja nxirren edhe ngjyrat e sakta
të brand-it për t'i zëvendësuar variablat `--red` dhe `--gold` te secili mockup.

## Videot — `assets/video/`

MP4 (H.264) nën 6 MB, pa zë, 10–20 sekonda. Përdoren si sfond i hero-s.
Dërgo edhe një kuadër të parë si `poster.jpg`.

## Ambienti dhe ekipi — `assets/place/`

Foto të sallës, terracës, furrës së drurit dhe stafit. Përdoren te seksioni
"Rreth Nesh" dhe te kontakti.
