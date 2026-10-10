import Link from "next/link";
import { redirect } from "next/navigation";
import type { PropertyType } from "@prisma/client";
import { db } from "@/lib/db";
import { getT } from "@/lib/i18n";
import { addDays, nightsBetween, parseISODate, toISODate, today } from "@/lib/dates";
import { BLOCKING_STATUSES, findConflicts, occupiedNights } from "@/lib/availability";
import { nightlyPrice, quoteStay } from "@/lib/pricing";
import { formatMoney } from "@/lib/money";
import { PROPERTY_TYPES, cn } from "@/lib/ui";
import { weekdayNarrow } from "@/lib/format";
import { PropertyCard, type CardData } from "@/components/PropertyCard";

export const dynamic = "force-dynamic";

type SP = Promise<Record<string, string | undefined>>;

export default async function HomePage({ searchParams }: { searchParams: SP }) {
  const sp = await searchParams;
  if ((await db.user.count()) === 0) redirect("/setup");
  const { t, locale } = await getT();
  const start = today();
  const checkIn = parseISODate(sp.in);
  const checkOut = parseISODate(sp.out);
  const hasDates = !!(checkIn && checkOut && checkOut > checkIn && checkIn >= start);
  const guests = Math.max(0, Number(sp.guests) || 0);
  const type = PROPERTY_TYPES.includes(sp.type as PropertyType) ? (sp.type as PropertyType) : null;
  const sort = sp.sort ?? "recommended";

  const windowEnd = hasDates && checkOut! > addDays(start, 14) ? checkOut! : addDays(start, 14);
  const all = await db.property.findMany({
    where: { published: true, active: true },
    include: {
      images: { orderBy: { position: "asc" }, take: 4 },
      rates: true,
      bookings: {
        where: { status: { in: BLOCKING_STATUSES }, checkOut: { gt: start }, checkIn: { lt: windowEnd } },
        select: { id: true, checkIn: true, checkOut: true, status: true },
      },
    },
    orderBy: { createdAt: "asc" },
  });

  const counts = new Map<PropertyType, number>();
  for (const p of all) counts.set(p.type, (counts.get(p.type) ?? 0) + 1);

  let list = all.filter((p) => (!type || p.type === type) && (!guests || p.maxGuests >= guests));
  if (hasDates) list = list.filter((p) => findConflicts(p.bookings, checkIn!, checkOut!).length === 0);

  const cards = list.map((p) => {
    const occupied = occupiedNights(p.bookings, start, 14);
    const strip = Array.from({ length: 14 }, (_, i) => {
      const d = addDays(start, i);
      const iso = toISODate(d);
      return { day: iso, weekday: weekdayNarrow(d, locale), free: !occupied.has(iso) };
    });
    const minNext = Math.min(...strip.map((s) => nightlyPrice(p, p.rates, parseISODate(s.day)!)));
    const quote = hasDates ? quoteStay(p, p.rates, checkIn!, checkOut!) : null;
    const data: CardData = {
      slug: p.slug,
      name: p.name,
      city: p.city,
      typeLabel: t.propertyTypesShort[p.type],
      images: p.images.map((i) => i.url),
      seaLabel: p.distanceToSeaM != null ? `≈ ${p.distanceToSeaM < 1000 ? `${p.distanceToSeaM} m` : `${(p.distanceToSeaM / 1000).toFixed(1)} km`} ${t.public.toSea}` : null,
      meta: `${t.public.upTo} ${p.maxGuests} ${t.common.guests.toLowerCase()} · ${p.bedrooms || 1} ${t.public.bedrooms}`,
      priceLabel: quote ? formatMoney(quote.total) : `${t.public.fromPrice} ${formatMoney(minNext)}`,
      priceSuffix: quote ? `${quote.nights} ${t.common.nights}` : t.common.perNight,
      strip,
      stripLabel: t.public.next14,
      freeLabel: t.public.available.toLowerCase(),
      href: `/prona/${p.slug}${hasDates ? `?in=${sp.in}&out=${sp.out}` : ""}`,
    };
    return { data, price: quote?.total ?? minNext, sea: p.distanceToSeaM ?? 99999 };
  });

  if (sort === "price_asc") cards.sort((a, b) => a.price - b.price);
  if (sort === "price_desc") cards.sort((a, b) => b.price - a.price);
  if (sort === "sea") cards.sort((a, b) => a.sea - b.sea);

  const query = (patch: Record<string, string | null>) => {
    const next = new URLSearchParams(Object.entries(sp).filter(([, v]) => v) as [string, string][]);
    for (const [k, v] of Object.entries(patch)) (v ? next.set(k, v) : next.delete(k));
    const s = next.toString();
    return s ? `/?${s}` : "/";
  };

  return (
    <div className="mx-auto max-w-7xl px-4 md:px-8">
      <section className="pt-12 md:pt-20 pb-8 md:pb-12 max-w-3xl">
        <p className="eyebrow mb-4">Riviera · {all.length} {t.public.results}</p>
        <h1 className="text-4xl md:text-6xl font-semibold tracking-tight leading-[1.05]">{t.public.heroTitle}</h1>
        <p className="text-lg text-muted mt-4">{t.public.heroSubtitle}</p>
      </section>

      <form className="card p-2 md:p-2.5 grid grid-cols-2 md:grid-cols-[1fr_1fr_0.7fr_0.8fr_auto] gap-2 items-end mb-6" action="/">
        {type && <input type="hidden" name="type" value={type} />}
        <label className="px-2">
          <span className="label">{t.public.checkInFilter}</span>
          <input type="date" name="in" defaultValue={sp.in} min={toISODate(start)} className="input border-0 px-0 h-8 focus:ring-0" />
        </label>
        <label className="px-2">
          <span className="label">{t.public.checkOutFilter}</span>
          <input type="date" name="out" defaultValue={sp.out} min={toISODate(addDays(start, 1))} className="input border-0 px-0 h-8 focus:ring-0" />
        </label>
        <label className="px-2">
          <span className="label">{t.public.guestsFilter}</span>
          <select name="guests" defaultValue={sp.guests ?? ""} className="input border-0 px-0 h-8 focus:ring-0">
            <option value="">–</option>
            {Array.from({ length: 12 }, (_, i) => i + 1).map((g) => (
              <option key={g} value={g}>{g}+</option>
            ))}
          </select>
        </label>
        <label className="px-2">
          <span className="label">{t.public.sort}</span>
          <select name="sort" defaultValue={sort} className="input border-0 px-0 h-8 focus:ring-0">
            <option value="recommended">{t.public.sortRecommended}</option>
            <option value="price_asc">{t.public.sortPriceAsc}</option>
            <option value="price_desc">{t.public.sortPriceDesc}</option>
            <option value="sea">{t.public.sortSea}</option>
          </select>
        </label>
        <button className="btn-primary h-12 col-span-2 md:col-span-1 md:px-7">{t.common.search}</button>
      </form>

      <div className="flex gap-2 overflow-x-auto no-scrollbar pb-2 -mx-4 px-4 md:mx-0 md:px-0">
        <Link href={query({ type: null })} className={!type ? "chip-active" : "chip"}>
          {t.public.allTypes} <span className="opacity-60">{all.length}</span>
        </Link>
        {PROPERTY_TYPES.filter((ty) => counts.get(ty)).map((ty) => (
          <Link key={ty} href={query({ type: ty })} className={type === ty ? "chip-active" : "chip"}>
            {t.propertyTypesShort[ty]} <span className="opacity-60">{counts.get(ty)}</span>
          </Link>
        ))}
      </div>

      <p className="text-sm text-muted mt-6 mb-5">
        {cards.length} {t.public.results}
        {hasDates && <> {t.public.availableForDates} · {nightsBetween(checkIn!, checkOut!)} {t.common.nights}</>}
      </p>

      <div className={cn("grid gap-x-6 gap-y-10 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4")}>
        {cards.map((c, i) => (
          <PropertyCard key={c.data.slug} data={c.data} priority={i < 4} />
        ))}
      </div>
      {cards.length === 0 && <div className="py-24 text-center text-muted">{t.common.noResults}</div>}
    </div>
  );
}
