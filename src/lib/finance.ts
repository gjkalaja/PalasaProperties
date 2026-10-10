import { num, round2, type DecimalLike } from "./money";

export interface StatementBooking {
  accommodationTotal: DecimalLike;
  cleaningFee: DecimalLike;
  platformCommission: DecimalLike;
}

/**
 * Owner split for one reservation.
 * - gross: what the guest paid (accommodation + cleaning)
 * - platform: Booking/Airbnb commission
 * - cleaning: kept by management to pay the cleaning
 * - management: commission % applied to accommodation after platform commission
 * - ownerNet: what the owner receives
 */
export function ownerSplit(b: StatementBooking, commissionRate: DecimalLike) {
  const accommodation = num(b.accommodationTotal);
  const cleaning = num(b.cleaningFee);
  const platform = num(b.platformCommission);
  const base = Math.max(0, accommodation - platform);
  const management = round2((base * num(commissionRate)) / 100);
  return {
    gross: round2(accommodation + cleaning),
    accommodation,
    cleaning,
    platform,
    management,
    ownerNet: round2(base - management),
  };
}

export function bookingTotal(b: StatementBooking): number {
  return round2(num(b.accommodationTotal) + num(b.cleaningFee));
}

/** Number of nights of [checkIn, checkOut) that fall inside [from, to). */
export function nightsInRange(checkIn: Date, checkOut: Date, from: Date, to: Date): number {
  const s = Math.max(checkIn.getTime(), from.getTime());
  const e = Math.min(checkOut.getTime(), to.getTime());
  return Math.max(0, Math.round((e - s) / 86_400_000));
}

/** Share of an amount attributable to the part of the stay inside [from, to). */
export function prorate(amount: number, checkIn: Date, checkOut: Date, from: Date, to: Date): number {
  const total = Math.round((checkOut.getTime() - checkIn.getTime()) / 86_400_000);
  if (total <= 0) return 0;
  return (amount * nightsInRange(checkIn, checkOut, from, to)) / total;
}
