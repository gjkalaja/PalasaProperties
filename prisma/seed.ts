// Demo data. Run with: npm run db:seed  (wipes existing data!)
import { PrismaClient, type BookingSource, type PropertyType } from "@prisma/client";
import bcrypt from "bcryptjs";
import { addDays, today } from "../src/lib/dates";
import { quoteStay } from "../src/lib/pricing";
import { atLocalTime } from "../src/lib/links";

const db = new PrismaClient();

let seed = 42;
const rand = () => {
  seed = (seed * 1664525 + 1013904223) % 4294967296;
  return seed / 4294967296;
};
const pick = <T,>(arr: readonly T[]): T => arr[Math.floor(rand() * arr.length)];
const between = (a: number, b: number) => Math.floor(a + rand() * (b - a + 1));

const CHECKLIST = [
  "Ndërro çarçafët dhe peshqirët",
  "Pastro banjot",
  "Pastro kuzhinën dhe frigoriferin",
  "Fshi dhe laj dyshemetë",
  "Hidh mbeturinat",
  "Kontrollo për dëmtime",
  "Plotëso furnizimet (sapun, letër, kafe)",
];

type Spec = {
  name: string;
  type: PropertyType;
  city: string;
  sea: number;
  price: number;
  guests: number;
  bedrooms: number;
  beds: number;
  baths: number;
  area: number;
  amenities: string[];
};

const base = ["wifi", "ac", "kitchen", "tv"];
const specs: Spec[] = [
  { name: "Vila Kaltra", type: "VILLA_POOL", city: "Palasë", sea: 250, price: 320, guests: 8, bedrooms: 4, beds: 5, baths: 3, area: 240, amenities: [...base, "pool", "seaView", "parking", "terrace", "bbq", "garden", "washer"] },
  { name: "Vila Ulliri", type: "VILLA_POOL", city: "Palasë", sea: 600, price: 280, guests: 10, bedrooms: 5, beds: 6, baths: 4, area: 300, amenities: [...base, "pool", "parking", "garden", "bbq", "washer", "pets"] },
  { name: "Vila Guri i Bardhë", type: "VILLA", city: "Dhërmi", sea: 150, price: 240, guests: 6, bedrooms: 3, beds: 4, baths: 2, area: 160, amenities: [...base, "seaView", "terrace", "parking", "beach"] },
  { name: "Vila Perëndimi", type: "VILLA_POOL", city: "Dhërmi", sea: 400, price: 360, guests: 8, bedrooms: 4, beds: 4, baths: 4, area: 260, amenities: [...base, "pool", "seaView", "jacuzzi", "parking", "terrace", "bbq"] },
  { name: "Shtëpia e Peshkatarit", type: "HOUSE", city: "Himarë", sea: 60, price: 140, guests: 5, bedrooms: 2, beds: 3, baths: 1, area: 90, amenities: [...base, "seaView", "terrace", "beach"] },
  { name: "Apartament Blu 2+1", type: "APT_2_1", city: "Himarë", sea: 120, price: 95, guests: 5, bedrooms: 2, beds: 3, baths: 1, area: 80, amenities: [...base, "seaView", "washer", "terrace"] },
  { name: "Studio Riva", type: "STUDIO", city: "Himarë", sea: 200, price: 55, guests: 2, bedrooms: 0, beds: 1, baths: 1, area: 32, amenities: [...base, "workspace"] },
  { name: "Apartament Livadhi 1+1", type: "APT_1_1", city: "Himarë", sea: 90, price: 75, guests: 3, bedrooms: 1, beds: 2, baths: 1, area: 55, amenities: [...base, "seaView", "terrace"] },
  { name: "Vila Ftoi", type: "VILLA", city: "Palasë", sea: 900, price: 210, guests: 7, bedrooms: 3, beds: 5, baths: 2, area: 180, amenities: [...base, "garden", "bbq", "parking", "pets"] },
  { name: "Apartament Jon 3+1", type: "APT_3_1", city: "Vlorë", sea: 300, price: 120, guests: 7, bedrooms: 3, beds: 4, baths: 2, area: 120, amenities: [...base, "seaView", "washer", "parking", "heating"] },
  { name: "Apartament Lungomare 2+1", type: "APT_2_1", city: "Vlorë", sea: 50, price: 110, guests: 5, bedrooms: 2, beds: 3, baths: 2, area: 90, amenities: [...base, "seaView", "washer", "terrace", "heating"] },
  { name: "Studio Sazani", type: "STUDIO", city: "Vlorë", sea: 400, price: 45, guests: 2, bedrooms: 0, beds: 1, baths: 1, area: 30, amenities: [...base, "workspace", "heating"] },
  { name: "Apartament Kanina 1+1", type: "APT_1_1", city: "Vlorë", sea: 700, price: 60, guests: 3, bedrooms: 1, beds: 2, baths: 1, area: 50, amenities: [...base, "parking", "heating"] },
  { name: "Vila Ksamili", type: "VILLA_POOL", city: "Ksamil", sea: 180, price: 300, guests: 8, bedrooms: 4, beds: 5, baths: 3, area: 220, amenities: [...base, "pool", "seaView", "parking", "terrace", "bbq"] },
  { name: "Apartament Ishujt 2+1", type: "APT_2_1", city: "Ksamil", sea: 100, price: 105, guests: 4, bedrooms: 2, beds: 2, baths: 1, area: 75, amenities: [...base, "seaView", "terrace"] },
  { name: "Apartament Butrinti 1+1", type: "APT_1_1", city: "Ksamil", sea: 350, price: 70, guests: 3, bedrooms: 1, beds: 2, baths: 1, area: 48, amenities: [...base, "parking"] },
  { name: "Vila Limani", type: "VILLA", city: "Sarandë", sea: 80, price: 230, guests: 6, bedrooms: 3, beds: 3, baths: 2, area: 150, amenities: [...base, "seaView", "terrace", "parking", "heating"] },
  { name: "Apartament Lëkurësi 3+1", type: "APT_3_1", city: "Sarandë", sea: 450, price: 115, guests: 6, bedrooms: 3, beds: 4, baths: 2, area: 110, amenities: [...base, "seaView", "washer", "heating"] },
  { name: "Studio Promenada", type: "STUDIO", city: "Sarandë", sea: 30, price: 60, guests: 2, bedrooms: 0, beds: 1, baths: 1, area: 28, amenities: [...base, "seaView"] },
  { name: "Vila Llogara", type: "VILLA_POOL", city: "Palasë", sea: 1200, price: 260, guests: 9, bedrooms: 4, beds: 6, baths: 3, area: 280, amenities: [...base, "pool", "garden", "bbq", "parking", "jacuzzi", "heating"] },
  { name: "Apartament Gjiri 2+1", type: "APT_2_1", city: "Dhërmi", sea: 220, price: 125, guests: 5, bedrooms: 2, beds: 3, baths: 2, area: 85, amenities: [...base, "seaView", "terrace", "washer"] },
  { name: "Shtëpia me Limona", type: "HOUSE", city: "Dhërmi", sea: 500, price: 160, guests: 6, bedrooms: 3, beds: 3, baths: 2, area: 130, amenities: [...base, "garden", "bbq", "parking", "pets"] },
];

const firstNames = ["Arben", "Elira", "Marco", "Giulia", "Jonas", "Anna", "Piotr", "Kasia", "Erion", "Sara", "Luca", "Emma", "Dritan", "Ledia", "Tom", "Sophie", "Andi", "Klea", "Hans", "Marta"];
const lastNames = ["Hoxha", "Rossi", "Müller", "Kowalski", "Shehu", "Bianchi", "Smith", "Krasniqi", "Weber", "Nowak", "Leka", "Ricci"];
const nationalities = ["AL", "IT", "DE", "PL", "XK", "GB", "FR", "AT"];

const slugify = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/ë/g, "e")
    .replace(/ç/g, "c")
    .replace(/\+/g, "-")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

async function main() {
  console.log("Clearing data…");
  await db.$transaction([
    db.payment.deleteMany(),
    db.task.deleteMany(),
    db.booking.deleteMany(),
    db.icalFeed.deleteMany(),
    db.expense.deleteMany(),
    db.inquiry.deleteMany(),
    db.seasonalRate.deleteMany(),
    db.propertyImage.deleteMany(),
    db.property.deleteMany(),
    db.guest.deleteMany(),
    db.ownerLead.deleteMany(),
    db.messageTemplate.deleteMany(),
    db.user.deleteMany(),
  ]);

  const hash = (p: string) => bcrypt.hash(p, 10);
  const admin = await db.user.create({
    data: { name: "Administratori", email: "admin@palasa.al", phone: "0690000001", role: "ADMIN", passwordHash: await hash("admin123") },
  });
  await db.user.create({
    data: { name: "Erion Menaxheri", email: "menaxher@palasa.al", phone: "0690000002", role: "MANAGER", passwordHash: await hash("menaxher123") },
  });
  const cleaners = await Promise.all(
    [
      ["Mira Pastrimi", "pastrim@palasa.al", "0690000011"],
      ["Besa Kola", "besa@palasa.al", "0690000012"],
      ["Vera Duka", "vera@palasa.al", "0690000013"],
    ].map(async ([name, email, phone]) =>
      db.user.create({ data: { name, email, phone, role: "CLEANER", passwordHash: await hash("staf123") } }),
    ),
  );
  const owners = await Promise.all(
    [
      ["Agim Pronari", "pronar@palasa.al", "0690000021", 20],
      ["Lindita Çela", "lindita@palasa.al", "0690000022", 22],
      ["Gezim Dervishi", "gezim@palasa.al", "0690000023", 18],
      ["Marina Rossi", "marina@palasa.al", "393331234567", 25],
    ].map(async ([name, email, phone, rate]) =>
      db.user.create({
        data: { name: name as string, email: email as string, phone: phone as string, role: "OWNER", commissionRate: rate as number, passwordHash: await hash("pronar123") },
      }),
    ),
  );

  console.log("Creating properties…");
  const t0 = today();
  const year = t0.getUTCFullYear();
  const properties = [];
  for (let i = 0; i < specs.length; i++) {
    const s = specs[i];
    const isVilla = s.type.startsWith("VILLA") || s.type === "HOUSE";
    const p = await db.property.create({
      data: {
        slug: slugify(s.name),
        name: s.name,
        type: s.type,
        city: s.city,
        address: `${s.city}, Bregdeti i Jonit`,
        summarySq: isVilla
          ? `${s.bedrooms} dhoma gjumi, ${s.sea} m nga deti, ideale për familje dhe grupe miqsh.`
          : `Apartament i ndriçuar në ${s.city}, vetëm ${s.sea} m nga deti.`,
        summaryEn: isVilla
          ? `${s.bedrooms} bedrooms, ${s.sea} m from the sea, perfect for families and groups of friends.`
          : `Bright apartment in ${s.city}, just ${s.sea} m from the sea.`,
        descriptionSq: `${s.name} ndodhet në ${s.city}, një nga zonat më të bukura të Rivierës Shqiptare. Hapësira është e mobiluar me kujdes, me materiale natyrale dhe dritë të bollshme.\n\nMëngjeset kalojini në tarracë me kafe, ditët në plazh dhe mbrëmjet me perëndimin mbi Jon. Plazhi është ${s.sea} metra larg, ndërsa restorantet dhe dyqanet janë në pak minuta.`,
        descriptionEn: `${s.name} is located in ${s.city}, one of the most beautiful areas of the Albanian Riviera. The space is thoughtfully furnished with natural materials and plenty of light.\n\nSpend your mornings with coffee on the terrace, days at the beach and evenings watching the sunset over the Ionian. The beach is ${s.sea} metres away, with restaurants and shops minutes away.`,
        maxGuests: s.guests,
        bedrooms: s.bedrooms,
        beds: s.beds,
        bathrooms: s.baths,
        areaM2: s.area,
        distanceToSeaM: s.sea,
        amenities: s.amenities,
        basePrice: s.price,
        weekendPrice: Math.round(s.price * 1.15),
        cleaningFee: isVilla ? 80 : 35,
        minNights: isVilla ? 3 : 2,
        checkInTime: "15:00",
        checkOutTime: "11:00",
        wifiName: `Palasa-${i + 1}`,
        wifiPassword: `pushime${2000 + i}`,
        doorCode: String(1000 + Math.floor(rand() * 9000)),
        ownerId: owners[i % owners.length].id,
        cleanerId: cleaners[i % cleaners.length].id,
        images: {
          create: [1, 2, 3, 4].map((n, pos) => ({ url: `/demo/p${i + 1}-${n}.svg`, position: pos })),
        },
        rates: {
          create: [
            { name: "Sezoni i verës", startDate: new Date(Date.UTC(year + 1, 5, 15)), endDate: new Date(Date.UTC(year + 1, 8, 15)), pricePerNight: Math.round(s.price * 1.5), minNights: isVilla ? 5 : 3 },
            { name: "Pik i gushtit", startDate: new Date(Date.UTC(year + 1, 7, 1)), endDate: new Date(Date.UTC(year + 1, 7, 20)), pricePerNight: Math.round(s.price * 1.9), weekendPrice: Math.round(s.price * 2.1), minNights: 7 },
            { name: "Festat e fundvitit", startDate: new Date(Date.UTC(year, 11, 22)), endDate: new Date(Date.UTC(year + 1, 0, 3)), pricePerNight: Math.round(s.price * 1.3), minNights: 3 },
            { name: "Sezoni i ulët", startDate: new Date(Date.UTC(year, 9, 15)), endDate: new Date(Date.UTC(year, 11, 21)), pricePerNight: Math.round(s.price * 0.75) },
          ],
        },
      },
      include: { rates: true },
    });
    properties.push(p);
  }

  console.log("Creating guests & bookings…");
  const guests = [];
  for (let i = 0; i < 40; i++) {
    const fn = pick(firstNames);
    const ln = pick(lastNames);
    guests.push(
      await db.guest.create({
        data: {
          name: `${fn} ${ln}`,
          email: `${slugify(fn)}.${slugify(ln)}${i}@example.com`,
          phone: `+3556${between(7, 9)}${between(1000000, 9999999)}`,
          nationality: pick(nationalities),
          documentType: pick(["Pasaportë", "ID"]),
          documentNumber: `${pick(["BA", "AA", "YA", "C0"])}${between(100000, 999999)}`,
          vip: i % 13 === 0,
          blacklisted: i === 37,
          notes: i % 9 === 0 ? "Preferon check-in të vonë." : null,
        },
      }),
    );
  }

  const sources: BookingSource[] = ["BOOKING", "BOOKING", "AIRBNB", "AIRBNB", "DIRECT", "DIRECT", "PHONE"];
  let codeN = 1000;
  for (const p of properties) {
    let cursor = addDays(t0, -between(40, 55));
    const end = addDays(t0, 80);
    while (cursor < end) {
      cursor = addDays(cursor, between(0, 6));
      const nights = between(p.minNights, p.minNights + 5);
      const checkIn = cursor;
      const checkOut = addDays(checkIn, nights);
      cursor = checkOut;
      if (rand() < 0.15) continue;
      const source = pick(sources);
      const guest = pick(guests);
      const q = quoteStay(p, p.rates, checkIn, checkOut);
      const status = checkOut <= t0 ? "CHECKED_OUT" : checkIn <= t0 ? "CHECKED_IN" : "CONFIRMED";
      const commission = source === "BOOKING" ? 0.15 : source === "AIRBNB" ? 0.155 : 0;
      const b = await db.booking.create({
        data: {
          code: `PL-${codeN++}`,
          propertyId: p.id,
          source,
          status,
          checkIn,
          checkOut,
          adults: Math.max(1, Math.min(p.maxGuests, between(1, p.maxGuests))),
          children: rand() < 0.3 ? between(1, 2) : 0,
          guestId: guest.id,
          accommodationTotal: q.accommodation,
          cleaningFee: q.cleaningFee,
          platformCommission: Math.round(q.accommodation * commission * 100) / 100,
        },
      });
      const due = atLocalTime(checkOut, p.checkOutTime);
      const done = checkOut < t0;
      await db.task.create({
        data: {
          propertyId: p.id,
          bookingId: b.id,
          type: "CLEANING",
          title: "Pastrim pas largimit",
          dueDate: due,
          assigneeId: p.cleanerId,
          status: done ? "DONE" : "TODO",
          completedAt: done ? due : null,
          checklist: CHECKLIST.map((label) => ({ label, done })),
        },
      });
      if (status !== "CONFIRMED" || rand() < 0.5) {
        const total = q.total;
        await db.payment.create({
          data: {
            bookingId: b.id,
            amount: source === "BOOKING" || source === "AIRBNB" ? total : status === "CONFIRMED" ? Math.round(total * 0.3) : total,
            method: source === "BOOKING" || source === "AIRBNB" ? "PLATFORM" : pick(["CASH", "BANK"] as const),
            paidAt: addDays(checkIn, -between(1, 20)),
          },
        });
      }
    }
  }

  // A couple of maintenance tasks and owner-stay requests
  await db.task.create({
    data: {
      propertyId: properties[0].id,
      type: "MAINTENANCE",
      title: "Kontroll i pompës së pishinës",
      description: "Pompa bën zhurmë. Thirr teknikun nëse duhet.",
      dueDate: atLocalTime(addDays(t0, 1), "10:00"),
      assigneeId: cleaners[0].id,
    },
  });
  await db.task.create({
    data: {
      propertyId: properties[4].id,
      type: "INSPECTION",
      title: "Inspektim para sezonit",
      dueDate: atLocalTime(addDays(t0, 3), "12:00"),
      checklist: ["Kondicionerët", "Bojlerët", "Dritat e jashtme", "Mobiljet e tarracës"].map((label) => ({ label, done: false })),
    },
  });
  for (const [i, offset] of [
    [0, 95],
    [1, 110],
  ] as const) {
    const p = properties.find((x) => x.ownerId === owners[i].id)!;
    await db.booking.create({
      data: {
        code: `PL-${codeN++}`,
        propertyId: p.id,
        kind: "OWNER_STAY",
        source: "OWNER",
        status: "PENDING",
        checkIn: addDays(t0, offset),
        checkOut: addDays(t0, offset + 5),
        requestedById: owners[i].id,
        notes: "Vijmë me familjen për disa ditë.",
      },
    });
  }

  console.log("Requests, expenses & templates…");
  const inquiries = [
    ["Giulia Bianchi", "giulia@example.com", "+393401112233", 0, 30, 5, 4, "Ciao! Is there parking for two cars?"],
    ["Jonas Weber", "jonas@example.com", "+491701234567", 3, 60, 7, 6, "We are 2 families with kids."],
    ["Elira Shehu", "elira@example.com", "0691122334", 13, 20, 3, 2, "A ka mundësi për check-in pas orës 22:00?"],
  ] as const;
  for (const [name, email, phone, pi, off, nights, g, msg] of inquiries) {
    const p = properties[pi];
    const checkIn = addDays(t0, 120 + off);
    const checkOut = addDays(checkIn, nights);
    await db.inquiry.create({
      data: {
        propertyId: p.id,
        name,
        email,
        phone,
        checkIn,
        checkOut,
        guests: g,
        message: msg,
        quotedTotal: quoteStay(p, p.rates, checkIn, checkOut).total,
        locale: email.includes("elira") ? "sq" : "en",
      },
    });
  }
  await db.ownerLead.createMany({
    data: [
      { name: "Fatmir Hysa", phone: "0692233445", email: "fatmir@example.com", propertyType: "VILLA_POOL", location: "Qeparo", message: "Kam një vilë me 4 dhoma dhe pishinë." },
      { name: "Ornela Bushi", phone: "0683344556", propertyType: "APT_2_1", location: "Durrës, Plazh", message: null },
    ],
  });

  const categories = ["Pastrim", "Riparime", "Rrymë", "Ujë", "Internet", "Furnizime"];
  for (const p of properties) {
    for (let m = 0; m < 3; m++) {
      await db.expense.create({
        data: {
          propertyId: p.id,
          category: pick(categories),
          amount: between(20, 180),
          date: addDays(t0, -m * 30 - between(0, 20)),
          description: null,
          chargeToOwner: rand() < 0.4,
        },
      });
    }
  }

  await db.messageTemplate.createMany({
    data: [
      {
        key: "confirmation",
        name: "Konfirmim rezervimi",
        bodySq:
          "Përshëndetje {guest}! 🌊\n\nRezervimi juaj në {property} është konfirmuar.\n📅 {checkIn} → {checkOut}\n💶 Totali: {total}\nKodi: {code}\n\nJu presim me kënaqësi!\nPalasa Properties",
        bodyEn:
          "Hello {guest}! 🌊\n\nYour booking at {property} is confirmed.\n📅 {checkIn} → {checkOut}\n💶 Total: {total}\nCode: {code}\n\nWe look forward to welcoming you!\nPalasa Properties",
      },
      {
        key: "checkin",
        name: "Udhëzime check-in",
        bodySq:
          "Përshëndetje {guest}! Nesër ju presim në {property}.\n\n📍 {address}\n🕒 Check-in nga ora {checkInTime}\n🔑 Kodi i derës: {doorCode}\n📶 Wi-Fi: {wifiName} / {wifiPassword}\n\nNa shkruani për çdo gjë!",
        bodyEn:
          "Hi {guest}! We're expecting you tomorrow at {property}.\n\n📍 {address}\n🕒 Check-in from {checkInTime}\n🔑 Door code: {doorCode}\n📶 Wi-Fi: {wifiName} / {wifiPassword}\n\nMessage us for anything!",
      },
      {
        key: "checkout",
        name: "Kujtesë check-out",
        bodySq: "Përshëndetje {guest}! Kujtesë e vogël: check-out nesër deri në orën {checkOutTime}. Lini çelësat në kuti. Faleminderit! 🙏",
        bodyEn: "Hi {guest}! A small reminder: check-out tomorrow by {checkOutTime}. Please leave the keys in the box. Thank you! 🙏",
      },
      {
        key: "review",
        name: "Kërkesë për vlerësim",
        bodySq: "Faleminderit që qëndruat në {property}, {guest}! Do të ishim mirënjohës për një vlerësim të shkurtër. Shpresojmë t'ju shohim përsëri! ☀️",
        bodyEn: "Thank you for staying at {property}, {guest}! We'd be grateful for a short review. Hope to see you again! ☀️",
      },
    ],
  });

  console.log(`Done. ${properties.length} properties. Login: ${admin.email} / admin123`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
