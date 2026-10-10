import Link from "next/link";
import { Download, Trash2 } from "lucide-react";
import { db } from "@/lib/db";
import { getT } from "@/lib/i18n";
import { requireUser } from "@/lib/auth";
import { toISODate, today } from "@/lib/dates";
import { dayMonthYear, monthName } from "@/lib/format";
import { formatMoney } from "@/lib/money";
import { financeReport, periodFromParams } from "@/lib/report";
import { bookingColor } from "@/lib/ui";
import { Dot, PageHeader, Section, Stat } from "@/components/ui";
import { AutoSubmitSelect, SubmitButton } from "@/components/client";
import { addExpense, deleteExpense } from "./actions";

export const dynamic = "force-dynamic";

export default async function FinancePage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  await requireUser(["ADMIN"]);
  const sp = await searchParams;
  const { t, locale } = await getT();
  const f = t.finance;
  const period = periodFromParams(sp, today());
  const report = await financeReport(period.from, period.to);
  const expenses = await db.expense.findMany({
    where: { date: { gte: period.from, lt: period.to } },
    include: { property: { select: { name: true } } },
    orderBy: { date: "desc" },
    take: 200,
  });
  const years = Array.from({ length: 4 }, (_, i) => today().getUTCFullYear() - 2 + i);
  const qs = `year=${period.year}&month=${period.month}`;

  return (
    <>
      <PageHeader
        title={f.title}
        subtitle={f.explain}
        actions={
          <a href={`/api/finance/export?${qs}`} className="btn-secondary">
            <Download className="size-4" /> {f.exportCsv}
          </a>
        }
      />
      <form className="flex flex-wrap gap-2 mb-6" action="/admin/financat">
        <AutoSubmitSelect name="month" defaultValue={String(period.month)} className="input max-w-44 capitalize">
          <option value="all">{f.wholeYear}</option>
          {Array.from({ length: 12 }, (_, m) => (
            <option key={m} value={m + 1}>
              {monthName(m, locale)}
            </option>
          ))}
        </AutoSubmitSelect>
        <AutoSubmitSelect name="year" defaultValue={String(period.year)} className="input max-w-32">
          {years.map((y) => (
            <option key={y} value={y}>{y}</option>
          ))}
        </AutoSubmitSelect>
      </form>

      <div className="grid grid-cols-2 lg:grid-cols-4 xl:grid-cols-6 gap-3 mb-8">
        <Stat label={f.revenue} value={formatMoney(report.totals.gross)} />
        <Stat label={f.platformFees} value={formatMoney(report.totals.platform)} />
        <Stat label={f.ownerNet} value={formatMoney(report.totals.ownerNet)} />
        <Stat label={f.managementFees} value={formatMoney(report.totals.management)} hint={`+ ${t.bookingAdmin.cleaningFee}: ${formatMoney(report.totals.cleaning)}`} />
        <Stat label={f.expenses} value={formatMoney(report.totals.expenses)} hint={`${f.chargeToOwner}: ${formatMoney(report.totals.ownerExpenses)}`} />
        <Stat label={f.profit} value={formatMoney(report.profit)} hint={`${f.occupancy}: ${report.totals.occupancy}%`} />
      </div>

      <div className="grid xl:grid-cols-[1fr_320px] gap-6 mb-6 items-start">
        <Section title={f.byProperty} className="overflow-hidden">
          <div className="overflow-x-auto -m-5">
            <table className="table">
              <thead>
                <tr>
                  <th>{t.common.property}</th>
                  <th className="text-right">{f.occupancy}</th>
                  <th className="text-right">{f.revenue}</th>
                  <th className="text-right">{f.platformFees}</th>
                  <th className="text-right">{f.managementFees}</th>
                  <th className="text-right">{f.ownerNet}</th>
                  <th className="text-right">{f.expenses}</th>
                </tr>
              </thead>
              <tbody>
                {report.rows.map((r) => (
                  <tr key={r.id}>
                    <td className="min-w-52">
                      <Link href={`/admin/prona/${r.id}`} className="font-medium hover:underline underline-offset-4">{r.name}</Link>
                      {r.ownerName && <div className="text-xs text-muted">{r.ownerName}</div>}
                    </td>
                    <td className="text-right">{r.occupancy}%</td>
                    <td className="text-right whitespace-nowrap font-medium">{formatMoney(r.gross)}</td>
                    <td className="text-right whitespace-nowrap text-muted">{formatMoney(r.platform)}</td>
                    <td className="text-right whitespace-nowrap">{formatMoney(r.management)}</td>
                    <td className="text-right whitespace-nowrap">{formatMoney(r.ownerNet - r.ownerExpenses)}</td>
                    <td className="text-right whitespace-nowrap text-muted">{formatMoney(r.expenses + r.ownerExpenses)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Section>
        <Section title={f.bySource}>
          <ul className="space-y-3">
            {report.bySource.map((s) => (
              <li key={s.source} className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-2">
                  <Dot color={bookingColor(s.source)} /> {t.bookingSources[s.source]}
                </span>
                <span className="text-right">
                  <span className="font-medium">{formatMoney(s.gross)}</span>
                  <span className="text-xs text-muted block">
                    {s.nights} {t.common.nights} · {report.totals.gross ? Math.round((s.gross / report.totals.gross) * 100) : 0}%
                  </span>
                </span>
              </li>
            ))}
          </ul>
        </Section>
      </div>

      <Section title={f.expenses}>
        <form action={addExpense} className="grid sm:grid-cols-2 lg:grid-cols-[1.5fr_1fr_0.8fr_1fr_1.5fr_auto_auto] gap-2 items-end mb-5">
          <select name="propertyId" required className="input">
            {report.rows.map((r) => (
              <option key={r.id} value={r.id}>{r.name}</option>
            ))}
          </select>
          <input name="category" list="exp-cats" required placeholder={f.category} className="input" />
          <datalist id="exp-cats">
            {f.expenseCategories.map((c) => (
              <option key={c} value={c} />
            ))}
          </datalist>
          <input name="amount" type="number" step="0.01" min="0.01" required placeholder="€" className="input" />
          <input name="date" type="date" required defaultValue={toISODate(today())} className="input" />
          <input name="description" placeholder={t.taskAdmin.description} className="input" />
          <label className="flex items-center gap-2 text-xs h-10 whitespace-nowrap">
            <input type="checkbox" name="chargeToOwner" className="accent-black" /> {f.chargeToOwner}
          </label>
          <SubmitButton className="btn-primary">+ {f.addExpense}</SubmitButton>
        </form>
        <div className="overflow-x-auto -mx-5">
          <table className="table">
            <tbody>
              {expenses.map((e) => (
                <tr key={e.id}>
                  <td className="whitespace-nowrap text-muted">{dayMonthYear(e.date, locale)}</td>
                  <td>{e.property.name}</td>
                  <td>{e.category}</td>
                  <td className="text-muted">{e.description}</td>
                  <td>{e.chargeToOwner && <span className="badge bg-amber-50 text-amber-800">{f.chargeToOwner}</span>}</td>
                  <td className="text-right font-medium whitespace-nowrap">{formatMoney(e.amount)}</td>
                  <td className="w-10">
                    <form action={deleteExpense.bind(null, e.id)}>
                      <SubmitButton className="btn-ghost size-8 p-0" confirm={`${t.common.delete}?`}>
                        <Trash2 className="size-3.5" />
                      </SubmitButton>
                    </form>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>
    </>
  );
}
