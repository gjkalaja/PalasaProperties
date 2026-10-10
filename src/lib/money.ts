import type { Prisma } from "@prisma/client";

export type DecimalLike = Prisma.Decimal | number | string | null | undefined;

export function num(v: DecimalLike): number {
  if (v === null || v === undefined) return 0;
  return typeof v === "number" ? v : Number(v.toString());
}

export function round2(v: number): number {
  return Math.round(v * 100) / 100;
}

export function formatMoney(v: DecimalLike, currency = "EUR"): string {
  return new Intl.NumberFormat("de-DE", {
    style: "currency",
    currency,
    maximumFractionDigits: num(v) % 1 === 0 ? 0 : 2,
  }).format(num(v));
}
