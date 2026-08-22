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
