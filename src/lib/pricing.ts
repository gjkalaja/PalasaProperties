import { eachNight, isWeekendNight, nightsBetween, toISODate } from "./dates";
import { num, round2, type DecimalLike } from "./money";

export interface PricingProperty {
  basePrice: DecimalLike;
  weekendPrice?: DecimalLike;
  cleaningFee: DecimalLike;
  minNights: number;
}

export interface PricingRate {
  startDate: Date;
  endDate: Date; // inclusive
  pricePerNight: DecimalLike;
  weekendPrice?: DecimalLike;
  minNights?: number | null;
}

/** The seasonal rate covering a night. When rates overlap, the shortest (most specific) wins. */
export function rateForNight(rates: PricingRate[], night: Date): PricingRate | undefined {
  return rates
    .filter((r) => r.startDate <= night && night <= r.endDate)
    .sort(
      (a, b) =>
        a.endDate.getTime() - a.startDate.getTime() - (b.endDate.getTime() - b.startDate.getTime()),
    )[0];
}

export function nightlyPrice(property: PricingProperty, rates: PricingRate[], night: Date): number {
  const rate = rateForNight(rates, night);
  const weekend = isWeekendNight(night);
  if (rate) {
    if (weekend && rate.weekendPrice != null) return num(rate.weekendPrice);
    return num(rate.pricePerNight);
  }
  if (weekend && property.weekendPrice != null) return num(property.weekendPrice);
  return num(property.basePrice);
}

/** Minimum stay required for a stay starting on `checkIn`. */
export function minNightsFor(property: PricingProperty, rates: PricingRate[], checkIn: Date): number {
  return rateForNight(rates, checkIn)?.minNights ?? property.minNights;
}

export interface Quote {
  nights: number;
  breakdown: { date: string; price: number }[];
  accommodation: number;
  cleaningFee: number;
  total: number;
  minNights: number;
  meetsMinNights: boolean;
}

export function quoteStay(
  property: PricingProperty,
  rates: PricingRate[],
  checkIn: Date,
  checkOut: Date,
): Quote {
  const breakdown = eachNight(checkIn, checkOut).map((d) => ({
    date: toISODate(d),
    price: nightlyPrice(property, rates, d),
  }));
  const accommodation = round2(breakdown.reduce((s, n) => s + n.price, 0));
  const cleaningFee = breakdown.length ? num(property.cleaningFee) : 0;
  const minNights = minNightsFor(property, rates, checkIn);
  const nights = nightsBetween(checkIn, checkOut);
  return {
    nights,
    breakdown,
    accommodation,
    cleaningFee,
    total: round2(accommodation + cleaningFee),
    minNights,
    meetsMinNights: nights >= minNights,
  };
}
