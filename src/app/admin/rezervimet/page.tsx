import Link from "next/link";
import type { BookingSource, BookingStatus, Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { getT } from "@/lib/i18n";
import { today, nightsBetween } from "@/lib/dates";
import { dayMonth, dayMonthYear } from "@/lib/format";
import { bookingTotal } from "@/lib/finance";
import { formatMoney } from "@/lib/money";
import { bookingColor } from "@/lib/ui";
import { Dot, Empty, PageHeader, StatusBadge } from "@/components/ui";
import { AutoSubmitSelect } from "@/components/client";

export const dynamic = "force-dynamic";

const SOURCES = ["DIRECT", "BOOKING", "AIRBNB", "PHONE", "OWNER", "OTHER"] as const;
const STATUSES = ["PENDING", "CONFIRMED", "CHECKED_IN", "CHECKED_OUT", "CANCELLED", "REJECTED"] as const;

export default async function BookingsPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sp = await searchParams;
  const { t, locale } = await getT();
  const d0 = today();
  const tab = sp.tab === "past" ? "past" : "upcoming";
  const q = sp.q?.trim();

  const where: Prisma.BookingWhereInput = {
    ...(tab === "upcoming" ? { checkOut: { gte: d0 } } : { checkOut: { lt: d0 } }),
    ...(sp.property ? { propertyId: sp.property } : {}),
    ...(SOURCES.includes(sp.source as BookingSource) ? { source: sp.source as BookingSource } : {}),
    ...(STATUSES.includes(sp.status as BookingStatus) ? { status: sp.status as BookingStatus } : {}),
    ...(q
      ? {
          OR: [
            { code: { contains: q, mode: "insensitive" } },
            { guest: { name: { contains: q, mode: "insensitive" } } },
            { guest: { phone: { contains: q } } },
          ],
        }
      : {}),
  };
  const [bookings, properties] = await Promise.all([
    db.booking.findMany({
      where,
      include: { property: { select: { name: true } }, guest: { select: { name: true } }, payments: { select: { amount: true } } },
      orderBy: { checkIn: tab === "upcoming" ? "asc" : "desc" },
      take: 200,
    }),
    db.property.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
  ]);

  const tabLink = (tb: string) => {
    const p = new URLSearchParams(Object.entries(sp).filter(([, v]) => v) as [string, string][]);
    p.set("tab", tb);
    return `/admin/rezervimet?${p}`;
  };

  return (
    <>
      <PageHeader
        title={t.bookingAdmin.title}
        actions={
          <Link href="/admin/rezervimet/new" className="btn-primary">
            + {t.bookingAdmin.new}
          </Link>
        }
      />
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <div className="inline-flex rounded-full border border-line p-0.5 bg-white">
          {(["upcoming", "past"] as const).map((tb) => (
            <Link
              key={tb}
              href={tabLink(tb)}
              className={`px-4 h-8 grid place-items-center rounded-full text-sm ${tab === tb ? "bg-ink text-white" : "text-muted"}`}
            >
              {t.bookingAdmin[tb]}
            </Link>
          ))}
        </div>
        <form className="flex flex-wrap gap-2 flex-1" action="/admin/rezervimet">
          <input type="hidden" name="tab" value={tab} />
          <input name="q" defaultValue={q} placeholder={`${t.common.search}: ${t.common.guest.toLowerCase()}, ${t.bookingAdmin.code.toLowerCase()}…`} className="input max-w-64" />
          <AutoSubmitSelect name="property" defaultValue={sp.property ?? ""} className="input max-w-52">
            <option value="">{t.common.properties}: {t.common.all}</option>
            {properties.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </AutoSubmitSelect>
          <AutoSubmitSelect name="source" defaultValue={sp.source ?? ""} className="input max-w-44">
            <option value="">{t.bookingAdmin.source}: {t.common.all}</option>
            {SOURCES.map((s) => (
              <option key={s} value={s}>{t.bookingSources[s]}</option>
            ))}
          </AutoSubmitSelect>
          <AutoSubmitSelect name="status" defaultValue={sp.status ?? ""} className="input max-w-44">
            <option value="">{t.common.status}: {t.common.all}</option>
            {STATUSES.map((s) => (
              <option key={s} value={s}>{t.bookingStatuses[s]}</option>
            ))}
          </AutoSubmitSelect>
        </form>
      </div>

      <div className="card overflow-x-auto">
        <table className="table">
          <thead>
            <tr>
              <th>{t.bookingAdmin.code}</th>
              <th>{t.common.guest}</th>
              <th>{t.common.property}</th>
              <th>{t.bookingAdmin.checkIn}</th>
              <th>{t.common.nights}</th>
              <th>{t.bookingAdmin.source}</th>
              <th>{t.common.status}</th>
              <th className="text-right">{t.common.total}</th>
              <th className="text-right">{t.bookingAdmin.balance}</th>
            </tr>
          </thead>
          <tbody>
            {bookings.map((b) => {
              const total = bookingTotal(b);
              const paid = b.payments.reduce((s, p) => s + Number(p.amount), 0);
              const balance = Math.max(0, total - paid);
              return (
                <tr key={b.id} className="hover:bg-paper">
                  <td>
                    <Link href={`/admin/rezervimet/${b.id}`} className="font-mono text-xs underline-offset-4 hover:underline">
                      {b.code}
                    </Link>
                  </td>
                  <td className="max-w-48 truncate">
                    <Link href={`/admin/rezervimet/${b.id}`} className="font-medium hover:underline underline-offset-4">
                      {b.guest?.name ?? <span className="text-muted">{t.bookingKinds[b.kind]}</span>}
                    </Link>
                  </td>
                  <td className="whitespace-nowrap">{b.property.name}</td>
                  <td className="whitespace-nowrap">
                    {dayMonth(b.checkIn, locale)} → {dayMonthYear(b.checkOut, locale)}
                  </td>
                  <td>{nightsBetween(b.checkIn, b.checkOut)}</td>
                  <td className="whitespace-nowrap">
                    <span className="flex items-center gap-1.5">
                      <Dot color={bookingColor(b.source, b.kind)} />
                      {t.bookingSources[b.source]}
                    </span>
                  </td>
                  <td>
                    <StatusBadge status={b.status} label={t.bookingStatuses[b.status]} />
                  </td>
                  <td className="text-right whitespace-nowrap">{total ? formatMoney(total) : "–"}</td>
                  <td className={`text-right whitespace-nowrap ${balance > 0 ? "text-amber-700 font-medium" : "text-muted"}`}>
                    {total ? formatMoney(balance) : "–"}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {!bookings.length && <Empty>{t.common.noResults}</Empty>}
      </div>
    </>
  );
}
