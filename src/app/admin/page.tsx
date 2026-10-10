import Link from "next/link";
import { ArrowRight, LogIn, LogOut, Sparkles, Brush, CheckCircle2, AlertTriangle } from "lucide-react";
import { db } from "@/lib/db";
import { getT } from "@/lib/i18n";
import { BLOCKING_STATUSES } from "@/lib/availability";
import { addDays, addMonths, daysInMonth, nightsBetween, startOfMonth, today } from "@/lib/dates";
import { nightsInRange, prorate } from "@/lib/finance";
import { formatMoney, num } from "@/lib/money";
import { dayMonth, monthYear, weekdayShort } from "@/lib/format";
import { bookingColor, cn } from "@/lib/ui";
import { Dot, PageHeader, Stat } from "@/components/ui";

export const dynamic = "force-dynamic";

type TileState = "turnover" | "arriving" | "departing" | "occupied" | "blocked" | "free";

const TILE_STYLE: Record<TileState, { box: string; dot: string }> = {
  turnover: { box: "bg-violet-50 border-violet-200", dot: "bg-violet-500" },
  arriving: { box: "bg-emerald-50 border-emerald-200", dot: "bg-emerald-500" },
  departing: { box: "bg-amber-50 border-amber-200", dot: "bg-amber-500" },
  occupied: { box: "bg-ink text-white border-ink", dot: "bg-white" },
  blocked: { box: "bg-neutral-100 border-neutral-200", dot: "bg-neutral-400" },
  free: { box: "bg-white border-line", dot: "bg-neutral-300" },
};

export default async function Dashboard() {
  const { t, locale } = await getT();
  const d0 = today();
  const d1 = addDays(d0, 1);
  const monthStart = startOfMonth(d0);
  const monthEnd = addMonths(d0, 1);

  const [properties, monthBookings, upcoming, pendingInquiries, pendingOwner, todayTasks] = await Promise.all([
    db.property.findMany({
      where: { active: true },
      orderBy: { name: "asc" },
      include: {
        bookings: {
          where: { status: { in: BLOCKING_STATUSES }, checkOut: { gte: d0 }, checkIn: { lte: addDays(d0, 60) } },
          include: { guest: true },
          orderBy: { checkIn: "asc" },
        },
        tasks: { where: { type: "CLEANING", dueDate: { gte: addDays(d0, -1), lt: addDays(d1, 1) } } },
      },
    }),
    db.booking.findMany({
      where: { status: { in: BLOCKING_STATUSES }, checkIn: { lt: monthEnd }, checkOut: { gt: monthStart } },
      select: { checkIn: true, checkOut: true, kind: true, accommodationTotal: true, cleaningFee: true },
    }),
    db.booking.findMany({
      where: { status: { in: BLOCKING_STATUSES }, kind: "RESERVATION", checkIn: { gte: d0, lt: addDays(d0, 7) } },
      include: { property: true, guest: true },
      orderBy: { checkIn: "asc" },
      take: 12,
    }),
    db.inquiry.count({ where: { status: "NEW" } }),
    db.booking.count({ where: { kind: "OWNER_STAY", status: "PENDING" } }),
    db.task.count({ where: { status: { not: "DONE" }, dueDate: { lt: d1 } } }),
  ]);

  // Month KPIs
  const days = daysInMonth(d0);
  let occupiedNights = 0;
  let revenue = 0;
  let paidNights = 0;
  let accommodation = 0;
  for (const b of monthBookings) {
    const n = nightsInRange(b.checkIn, b.checkOut, monthStart, monthEnd);
    occupiedNights += n;
    if (b.kind === "RESERVATION" || b.kind === "EXTERNAL_BLOCK") {
      const acc = prorate(num(b.accommodationTotal), b.checkIn, b.checkOut, monthStart, monthEnd);
      revenue += acc + prorate(num(b.cleaningFee), b.checkIn, b.checkOut, monthStart, monthEnd);
      if (acc > 0) {
        paidNights += n;
        accommodation += acc;
      }
    }
  }
  const occupancy = properties.length ? Math.round((occupiedNights / (properties.length * days)) * 100) : 0;

  // Live board
  const tiles = properties.map((p) => {
    const current = p.bookings.find((b) => b.checkIn <= d0 && b.checkOut > d0);
    const arriving = p.bookings.find((b) => b.checkIn.getTime() === d0.getTime());
    const departing = p.bookings.find((b) => b.checkOut.getTime() === d0.getTime());
    const next = p.bookings.find((b) => b.checkIn > d0);
    let state: TileState = "free";
    if (departing && arriving) state = "turnover";
    else if (arriving) state = arriving.kind === "RESERVATION" || arriving.kind === "EXTERNAL_BLOCK" ? "arriving" : "blocked";
    else if (departing) state = "departing";
    else if (current) state = current.kind === "OWNER_STAY" || current.kind === "MAINTENANCE" ? "blocked" : "occupied";
    const focus = arriving ?? current ?? departing;
    const cleaning = p.tasks.find((tk) => departing && tk.bookingId === departing.id);
    return { p, state, focus, next, cleaning, current };
  });
  const counts = tiles.reduce<Record<TileState, number>>(
    (acc, x) => ({ ...acc, [x.state]: acc[x.state] + 1 }),
    { turnover: 0, arriving: 0, departing: 0, occupied: 0, blocked: 0, free: 0 },
  );
  const checkIns = tiles.filter((x) => x.state === "arriving" || x.state === "turnover").length;
  const checkOuts = tiles.filter((x) => x.state === "departing" || x.state === "turnover").length;

  const stateLabel: Record<TileState, string> = {
    turnover: t.dashboard.turnover,
    arriving: t.dashboard.arriving,
    departing: t.dashboard.departing,
    occupied: t.dashboard.occupied,
    blocked: t.dashboard.blocked,
    free: t.dashboard.free,
  };

  return (
    <>
      <PageHeader
        title={t.dashboard.title}
        subtitle={`${weekdayShort(d0, locale)}, ${dayMonth(d0, locale)} · ${monthYear(d0, locale)}`}
        actions={
          <Link href="/admin/rezervimet/new" className="btn-primary">
            + {t.bookingAdmin.new}
          </Link>
        }
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4 mb-10">
        <Stat label={t.dashboard.checkInsToday} value={checkIns} hint={`${t.dashboard.checkOutsToday}: ${checkOuts}`} />
        <Stat label={t.dashboard.occupancyMonth} value={`${occupancy}%`} hint={`${occupiedNights} / ${properties.length * days} ${t.common.nights}`} />
        <Stat
          label={t.dashboard.revenueMonth}
          value={formatMoney(Math.round(revenue))}
          hint={`${t.dashboard.adr}: ${formatMoney(paidNights ? Math.round(accommodation / paidNights) : 0)}`}
        />
        <Link href="/admin/kerkesat" className="block">
          <Stat
            label={t.dashboard.pendingRequests}
            value={pendingInquiries + pendingOwner}
            hint={`${t.dashboard.openTasks}: ${todayTasks}`}
          />
        </Link>
      </div>

      <div className="flex flex-wrap items-end justify-between gap-3 mb-4">
        <h2 className="text-lg font-semibold">{t.dashboard.liveBoard}</h2>
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted">
          {(Object.keys(TILE_STYLE) as TileState[]).map((s) => (
            <span key={s} className="flex items-center gap-1.5">
              <span className={cn("size-2 rounded-full", s === "occupied" ? "bg-ink" : TILE_STYLE[s].dot)} />
              {stateLabel[s]} <b className="text-ink font-medium">{counts[s]}</b>
            </span>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-3 mb-12">
        {tiles.map(({ p, state, focus, next, cleaning, current }) => {
          const style = TILE_STYLE[state];
          const dark = state === "occupied";
          const nightsLeft = current ? nightsBetween(d0, current.checkOut) : 0;
          return (
            <Link
              key={p.id}
              href={focus ? `/admin/rezervimet/${focus.id}` : `/admin/rezervimet/new?propertyId=${p.id}&checkIn=${d0.toISOString().slice(0, 10)}`}
              className={cn("group rounded-2xl border p-4 flex flex-col min-h-36 transition hover:-translate-y-0.5 hover:shadow-lg", style.box)}
            >
              <div className="flex items-center justify-between gap-2">
                <span className={cn("text-[11px] font-medium uppercase tracking-wider flex items-center gap-1.5", dark ? "text-white/70" : "text-muted")}>
                  <span className={cn("size-1.5 rounded-full", style.dot, state !== "free" && "animate-pulse")} />
                  {stateLabel[state]}
                </span>
                {state === "arriving" && <LogIn className="size-4 text-emerald-600" />}
                {state === "departing" && <LogOut className="size-4 text-amber-600" />}
                {state === "turnover" && <Sparkles className="size-4 text-violet-600" />}
              </div>
              <div className="mt-2 font-medium leading-tight">{p.name}</div>
              <div className={cn("text-xs", dark ? "text-white/60" : "text-muted")}>{p.city}</div>

              <div className="mt-auto pt-3 text-xs space-y-1">
                {focus && state !== "free" && (
                  <div className="flex items-center gap-1.5 truncate">
                    <Dot color={dark ? "#fff" : bookingColor(focus.source, focus.kind)} />
                    <span className="truncate">{focus.guest?.name ?? t.bookingKinds[focus.kind]}</span>
                  </div>
                )}
                {state === "occupied" && (
                  <div className="text-white/70">
                    {nightsLeft} {t.dashboard.nightsLeft}
                  </div>
                )}
                {(state === "departing" || state === "turnover") && (
                  <div className="flex items-center gap-1.5">
                    {cleaning?.status === "DONE" ? (
                      <CheckCircle2 className="size-3.5 text-emerald-600" />
                    ) : (
                      <Brush className="size-3.5" />
                    )}
                    {t.dashboard.cleaning}: {cleaning ? t.taskStatuses[cleaning.status] : "–"}
                  </div>
                )}
                {state === "free" && (
                  <div className="text-muted">
                    {next ? (
                      <>
                        {t.dashboard.nextArrival}: <span className="text-ink">{dayMonth(next.checkIn, locale)}</span>
                      </>
                    ) : (
                      t.dashboard.noUpcoming
                    )}
                  </div>
                )}
              </div>
            </Link>
          );
        })}
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <section className="card">
          <div className="flex items-center justify-between px-5 pt-5 pb-3">
            <h2 className="font-semibold">{t.dashboard.upcoming}</h2>
            <Link href="/admin/rezervimet" className="text-sm text-muted hover:text-ink flex items-center gap-1">
              {t.nav.bookings} <ArrowRight className="size-3.5" />
            </Link>
          </div>
          <ul>
            {upcoming.map((b) => (
              <li key={b.id} className="border-t border-line">
                <Link href={`/admin/rezervimet/${b.id}`} className="flex items-center gap-4 px-5 py-3 hover:bg-paper">
                  <div className="w-12 text-center shrink-0">
                    <div className="text-[10px] uppercase text-muted">{weekdayShort(b.checkIn, locale)}</div>
                    <div className="font-semibold">{b.checkIn.getUTCDate()}</div>
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium truncate">{b.guest?.name ?? t.bookingKinds[b.kind]}</div>
                    <div className="text-xs text-muted truncate">
                      {b.property.name} · {nightsBetween(b.checkIn, b.checkOut)} {t.common.nights}
                    </div>
                  </div>
                  <span className="flex items-center gap-1.5 text-xs text-muted">
                    <Dot color={bookingColor(b.source)} />
                    {t.bookingSources[b.source]}
                  </span>
                </Link>
              </li>
            ))}
            {!upcoming.length && <li className="px-5 pb-5 text-sm text-muted">{t.dashboard.noUpcoming}</li>}
          </ul>
        </section>
        <OverlapWarnings />
      </div>
    </>
  );
}

/** Flags double bookings (usually an iCal sync that arrived late). */
async function OverlapWarnings() {
  const { t, locale } = await getT();
  const rows = await db.$queryRaw<{ a: string; b: string; name: string; checkin: Date }[]>`
    SELECT a.id AS a, b.id AS b, p.name, GREATEST(a."checkIn", b."checkIn") AS checkin
    FROM "Booking" a
    JOIN "Booking" b ON a."propertyId" = b."propertyId" AND a.id < b.id
      AND a."checkIn" < b."checkOut" AND b."checkIn" < a."checkOut"
    JOIN "Property" p ON p.id = a."propertyId"
    WHERE a.status IN ('PENDING','CONFIRMED','CHECKED_IN') AND b.status IN ('PENDING','CONFIRMED','CHECKED_IN')
      AND a."checkOut" >= CURRENT_DATE
    ORDER BY checkin LIMIT 10`;
  return (
    <section className={cn("card", rows.length > 0 && "border-red-200")}>
      <div className="px-5 pt-5 pb-3 font-semibold flex items-center gap-2">
        <AlertTriangle className={cn("size-4", rows.length ? "text-red-500" : "text-muted")} />
        {t.bookingAdmin.conflict}
      </div>
      <ul>
        {rows.map((r) => (
          <li key={r.a + r.b} className="border-t border-line px-5 py-3 text-sm flex justify-between gap-3">
            <span>
              {r.name} · {dayMonth(r.checkin, locale)}
            </span>
            <span className="flex gap-3">
              <Link className="underline" href={`/admin/rezervimet/${r.a}`}>A</Link>
              <Link className="underline" href={`/admin/rezervimet/${r.b}`}>B</Link>
            </span>
          </li>
        ))}
        {!rows.length && <li className="px-5 pb-5 text-sm text-muted">✓ {t.common.noResults}</li>}
      </ul>
    </section>
  );
}
