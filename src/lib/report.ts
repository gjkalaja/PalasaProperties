import "server-only";
import type { BookingSource, Prisma } from "@prisma/client";
import { db } from "./db";
import { nightsInRange, ownerSplit, prorate } from "./finance";
import { num, round2 } from "./money";
import { nightsBetween } from "./dates";

const EARNING_STATUSES = ["CONFIRMED", "CHECKED_IN", "CHECKED_OUT"] as const;

export interface PropertyRow {
  id: string;
  name: string;
  ownerName: string | null;
  nights: number;
  occupancy: number;
  gross: number;
  platform: number;
  cleaning: number;
  management: number;
  ownerNet: number;
  expenses: number;
  ownerExpenses: number;
}

/**
 * Financial report for [from, to). Stays crossing the period edges are prorated by night,
 * so a stay from 28 Sep to 4 Oct counts 3 nights in October.
 */
export async function financeReport(from: Date, to: Date, where: Prisma.PropertyWhereInput = {}) {
  const days = nightsBetween(from, to);
  const properties = await db.property.findMany({
    where,
    orderBy: { name: "asc" },
    include: {
      owner: true,
      bookings: {
        where: { status: { in: [...EARNING_STATUSES] }, checkIn: { lt: to }, checkOut: { gt: from } },
        include: { guest: { select: { name: true } } },
        orderBy: { checkIn: "asc" },
      },
      expenses: { where: { date: { gte: from, lt: to } }, orderBy: { date: "asc" } },
    },
  });

  const bySource = new Map<BookingSource, { gross: number; nights: number }>();
  const rows: PropertyRow[] = properties.map((p) => {
    const rate = p.owner ? num(p.owner.commissionRate) : 0;
    const row: PropertyRow = {
      id: p.id,
      name: p.name,
      ownerName: p.owner?.name ?? null,
      nights: 0,
      occupancy: 0,
      gross: 0,
      platform: 0,
      cleaning: 0,
      management: 0,
      ownerNet: 0,
      expenses: 0,
      ownerExpenses: 0,
    };
    for (const b of p.bookings) {
      const n = nightsInRange(b.checkIn, b.checkOut, from, to);
      row.nights += n;
      if (b.kind === "OWNER_STAY" || b.kind === "MAINTENANCE") continue;
      const split = ownerSplit(b, rate);
      const share = (v: number) => prorate(v, b.checkIn, b.checkOut, from, to);
      row.gross += share(split.gross);
      row.platform += share(split.platform);
      row.cleaning += share(split.cleaning);
      row.management += share(split.management);
      row.ownerNet += share(split.ownerNet);
      const s = bySource.get(b.source) ?? { gross: 0, nights: 0 };
      s.gross += share(split.gross);
      s.nights += n;
      bySource.set(b.source, s);
    }
    for (const e of p.expenses) {
      if (e.chargeToOwner) row.ownerExpenses += num(e.amount);
      else row.expenses += num(e.amount);
    }
    row.occupancy = days ? Math.round((row.nights / days) * 100) : 0;
    for (const k of ["gross", "platform", "cleaning", "management", "ownerNet", "expenses", "ownerExpenses"] as const) row[k] = round2(row[k]);
    return row;
  });

  const sum = (k: keyof PropertyRow) => round2(rows.reduce((s, r) => s + (r[k] as number), 0));
  const totals = {
    gross: sum("gross"),
    platform: sum("platform"),
    cleaning: sum("cleaning"),
    management: sum("management"),
    ownerNet: sum("ownerNet"),
    expenses: sum("expenses"),
    ownerExpenses: sum("ownerExpenses"),
    nights: sum("nights"),
    occupancy: rows.length && days ? Math.round((sum("nights") / (rows.length * days)) * 100) : 0,
  };
  return {
    rows,
    totals,
    profit: round2(totals.management + totals.cleaning - totals.expenses),
    bySource: [...bySource.entries()].map(([source, v]) => ({ source, gross: round2(v.gross), nights: v.nights })).sort((a, b) => b.gross - a.gross),
    properties,
  };
}

/** Parses ?year=&month= into a [from, to) period; month "all" = whole year. */
export function periodFromParams(sp: Record<string, string | undefined>, now: Date) {
  const year = Number(sp.year) || now.getUTCFullYear();
  const monthRaw = sp.month ?? String(now.getUTCMonth() + 1);
  if (monthRaw === "all") {
    return { year, month: "all" as const, from: new Date(Date.UTC(year, 0, 1)), to: new Date(Date.UTC(year + 1, 0, 1)) };
  }
  const month = Math.min(12, Math.max(1, Number(monthRaw) || 1));
  return { year, month, from: new Date(Date.UTC(year, month - 1, 1)), to: new Date(Date.UTC(year, month, 1)) };
}
