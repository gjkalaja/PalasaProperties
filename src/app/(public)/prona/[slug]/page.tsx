import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { BedDouble, Bath, Maximize2, Users, Waves, Clock, MoonStar, MapPin } from "lucide-react";
import { db } from "@/lib/db";
import { getT } from "@/lib/i18n";
import { addDays, toISODate, today } from "@/lib/dates";
import { BLOCKING_STATUSES, occupiedNights } from "@/lib/availability";
import { minNightsFor, nightlyPrice } from "@/lib/pricing";
import { num } from "@/lib/money";
import { AmenityIcon } from "@/components/amenity";
import { BookingWidget, type DayInfo } from "@/components/BookingWidget";
import { Gallery } from "@/components/Gallery";
import { submitInquiry } from "../../actions";

export const dynamic = "force-dynamic";

const WINDOW_DAYS = 400;

type Props = { params: Promise<{ slug: string }>; searchParams: Promise<Record<string, string | undefined>> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const p = await db.property.findUnique({ where: { slug }, select: { name: true, summarySq: true } });
  return p ? { title: p.name, description: p.summarySq } : {};
}

export default async function PropertyPage({ params, searchParams }: Props) {
  const { slug } = await params;
  const sp = await searchParams;
  const { t, locale } = await getT();
  const start = today();
  const property = await db.property.findFirst({
    where: { slug, published: true, active: true },
    include: {
      images: { orderBy: { position: "asc" } },
      rates: true,
      bookings: {
        where: { status: { in: BLOCKING_STATUSES }, checkOut: { gt: start }, checkIn: { lt: addDays(start, WINDOW_DAYS) } },
        select: { checkIn: true, checkOut: true, status: true },
      },
    },
  });
  if (!property) notFound();

  const occupied = occupiedNights(property.bookings, start, WINDOW_DAYS);
  const days: DayInfo[] = Array.from({ length: WINDOW_DAYS }, (_, i) => {
    const d = addDays(start, i);
    const iso = toISODate(d);
    return {
      date: iso,
      price: nightlyPrice(property, property.rates, d),
      free: !occupied.has(iso),
      minNights: minNightsFor(property, property.rates, d),
    };
  });

  const summary = locale === "en" ? property.summaryEn || property.summarySq : property.summarySq;
  const description = locale === "en" ? property.descriptionEn || property.descriptionSq : property.descriptionSq;
  const sea =
    property.distanceToSeaM != null
      ? property.distanceToSeaM < 1000
        ? `${property.distanceToSeaM} m`
        : `${(property.distanceToSeaM / 1000).toFixed(1)} km`
      : null;

  const facts = [
    { icon: Users, label: `${t.public.upTo} ${property.maxGuests} ${t.common.guests.toLowerCase()}` },
    { icon: BedDouble, label: `${property.bedrooms} ${t.public.bedrooms} · ${property.beds} ${t.public.beds}` },
    { icon: Bath, label: `${property.bathrooms} ${t.public.bathrooms}` },
    property.areaM2 ? { icon: Maximize2, label: `${property.areaM2} ${t.public.area}` } : null,
    sea ? { icon: Waves, label: `${sea} ${t.public.toSea}` } : null,
  ].filter(Boolean) as { icon: typeof Users; label: string }[];

  return (
    <div className="mx-auto max-w-7xl px-4 md:px-8 pt-6 md:pt-10">
      <div className="mb-5">
        <p className="eyebrow">{t.propertyTypes[property.type]}</p>
        <h1 className="text-3xl md:text-5xl font-semibold tracking-tight mt-2">{property.name}</h1>
        <p className="text-muted mt-2 flex items-center gap-1.5">
          <MapPin className="size-4" /> {property.city}
        </p>
      </div>

      <Gallery images={property.images.map((i) => i.url)} title={property.name} allLabel={t.public.showAllPhotos} />

      <div className="grid lg:grid-cols-[1fr_minmax(0,560px)] gap-10 lg:gap-14 mt-10">
        <div className="min-w-0">
          <div className="flex flex-wrap gap-x-6 gap-y-3 pb-8 border-b border-line">
            {facts.map((f) => (
              <div key={f.label} className="flex items-center gap-2 text-sm">
                <f.icon className="size-4 text-muted" strokeWidth={1.5} />
                {f.label}
              </div>
            ))}
          </div>

          {summary && <p className="text-xl leading-relaxed mt-8">{summary}</p>}

          <section className="mt-10">
            <h2 className="eyebrow mb-4">{t.public.about}</h2>
            <div className="space-y-4 text-neutral-700 leading-relaxed whitespace-pre-line">{description}</div>
          </section>

          <section className="mt-12">
            <h2 className="eyebrow mb-5">{t.public.amenities}</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-6 gap-y-1">
              {property.amenities.map((a) => (
                <div key={a} className="py-3 flex items-center gap-3 text-sm border-b border-line">
                  <AmenityIcon name={a} className="size-5" />
                  {t.amenities[a as keyof typeof t.amenities] ?? a}
                </div>
              ))}
            </div>
          </section>

          <section className="mt-12">
            <h2 className="eyebrow mb-5">{t.public.rules}</h2>
            <div className="grid sm:grid-cols-3 gap-4">
              <div className="card p-4">
                <Clock className="size-4 text-muted mb-2" />
                <div className="text-xs text-muted">{t.public.checkIn}</div>
                <div className="font-medium">{property.checkInTime}</div>
              </div>
              <div className="card p-4">
                <Clock className="size-4 text-muted mb-2" />
                <div className="text-xs text-muted">{t.public.checkOut}</div>
                <div className="font-medium">{property.checkOutTime}</div>
              </div>
              <div className="card p-4">
                <MoonStar className="size-4 text-muted mb-2" />
                <div className="text-xs text-muted">{t.public.minStay}</div>
                <div className="font-medium">
                  {property.minNights} {t.common.nights}
                </div>
              </div>
            </div>
          </section>
        </div>

        <aside className="lg:sticky lg:top-24 self-start">
          <BookingWidget
            days={days}
            cleaningFee={num(property.cleaningFee)}
            maxGuests={property.maxGuests}
            locale={locale}
            initialIn={sp.in}
            initialOut={sp.out}
            action={submitInquiry.bind(null, property.id)}
            labels={{
              selectDates: t.public.selectDates,
              selectCheckout: t.public.selectCheckout,
              accommodation: t.public.accommodation,
              cleaningFee: t.public.cleaningFee,
              total: t.common.total,
              nights: t.common.nights,
              night: t.common.night,
              noHiddenFees: t.public.noHiddenFees,
              requestBooking: t.public.requestBooking,
              requestSent: t.public.requestSent,
              minNightsError: t.public.minNightsError,
              datesUnavailable: t.public.datesUnavailable,
              clearDates: t.public.clearDates,
              name: t.common.name,
              email: t.common.email,
              phone: t.common.phone,
              guests: t.common.guests.toLowerCase(),
              message: t.public.message,
              checkIn: t.public.checkIn,
              checkOut: t.public.checkOut,
            }}
          />
        </aside>
      </div>
    </div>
  );
}
