# SPRINT mbi kompjuterin e dyqanit

I njëjti program që do të punojë online, por i ngritur mbi kompjuterin tënd.
Të dhënat rrinë këtu, jo diku tjetër, dhe programi punon edhe kur bie interneti.

## Çfarë duhet

Vetëm **Node.js 22** ose më i ri, nga [nodejs.org](https://nodejs.org).
Asgjë tjetër: baza SQLite vjen brenda Node-it, dhe programi nuk shkarkon
asnjë bibliotekë.

## Si niset

**Windows** — kliko dy herë mbi `local\start.bat`.

**Mac ose Linux** — hap terminalin te dosja e programit dhe shkruaj:

```bash
bash local/start.sh
```

Herën e parë krijohet llogaria e pronarit. Email-i dhe fjalëkalimi shfaqen në
ekran dhe ruhen te `local/te-dhenat/hyrja.txt`. **Ndryshoje fjalëkalimin sapo
të hysh.**

## Ku hapet

Serveri të thotë vetë adresat kur niset:

| Kush | Ku hyn |
|---|---|
| Klientët | `http://ADRESA:8787` |
| Ti, te paneli | `http://ADRESA:8787/admin` — me email dhe fjalëkalim |
| Kuzhina, furra e picës dhe motorristët | `http://ADRESA:8787/staf` — vetëm me kod |

Mbi vetë kompjuterin adresa është `localhost`. **Nga tableti i kuzhinës, ai i
furrës dhe telefonat e motorristëve** përdor adresën tjetër që shfaqet — ajo që
fillon me `192.168...` — dhe kujdes që të gjitha pajisjet të jenë në të njëjtin WiFi.

Të gjithë hyjnë te i njëjti link. Ajo që u hapet varet nga roli dhe nga tabela
«Kush sheh çfarë» te paneli: kuzhinieri sheh kuzhinën, piceri furrën, motorristi
nisjen. Çfarë gatuhet ku e vendos ti te **Paneli → Gatimi**.

Te paneli, përveç porosive dhe menusë, ke edhe:

| Skeda | Për çfarë |
|---|---|
| **Gatimi** | çfarë del nga kuzhina dhe çfarë nga furra e picës |
| **Magazina** | gjendja, furnitorët dhe recetat |
| **Blerjet** | fatura e furnitorit → gjendja rritet vetvetiu |
| **Raportet** | xhiroja e ditës, java, motorristët, pjatat më të shitura |

Gjendja e magazinës nuk shkruhet me dorë: llogaritet nga lëvizjet. Kur numri te
rafti nuk përputhet, shtyp «Numërim» dhe shkruaj sa gjete — programi e barazon
dhe e lë gjurmën, pa fshirë asgjë.

## Fletët e printuara

Te çdo porosi ke katër butona: **Fletë porosie**, **Kuzhina**, **Furra**,
**Fletë dorëzimi**. Kuzhina dhe furra marrin secila vetëm rreshtat e veta;
fleta e dorëzimit mban adresën, telefonin dhe sa para të arkëtohen.

Fletët dalin në gjerësi 80 mm — sa rrotulla e printerit termik. Të gjitha janë
**dokumente të brendshme** dhe e mbajnë këtë shënim në fund: fatura tatimore
lëshohet nga programi yt i certifikuar, jo nga ky.

## Zonat e dërgesës

Durrësi është 8 × 11 km. Në një qytet kaq të vogël radha matematikore e
ndalesave ndryshon pak minuta — ajo që ndryshon shumë është të mos shkosh
Plazh, të kthehesh Shkozet dhe të ngjitesh sërish Plazh.

Te **Paneli → Zonat** ke gjashtë zona fillestare me fjalët e tyre kyçe. Zona
caktohet në dy mënyra:

1. **Fjalët e adresës** — punon që në porosinë e parë, pa asnjë koordinatë.
   «Te plazhi, pallati 7» → Plazh.
2. **Kufiri i vizatuar** — kliko mbi hartë për të vendosur qoshet. Kur pika
   njihet, kufiri merr përparësi mbi fjalët.

Motorristi i sheh ndalesat të grupuara sipas zonës, zonat sipas afërsisë nga
dyqani, dhe brenda zonës gjithmonë te më e afërta. Numri i madh te çdo ndalesë
thotë nga t'ia nisë. Nuk është urdhër — vetëm propozim.

**Harta që mëson.** Në çastin që motorristi shtyp «U dorëzua», telefoni i tij
është te dera. Ajo pikë i ngjitet adresës së klientit, dhe herën tjetër që i
njëjti numër telefonon, e dimë saktësisht ku është. Pas dy-tri javësh adresat e
shpeshta i kanë pikat e sakta — pa kërkuar askund, pa paguar asgjë, pa i shtuar
askujt asnjë sekondë pune.

## Njoftimet

Butoni **🔔 Njoftime** te ekrani i stafit ka dy gjendje, dhe e thotë hapur cilën
ka ndezur:

- **🔔 Njoftime** — njoftim i vërtetë, del edhe kur faqja është e mbyllur dhe
  telefoni në xhep. Kjo është ajo që i duhet motorristit.
- **🔊 Zile** — zilja dhe dridhja brenda faqes, plus ekrani që nuk fiket.
  Punon kudo, sa kohë ekrani rri hapur — si tableti i murit te kuzhina.

**Pse ndonjëherë del vetëm «Zile»:** shfletuesi i lejon njoftimet e vërteta
vetëm mbi **HTTPS** ose te **localhost**. Në rrjetin lokal me
`http://192.168…` nuk ndizen dot — ky është rregull i shfletuesit, jo zgjedhje
e programit. Te vetë kompjuteri ku punon serveri, njoftimet punojnë; nga tableti
apo telefoni në WiFi, punon zilja. Kur të kalojmë online me HTTPS, njoftimet
ndizen kudo pa ndryshuar asgjë.

Te iPhone kërkohet edhe që faqja të jetë shtuar në **ekranin bazë**
(Share → Add to Home Screen) — Apple i lejon njoftimet vetëm atëherë.

Këshillë: ruaje adresën si faqe fillestare te tableti, dhe në telefonat e
motorristëve shtoje në ekranin bazë. Sesioni mbahet 30 ditë, ndaj kodi nuk
shkruhet çdo turn.

## Ku janë të dhënat

Gjithçka rri në një skedar të vetëm:

```
local/te-dhenat/sprint.db
```

**Kopja rezervë është kopjimi i atij skedari.** Kopjoje çdo mbrëmje në një USB
ose në një dosje në re. Nëse ndonjëherë duhet të kthehesh mbrapa, ndal
programin, vendos skedarin e vjetër në vend të tij, dhe nise sërish.

## Ç'ndodh kur bie interneti

Asgjë. Programi punon mbi rrjetin e dyqanit, jo mbi internetin. Interneti duhet
vetëm për dy gjëra:

- pllakat e hartës te ndarja e vendndodhjes;
- linkun e WhatsApp-it drejt klientit.

Porositë, kuzhina, motorristët dhe e gjithë puna vazhdojnë pa të.

## Nëse porti 8787 është i zënë

```bash
SPRINT_PORT=9000 node local/server.js
```

Te Windows, në PowerShell:

```powershell
$env:SPRINT_PORT=9000; node local\server.js
```

## Nga këtu tutje

Ky është hapi ku vendosim bashkë si vazhdojmë. Tri rrugë, të gjitha të hapura
nga këtu:

1. **Rri lokal.** Mjafton për një dyqan me një pikë. Kopja rezervë bëhet me dorë.
2. **Bëhet aplikacion i vërtetë** me ikonë dhe instalues `.exe`, që të mos hapet
   nga terminali. Kodi është i njëjti; ndryshon vetëm mbështjellja.
3. **Kalon online** me Supabase, që të punojë edhe kur nuk je në dyqan. Faqja
   është e njëjta — ndryshon vetëm `shared/config.js`.

Asnjë prej tyre nuk e mbyll tjetrën. Programi u ndërtua që të mos e detyrojë
vendimin tani.
