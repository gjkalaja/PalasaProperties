// All calendar dates are handled as UTC-midnight Date objects ("date-only").
// Bookings are stored as @db.Date, so checkIn/checkOut never carry a time.

export const TIMEZONE = "Europe/Tirane";
const DAY_MS = 86_400_000;

/** Parses "YYYY-MM-DD" into a UTC-midnight Date. Returns null when invalid. */
export function parseISODate(value: string | null | undefined): Date | null {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const d = new Date(`${value}T00:00:00.000Z`);
  return Number.isNaN(d.getTime()) || toISODate(d) !== value ? null : d;
}

export function toISODate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export function addDays(d: Date, days: number): Date {
  return new Date(d.getTime() + days * DAY_MS);
}

export function nightsBetween(checkIn: Date, checkOut: Date): number {
  return Math.round((checkOut.getTime() - checkIn.getTime()) / DAY_MS);
}

/** Each night of a stay: checkIn, checkIn+1, ..., checkOut-1. */
export function eachNight(checkIn: Date, checkOut: Date): Date[] {
  const n = nightsBetween(checkIn, checkOut);
  return Array.from({ length: Math.max(0, n) }, (_, i) => addDays(checkIn, i));
}

/** Today's date in Albania, as a UTC-midnight Date. */
export function today(): Date {
  const iso = new Intl.DateTimeFormat("en-CA", {
    timeZone: TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
  return parseISODate(iso)!;
}

export function startOfMonth(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1));
}

export function addMonths(d: Date, months: number): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + months, 1));
}

export function daysInMonth(d: Date): number {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0)).getUTCDate();
}

/** Friday and Saturday nights count as weekend nights. */
export function isWeekendNight(d: Date): boolean {
  const day = d.getUTCDay();
  return day === 5 || day === 6;
}

/** Half-open interval overlap: [aStart, aEnd) vs [bStart, bEnd). */
export function rangesOverlap(aStart: Date, aEnd: Date, bStart: Date, bEnd: Date): boolean {
  return aStart < bEnd && bStart < aEnd;
}
