import Link from "next/link";
import { Ban, Star } from "lucide-react";
import { db } from "@/lib/db";
import { getT } from "@/lib/i18n";
import { bookingTotal } from "@/lib/finance";
import { formatMoney } from "@/lib/money";
import { dayMonthYear } from "@/lib/format";
import { PageHeader, Empty } from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function GuestsPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sp = await searchParams;
  const { t, locale } = await getT();
  const q = sp.q?.trim();
  const guests = await db.guest.findMany({
    where: {
      ...(q
        ? {
            OR: [
              { name: { contains: q, mode: "insensitive" } },
              { email: { contains: q, mode: "insensitive" } },
              { phone: { contains: q } },
              { documentNumber: { contains: q, mode: "insensitive" } },
            ],
          }
        : {}),
      ...(sp.filter === "vip" ? { vip: true } : sp.filter === "blacklist" ? { blacklisted: true } : {}),
    },
    include: {
      bookings: {
        where: { status: { notIn: ["CANCELLED", "REJECTED"] } },
        select: { checkIn: true, accommodationTotal: true, cleaningFee: true, platformCommission: true },
        orderBy: { checkIn: "desc" },
      },
    },
    orderBy: { name: "asc" },
    take: 300,
  });

  return (
    <>
      <PageHeader
        title={t.guestAdmin.title}
        subtitle={`${guests.length}`}
        actions={<Link href="/admin/mysafiret/new" className="btn-primary">+ {t.guestAdmin.new}</Link>}
      />
      <form className="flex flex-wrap gap-2 mb-4" action="/admin/mysafiret">
        <input name="q" defaultValue={q} placeholder={`${t.common.search}…`} className="input max-w-72" />
        {[
          ["", t.common.all],
          ["vip", t.guestAdmin.vip],
          ["blacklist", t.guestAdmin.blacklisted],
        ].map(([v, l]) => (
          <button key={v} name="filter" value={v} className={(sp.filter ?? "") === v ? "chip-active" : "chip"}>
            {l}
          </button>
        ))}
      </form>
      <div className="card overflow-x-auto">
        <table className="table">
          <thead>
            <tr>
              <th>{t.common.name}</th>
              <th>{t.common.phone}</th>
              <th>{t.common.email}</th>
              <th>{t.guestAdmin.nationality}</th>
              <th className="text-right">{t.guestAdmin.stays}</th>
              <th className="text-right">{t.guestAdmin.spent}</th>
              <th>{t.guestAdmin.lastStay}</th>
            </tr>
          </thead>
          <tbody>
            {guests.map((g) => (
              <tr key={g.id} className="hover:bg-paper">
                <td>
                  <Link href={`/admin/mysafiret/${g.id}`} className="font-medium hover:underline underline-offset-4 flex items-center gap-1.5">
                    {g.name}
                    {g.vip && <Star className="size-3.5 fill-amber-400 text-amber-400" />}
                    {g.blacklisted && <Ban className="size-3.5 text-red-500" />}
                  </Link>
                </td>
                <td className="whitespace-nowrap">{g.phone}</td>
                <td className="text-muted">{g.email}</td>
                <td>{g.nationality}</td>
                <td className="text-right">{g.bookings.length}</td>
                <td className="text-right whitespace-nowrap">{formatMoney(g.bookings.reduce((s, b) => s + bookingTotal(b), 0))}</td>
                <td className="whitespace-nowrap text-muted">{g.bookings[0] ? dayMonthYear(g.bookings[0].checkIn, locale) : "–"}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {!guests.length && <Empty>{t.common.noResults}</Empty>}
      </div>
    </>
  );
}
