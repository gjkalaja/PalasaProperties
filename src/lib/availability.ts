import type { BookingStatus } from "@prisma/client";
import { addDays, rangesOverlap } from "./dates";

/** Statuses that occupy the calendar. PENDING blocks too, so two requests can't race for the same dates. */
export const BLOCKING_STATUSES: BookingStatus[] = ["PENDING", "CONFIRMED", "CHECKED_IN", "CHECKED_OUT"];

export interface Occupancy {
  id?: string;
  checkIn: Date;
  checkOut: Date;
  status: BookingStatus;
}

export function blocks(b: Occupancy): boolean {
  return BLOCKING_STATUSES.includes(b.status);
}

/** Returns the bookings that conflict with the requested [checkIn, checkOut) stay. */
export function findConflicts<T extends Occupancy>(
  existing: T[],
  checkIn: Date,
  checkOut: Date,
  ignoreId?: string,
): T[] {
  return existing.filter(
    (b) => b.id !== ignoreId && blocks(b) && rangesOverlap(b.checkIn, b.checkOut, checkIn, checkOut),
  );
}

/** Set of ISO dates (nights) that are occupied within the window. */
export function occupiedNights(existing: Occupancy[], from: Date, days: number): Set<string> {
  const out = new Set<string>();
  for (let i = 0; i < days; i++) {
    const night = addDays(from, i);
    const next = addDays(night, 1);
    if (existing.some((b) => blocks(b) && rangesOverlap(b.checkIn, b.checkOut, night, next))) {
      out.add(night.toISOString().slice(0, 10));
    }
  }
  return out;
}
