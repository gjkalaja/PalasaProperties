import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { PropertyType } from "@prisma/client";
import { db } from "@/lib/db";
import { getT } from "@/lib/i18n";
import { BLOCKING_STATUSES } from "@/lib/availability";
import { addDays, addMonths, daysInMonth, isWeekendNight, nightsBetween, parseISODate, startOfMonth, toISODate, today } from "@/lib/dates";
import { monthYear, weekdayNarrow } from "@/lib/format";
import { PROPERTY_TYPES, bookingColor, cn } from "@/lib/ui";
import { Dot, PageHeader } from "@/components/ui";

export const dynamic = "force-dynamic";

const NAME_COL = 180;

export default async function CalendarPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sp = await searchParams;
  const { t, locale } = await getT();
  const d0 = today();
  const month = startOfMonth(parseISODate(`${sp.m ?? ""}-01`) ?? d0);
  const days = daysInMonth(month);
  const end = addDays(month, days);
  const type = PROPERTY_TYPES.includes(sp.type as PropertyType) ? (sp.type as PropertyType) : undefined;

  const properties = await db.property.findMany({
    where: { active: true, ...(type ? { type } : {}) },
    orderBy: { name: "asc" },
    include: {
      bookings: {
        where: { status: { in: BLOCKING_STATUSES }, checkIn: { lt: end }, checkOut: { gt: month } },
        include: { guest: { select: { name: true } } },
        orderBy: { checkIn: "asc" },
      },
    },
  });

  const dayList = Array.from({ length: days }, (_, i) => addDays(month, i));
  const monthParam = (d: Date) => toISODate(d).slice(0, 7);
  const link = (m: Date, ty = type) => `/admin/kalendari?m=${monthParam(m)}${ty ? `&type=${ty}` : ""}`;
  const todayIdx = d0 >= month && d0 < end ? nightsBetween(month, d0) : -1;
  const cols = `${NAME_COL}px repeat(${days}, minmax(34px, 1fr))`;

  return (
    <>
      <PageHeader
        title={t.calendar.title}
        subtitle={t.calendar.newBookingHint}
        actions={
          <div className="flex items-center gap-1">
            <Link href={link(addMonths(month, -1))} className="btn-secondary size-10 p-0" aria-label={t.common.prev}>
              <ChevronLeft className="size-4" />
            </Link>
            <Link href={link(d0)} className="btn-secondary">
              {t.calendar.thisMonth}
            </Link>
            <Link href={link(addMonths(month, 1))} className="btn-secondary size-10 p-0" aria-label={t.common.next}>
              <ChevronRight className="size-4" />
            </Link>
          </div>
        }
      />

      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div className="text-xl font-semibold capitalize">{monthYear(month, locale)}</div>
        <div className="flex gap-2 overflow-x-auto no-scrollbar">
          <Link href={link(month, undefined)} className={!type ? "chip-active" : "chip"}>
            {t.common.all}
          </Link>
          {PROPERTY_TYPES.map((ty) => (
            <Link key={ty} href={link(month, ty)} className={type === ty ? "chip-active" : "chip"}>
              {t.propertyTypesShort[ty]}
            </Link>
          ))}
        </div>
      </div>

      <div className="card overflow-x-auto">
        <div className="min-w-[1100px]">
          <div className="grid sticky top-0 z-20 bg-white border-b border-line" style={{ gridTemplateColumns: cols }}>
            <div className="sticky left-0 bg-white z-10 border-r border-line" />
            {dayList.map((d, i) => (
              <div
                key={i}
                className={cn(
                  "text-center py-2 text-[11px] leading-tight",
                  i === todayIdx ? "bg-ink text-white rounded-t-lg" : isWeekendNight(d) && "bg-neutral-50",
                )}
              >
                <div className={cn(i === todayIdx ? "text-white/70" : "text-muted")}>{weekdayNarrow(d, locale)}</div>
                <div className="font-semibold">{d.getUTCDate()}</div>
              </div>
            ))}
          </div>

          {properties.map((p) => (
            <div key={p.id} className="grid relative border-b border-line last:border-b-0 h-12" style={{ gridTemplateColumns: cols }}>
              <Link
                href={`/admin/prona/${p.id}`}
                className="sticky left-0 z-10 bg-white border-r border-line px-3 flex flex-col justify-center min-w-0 hover:bg-paper"
              >
                <span className="text-sm font-medium truncate">{p.name}</span>
                <span className="text-[11px] text-muted truncate">{t.propertyTypesShort[p.type]} · {p.city}</span>
              </Link>
              {dayList.map((d, i) => (
                <Link
                  key={i}
                  href={`/admin/rezervimet/new?propertyId=${p.id}&checkIn=${toISODate(d)}`}
                  className={cn(
                    "border-r border-line/60 hover:bg-neutral-100 transition",
                    i === todayIdx ? "bg-neutral-200/70" : isWeekendNight(d) && "bg-neutral-50/70",
                  )}
                  aria-label={toISODate(d)}
                />
              ))}

              {/* Booking bars: start mid-day (check-in afternoon) and end mid-day (check-out morning) */}
              <div className="absolute inset-y-0 right-0 pointer-events-none" style={{ left: NAME_COL }}>
                {p.bookings.map((b) => {
                  const startIdx = nightsBetween(month, b.checkIn) + 0.5;
                  const endIdx = nightsBetween(month, b.checkOut) + 0.5;
                  const s = Math.max(startIdx, 0);
                  const e = Math.min(endIdx, days);
                  if (e <= s) return null;
                  const color = bookingColor(b.source, b.kind);
                  const label = b.guest?.name ?? t.bookingKinds[b.kind];
                  return (
                    <Link
                      key={b.id}
                      href={`/admin/rezervimet/${b.id}`}
                      title={`${label} · ${t.bookingSources[b.source]} · ${nightsBetween(b.checkIn, b.checkOut)} ${t.common.nights}`}
                      className={cn(
                        "pointer-events-auto absolute top-2 bottom-2 flex items-center px-2 text-[11px] font-medium text-white overflow-hidden whitespace-nowrap shadow-sm hover:brightness-110 hover:z-10 transition",
                        startIdx >= 0 ? "rounded-l-full pl-2.5" : "",
                        endIdx <= days ? "rounded-r-full" : "",
                        b.status === "PENDING" && "opacity-60 [background-image:repeating-linear-gradient(45deg,transparent_0_6px,rgba(255,255,255,.25)_6px_12px)]",
                      )}
                      style={{
                        left: `calc(${(s / days) * 100}% + 1px)`,
                        width: `calc(${((e - s) / days) * 100}% - 2px)`,
                        background: color,
                      }}
                    >
                      <span className="truncate">{label}</span>
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="flex flex-wrap gap-x-5 gap-y-2 mt-4 text-xs text-muted">
        {(["DIRECT", "BOOKING", "AIRBNB", "PHONE"] as const).map((s) => (
          <span key={s} className="flex items-center gap-1.5">
            <Dot color={bookingColor(s)} /> {t.bookingSources[s]}
          </span>
        ))}
        <span className="flex items-center gap-1.5">
          <Dot color={bookingColor("OWNER", "OWNER_STAY")} /> {t.bookingKinds.OWNER_STAY}
        </span>
        <span className="flex items-center gap-1.5">
          <Dot color={bookingColor("OTHER", "MAINTENANCE")} /> {t.bookingKinds.MAINTENANCE}
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block w-5 h-2 rounded-full bg-neutral-500 opacity-60" /> {t.bookingStatuses.PENDING}
        </span>
      </div>
    </>
  );
}
