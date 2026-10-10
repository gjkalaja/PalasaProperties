import Link from "next/link";
import { ChevronLeft, ChevronRight, LogOut } from "lucide-react";
import type { Booking } from "@prisma/client";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { getT } from "@/lib/i18n";
import { BLOCKING_STATUSES } from "@/lib/availability";
import { addDays, addMonths, daysInMonth, nightsBetween, parseISODate, startOfMonth, toISODate, today } from "@/lib/dates";
import { dayMonth, dayMonthYear, monthName, monthYear, weekdayNarrowList } from "@/lib/format";
import { ownerSplit } from "@/lib/finance";
import { formatMoney, num } from "@/lib/money";
import { financeReport, periodFromParams } from "@/lib/report";
import { bookingColor, cn } from "@/lib/ui";
import { logout } from "@/app/actions";
import { LanguageSwitch } from "@/components/LanguageSwitch";
import { AutoSubmitSelect } from "@/components/client";
import { Dot, Section, Stat, StatusBadge, Empty } from "@/components/ui";
import { OwnerStayForm } from "./OwnerStayForm";

export const dynamic = "force-dynamic";
export const metadata = { title: "Portali i pronarit" };

function MonthGrid({ month, bookings, locale }: { month: Date; bookings: Booking[]; locale: string }) {
  const days = daysInMonth(month);
  const offset = (month.getUTCDay() + 6) % 7;
  const d0 = today();
  return (
    <div>
      <div className="grid grid-cols-7 text-[10px] text-muted text-center mb-1">
        {weekdayNarrowList(locale).map((w, i) => (
          <div key={i}>{w}</div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {Array.from({ length: offset }, (_, i) => (
          <div key={`e${i}`} />
        ))}
        {Array.from({ length: days }, (_, i) => {
          const d = addDays(month, i);
          const b = bookings.find((x) => x.checkIn <= d && x.checkOut > d);
          const color = b ? bookingColor(b.source, b.kind) : undefined;
          return (
            <div
              key={i}
              title={b ? `${dayMonth(b.checkIn, locale)} → ${dayMonth(b.checkOut, locale)}` : undefined}
              className={cn(
                "aspect-square rounded-lg grid place-items-center text-xs",
                b ? "text-white" : "bg-emerald-50 text-emerald-800",
                b?.status === "PENDING" && "opacity-50",
                d < d0 && "opacity-40",
                d.getTime() === d0.getTime() && "ring-2 ring-ink ring-offset-1",
              )}
              style={color ? { background: color } : undefined}
            >
              {i + 1}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default async function OwnerPortal({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const user = await requireUser(["OWNER", "ADMIN"]);
  const sp = await searchParams;
  const { t, locale } = await getT();
  const o = t.owner;
  const d0 = today();
  const ownerFilter = user.role === "OWNER" ? { ownerId: user.id } : sp.owner ? { ownerId: sp.owner } : { ownerId: { not: null } };
  const period = periodFromParams(sp, d0);
  const calMonth = startOfMonth(parseISODate(`${sp.m ?? ""}-01`) ?? d0);
  const calEnd = addMonths(calMonth, 1);

  const [report, calendarProps, requests] = await Promise.all([
    financeReport(period.from, period.to, ownerFilter),
    db.property.findMany({
      where: ownerFilter,
      orderBy: { name: "asc" },
      include: {
        images: { orderBy: { position: "asc" }, take: 1 },
        bookings: { where: { status: { in: BLOCKING_STATUSES }, checkIn: { lt: calEnd }, checkOut: { gt: calMonth } } },
      },
    }),
    db.booking.findMany({
      where: { kind: "OWNER_STAY", property: ownerFilter, checkOut: { gte: addDays(d0, -60) } },
      include: { property: { select: { name: true } } },
      orderBy: { checkIn: "desc" },
      take: 20,
    }),
  ]);

  const rate = num(user.commissionRate);
  const stays = report.properties
    .flatMap((p) =>
      p.bookings
        .filter((b) => b.kind === "RESERVATION" || b.kind === "EXTERNAL_BLOCK")
        .map((b) => ({ b, p, split: ownerSplit(b, p.owner ? num(p.owner.commissionRate) : rate) })),
    )
    .sort((a, b) => a.b.checkIn.getTime() - b.b.checkIn.getTime());
  const years = Array.from({ length: 3 }, (_, i) => d0.getUTCFullYear() - 1 + i);
  const calLink = (m: Date) => `/pronari?m=${toISODate(m).slice(0, 7)}&year=${period.year}&month=${period.month}`;

  return (
    <div className="min-h-dvh bg-paper">
      <header className="bg-white border-b border-line">
        <div className="max-w-6xl mx-auto px-4 md:px-8 h-16 flex items-center justify-between gap-3">
          <Link href="/" className="flex items-center gap-2.5 font-semibold">
            <span className="grid place-items-center size-8 rounded-full bg-ink text-white text-xs">P</span>
            <span className="hidden sm:inline">{o.title}</span>
          </Link>
          <div className="flex items-center gap-2">
            {user.role === "ADMIN" && <Link href="/admin" className="btn-ghost btn-sm">{t.nav.dashboard}</Link>}
            <LanguageSwitch locale={locale} />
            <form action={logout}>
              <button className="btn-ghost size-8 p-0" aria-label={t.common.logout}>
                <LogOut className="size-4" />
              </button>
            </form>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 md:px-8 py-8 md:py-12">
        <div className="flex flex-wrap items-end justify-between gap-4 mb-8">
          <div>
            <p className="eyebrow">{o.welcome}</p>
            <h1 className="text-3xl md:text-4xl font-semibold tracking-tight mt-1">{user.name}</h1>
            {user.role === "OWNER" && (
              <p className="text-sm text-muted mt-1">
                {o.yourRate}: {rate}%
              </p>
            )}
          </div>
          <form className="flex gap-2" action="/pronari">
            {sp.m && <input type="hidden" name="m" value={sp.m} />}
            <AutoSubmitSelect name="month" defaultValue={String(period.month)} className="input w-40 capitalize">
              <option value="all">{t.finance.wholeYear}</option>
              {Array.from({ length: 12 }, (_, m) => (
                <option key={m} value={m + 1}>{monthName(m, locale)}</option>
              ))}
            </AutoSubmitSelect>
            <AutoSubmitSelect name="year" defaultValue={String(period.year)} className="input w-28">
              {years.map((y) => (
                <option key={y} value={y}>{y}</option>
              ))}
            </AutoSubmitSelect>
          </form>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-10">
          <Stat label={o.gross} value={formatMoney(report.totals.gross)} hint={`${o.occupiedNights}: ${report.totals.nights} · ${report.totals.occupancy}%`} />
          <Stat label={o.platform} value={formatMoney(report.totals.platform)} />
          <Stat label={o.management} value={formatMoney(report.totals.management + report.totals.cleaning)} hint={`${t.bookingAdmin.cleaningFee}: ${formatMoney(report.totals.cleaning)}`} />
          <div className="card p-5 bg-ink text-white border-ink">
            <div className="text-[11px] uppercase tracking-[0.18em] text-white/60 font-medium">{o.net}</div>
            <div className="text-2xl font-semibold tracking-tight mt-2">{formatMoney(report.totals.ownerNet - report.totals.ownerExpenses)}</div>
            {report.totals.ownerExpenses > 0 && (
              <div className="text-xs text-white/60 mt-1">
                − {t.finance.expenses}: {formatMoney(report.totals.ownerExpenses)}
              </div>
            )}
          </div>
        </div>

        <div className="grid lg:grid-cols-[1fr_340px] gap-6 items-start mb-10">
          <section>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">
                {o.availability} · <span className="capitalize">{monthYear(calMonth, locale)}</span>
              </h2>
              <div className="flex gap-1">
                <Link href={calLink(addMonths(calMonth, -1))} className="btn-secondary size-9 p-0" aria-label={t.common.prev}>
                  <ChevronLeft className="size-4" />
                </Link>
                <Link href={calLink(addMonths(calMonth, 1))} className="btn-secondary size-9 p-0" aria-label={t.common.next}>
                  <ChevronRight className="size-4" />
                </Link>
              </div>
            </div>
            <div className="grid sm:grid-cols-2 gap-4">
              {calendarProps.map((p) => {
                const occupied = p.bookings.reduce(
                  (s, b) => s + Math.max(0, nightsBetween(b.checkIn < calMonth ? calMonth : b.checkIn, b.checkOut > calEnd ? calEnd : b.checkOut)),
                  0,
                );
                return (
                  <div key={p.id} className="card overflow-hidden">
                    <div className="flex items-center gap-3 p-4 pb-3">
                      {p.images[0] && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={p.images[0].url} alt="" className="size-12 rounded-xl object-cover" />
                      )}
                      <div className="min-w-0">
                        <div className="font-medium truncate">{p.name}</div>
                        <div className="text-xs text-muted">
                          {occupied}/{daysInMonth(calMonth)} {t.common.nights}
                        </div>
                      </div>
                    </div>
                    <div className="px-4 pb-4">
                      <MonthGrid month={calMonth} bookings={p.bookings} locale={locale} />
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="flex flex-wrap gap-x-4 gap-y-1 mt-3 text-xs text-muted">
              <span className="flex items-center gap-1.5"><span className="size-2.5 rounded bg-emerald-100" /> {t.public.available}</span>
              {(["BOOKING", "AIRBNB", "DIRECT"] as const).map((s) => (
                <span key={s} className="flex items-center gap-1.5"><Dot color={bookingColor(s)} /> {t.bookingSources[s]}</span>
              ))}
              <span className="flex items-center gap-1.5"><Dot color={bookingColor("OWNER", "OWNER_STAY")} /> {t.bookingKinds.OWNER_STAY}</span>
            </div>
          </section>

          <aside className="space-y-6 lg:sticky lg:top-6">
            <Section title={o.requestStay}>
              <OwnerStayForm
                properties={calendarProps.map((p) => ({ id: p.id, name: p.name }))}
                minDate={toISODate(d0)}
                labels={{
                  property: t.common.property,
                  from: t.bookingAdmin.checkIn,
                  to: t.bookingAdmin.checkOut,
                  reason: o.reason,
                  send: t.common.send,
                  sent: o.requestSent,
                  help: o.requestStayHelp,
                }}
              />
            </Section>
            <Section title={o.myRequests}>
              <ul className="space-y-2">
                {requests.map((r) => (
                  <li key={r.id} className="flex items-center justify-between gap-2 text-sm">
                    <span>
                      <span className="font-medium">{r.property.name}</span>
                      <span className="block text-xs text-muted">
                        {dayMonth(r.checkIn, locale)} → {dayMonthYear(r.checkOut, locale)}
                      </span>
                    </span>
                    <StatusBadge status={r.status} label={t.bookingStatuses[r.status]} />
                  </li>
                ))}
                {!requests.length && <li className="text-sm text-muted">–</li>}
              </ul>
            </Section>
          </aside>
        </div>

        <Section title={o.earnings} className="overflow-hidden">
          <div className="overflow-x-auto -m-5">
            <table className="table">
              <thead>
                <tr>
                  <th>{t.common.date}</th>
                  <th>{t.common.property}</th>
                  <th>{t.bookingAdmin.source}</th>
                  <th className="text-right">{t.common.nights}</th>
                  <th className="text-right">{o.gross}</th>
                  <th className="text-right">{o.platform}</th>
                  <th className="text-right">{o.management}</th>
                  <th className="text-right">{o.net}</th>
                </tr>
              </thead>
              <tbody>
                {stays.map(({ b, p, split }) => (
                  <tr key={b.id}>
                    <td className="whitespace-nowrap">
                      {dayMonth(b.checkIn, locale)} → {dayMonthYear(b.checkOut, locale)}
                    </td>
                    <td className="whitespace-nowrap">{p.name}</td>
                    <td className="whitespace-nowrap">
                      <span className="flex items-center gap-1.5">
                        <Dot color={bookingColor(b.source)} /> {t.bookingSources[b.source]}
                      </span>
                    </td>
                    <td className="text-right">{nightsBetween(b.checkIn, b.checkOut)}</td>
                    <td className="text-right whitespace-nowrap">{formatMoney(split.gross)}</td>
                    <td className="text-right whitespace-nowrap text-muted">{split.platform ? `−${formatMoney(split.platform)}` : "–"}</td>
                    <td className="text-right whitespace-nowrap text-muted">−{formatMoney(split.management + split.cleaning)}</td>
                    <td className="text-right whitespace-nowrap font-semibold">{formatMoney(split.ownerNet)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!stays.length && <Empty>{o.noBookings}</Empty>}
          </div>
        </Section>
        <p className="text-xs text-muted mt-3">{t.finance.explain}</p>
      </main>
    </div>
  );
}
