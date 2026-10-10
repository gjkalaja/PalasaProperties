import { NextResponse, type NextRequest } from "next/server";
import { getSession } from "@/lib/auth";
import { getT } from "@/lib/i18n";
import { today } from "@/lib/dates";
import { financeReport, periodFromParams } from "@/lib/report";

function csvCell(v: string | number | null | undefined): string {
  const s = v == null ? "" : String(v);
  return /[";\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

/** Semicolon-separated CSV with BOM so Excel (EU locale) opens it with correct columns and accents. */
export async function GET(req: NextRequest) {
  const session = await getSession();
  if (session?.role !== "ADMIN") return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const { t } = await getT();
  const f = t.finance;
  const period = periodFromParams(Object.fromEntries(req.nextUrl.searchParams), today());
  const report = await financeReport(period.from, period.to);
  const dec = (n: number) => n.toFixed(2).replace(".", ",");

  const lines: string[][] = [
    [t.common.property, t.propertyAdmin.owner, t.common.nights, f.occupancy, f.revenue, f.platformFees, t.bookingAdmin.cleaningFee, f.managementFees, f.ownerNet, f.chargeToOwner, f.expenses],
  ];
  for (const r of report.rows) {
    lines.push([r.name, r.ownerName ?? "", String(r.nights), `${r.occupancy}%`, dec(r.gross), dec(r.platform), dec(r.cleaning), dec(r.management), dec(r.ownerNet), dec(r.ownerExpenses), dec(r.expenses)]);
  }
  const x = report.totals;
  lines.push([t.common.total, "", String(x.nights), `${x.occupancy}%`, dec(x.gross), dec(x.platform), dec(x.cleaning), dec(x.management), dec(x.ownerNet), dec(x.ownerExpenses), dec(x.expenses)]);

  const body = "﻿" + lines.map((l) => l.map(csvCell).join(";")).join("\r\n");
  const name = `financat-${period.year}${period.month === "all" ? "" : `-${String(period.month).padStart(2, "0")}`}.csv`;
  return new NextResponse(body, {
    headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="${name}"` },
  });
}
