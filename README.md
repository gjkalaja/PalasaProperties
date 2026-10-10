# Palasa Properties

Sistem menaxhimi për vila dhe apartamente me qira ditore (PMS): faqe publike me katalog dhe kërkesa për rezervim, panel administrimi, aplikacion për stafin e pastrimit, portal për pronarët dhe sinkronizim kalendari me Booking.com dhe Airbnb.

**Teknologjia:** Next.js 15 (App Router, Server Actions) · TypeScript · Tailwind CSS 4 · PostgreSQL · Prisma 6

## Modulet

| Moduli | Ku ndodhet | Kush e sheh |
|---|---|---|
| Katalogu publik: filtra sipas tipologjisë (Studio, 1+1, 2+1, 3+1, Vilë, Vilë me pishinë, Shtëpi), karta me foto që ndërrohen kur kalon mausin ose me swipe, shirit 14-ditor i disponueshmërisë, distanca nga deti | `/` | Të gjithë |
| Faqja e pronës: galeri, pajisjet, kalendar me çmimin e çdo dite dhe totali i llogaritur menjëherë, kërkesë për rezervim | `/prona/[slug]` | Të gjithë |
| "Shto pronën tënde" (formular kontakti) | `/bashkohu` | Të gjithë |
| Paneli: pllaka live (e zënë / mbërrin / largohet / në pastrim / e lirë), zënia, të ardhurat, ADR, paralajmërim për rezervime që përplasen | `/admin` | Admin, Menaxher |
| Kalendari i përbashkët (timeline, një rresht për pronë, ngjyra sipas kanalit) | `/admin/kalendari` | Admin, Menaxher |
| Rezervimet: çmimi llogaritet automatikisht, pagesat, mesazhet sipas shablloneve, WhatsApp, Google Calendar | `/admin/rezervimet` | Admin, Menaxher |
| Kërkesat: kërkesat për rezervim, kërkesat e pronarëve për ditë personale (aprovo/refuzo), pronarët e rinj | `/admin/kerkesat` | Admin, Menaxher |
| Detyrat: pastrim automatik pas çdo largimi, listë kontrolli, caktim stafi, WhatsApp, Google Calendar | `/admin/detyrat` | Admin, Menaxher |
| Pronat: fotot, çmimet sezonale, lidhjet iCal, kodi i derës/Wi-Fi, pastruesi i paracaktuar | `/admin/prona` | Admin, Menaxher |
| Mysafirët (CRM): historiku, dokumentet, VIP, listë e zezë | `/admin/mysafiret` | Admin, Menaxher |
| Shabllonet e mesazheve (SQ/EN me variabla) | `/admin/mesazhet` | Admin, Menaxher |
| Financat: bruto, komisionet, neto për pronarin, shpenzimet, fitimi, eksport Excel | `/admin/financat` | Vetëm Admin |
| Përdoruesit dhe rolet, komisioni për çdo pronar | `/admin/perdoruesit` | Vetëm Admin |
| Aplikacioni i stafit (për telefon): detyrat e ditës, lista e kontrollit, navigimi, raportimi i defekteve | `/staf` | Pastruesit |
| Portali i pronarit: të ardhurat (bruto → komisionet → neto), disponueshmëria, kërkesë për ditë personale | `/pronari` | Pronarët |

Sistemi është në dy gjuhë, Shqip dhe Anglisht. Gjuha ndërrohet me butonin SQ/EN.

## Nisja lokale

```bash
cp .env.example .env          # plotësoni DATABASE_URL dhe AUTH_SECRET
npm install
npm run db:push               # krijon tabelat
npm run db:seed               # të dhëna demo (FSHIN të dhënat ekzistuese!)
npm run dev                   # http://localhost:3000
```

### Llogaritë demo

| Roli | Email | Fjalëkalimi |
|---|---|---|
| Administrator | admin@palasa.al | admin123 |
| Menaxher | menaxher@palasa.al | menaxher123 |
| Staf pastrimi | pastrim@palasa.al | staf123 |
| Pronar | pronar@palasa.al | pronar123 |

> Para se ta vini në punë me të dhëna reale, ndryshoni fjalëkalimet dhe `AUTH_SECRET`.

## Sinkronizimi me Booking.com dhe Airbnb (iCal)

1. **Nga ne → te kanalet:** te faqja e çdo prone (`/admin/prona/…`) gjenden dy linke eksporti, një për Booking dhe një për Airbnb. Linkun e parë e ngjitni te Booking.com (*Rates & Availability → Sync calendars*), të dytin te Airbnb (*Calendar → Availability → Connect another calendar*). Secili link e lë jashtë kanalin ku ngjitet, që rezervimet të mos kthehen pas te vetja.
2. **Nga kanalet → te ne:** eksportoni linkun `.ics` nga Booking.com dhe Airbnb dhe ngjiteni te seksioni "Kalendarët që importohen".
3. **Sinkronizimi automatik:** thirrni `GET /api/cron/ical-sync` me header-in `Authorization: Bearer $CRON_SECRET` çdo 15–30 minuta, p.sh. me crontab, cron-job.org ose Vercel Cron (`vercel.json`; në planin falas të Vercel cron-i ekzekutohet vetëm një herë në ditë).

Kufizimet e iCal: sinkronizohen vetëm datat, jo emrat e mysafirëve dhe as çmimet. Booking dhe Airbnb e lexojnë linkun tonë sipas ritmit të tyre, zakonisht çdo 1–3 orë. Rezervimet e importuara mund t'i plotësoni me emrin e mysafirit dhe çmimin, dhe sinkronizimi nuk i mbishkruan. Nëse një rezervim zhduket nga kanali, anulohet automatikisht. Nëse dy rezervime përplasen, paneli shfaq paralajmërim.

## Llogaritja e të ardhurave të pronarit

- **Bruto** = akomodimi + pastrimi
- **Komisioni i menaxhimit** = (akomodimi − komisioni i platformës) × % e pronarit
- **Neto për pronarin** = akomodimi − komisioni i platformës − komisioni i menaxhimit − shpenzimet që i ngarkohen pronarit
- Tarifa e pastrimit mbetet te menaxhimi.
- Raportet mujore ndajnë qëndrimet që kalojnë nga një muaj në tjetrin sipas numrit të netëve në secilin muaj.

## Vendosja online

- Funksionon në çdo server me Node.js 20+ dhe PostgreSQL: `npm run build && npm start`.
- Fotot ruhen te `public/uploads`. Në hosting pa disk të përhershëm (p.sh. Vercel) duhet ndërruar `src/lib/storage.ts` me S3 ose Cloudinary.
- Vendosni `APP_URL` me domain-in real, sepse përdoret te linket iCal dhe te mesazhet WhatsApp.

## Testet

```bash
npm test        # çmimet, disponueshmëria, iCal, linket WhatsApp/Google, financat
npm run lint    # kontrolli i tipeve
```

## Hapat e ardhshëm (Faza 3–4)

- Lidhje me channel manager (Channex/Beds24) për sinkronizim në kohë reale të çmimeve dhe disponueshmërisë
- Drag & drop i rezervimeve në kalendar
- Dërgim automatik i WhatsApp-it (WhatsApp Business API) dhe email-eve
- Raport mujor PDF për pronarët
