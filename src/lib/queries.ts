import "server-only";
import { db } from "./db";
import { num } from "./money";
import { toISODate } from "./dates";
import type { FormProperty } from "@/components/BookingForm";

/** Properties with pricing data, serialised for client-side quoting. */
export async function formProperties(): Promise<FormProperty[]> {
  const props = await db.property.findMany({ where: { active: true }, orderBy: { name: "asc" }, include: { rates: true } });
  return props.map((p) => ({
    id: p.id,
    name: p.name,
    basePrice: num(p.basePrice),
    weekendPrice: p.weekendPrice == null ? null : num(p.weekendPrice),
    cleaningFee: num(p.cleaningFee),
    minNights: p.minNights,
    maxGuests: p.maxGuests,
    rates: p.rates.map((r) => ({
      startDate: toISODate(r.startDate),
      endDate: toISODate(r.endDate),
      pricePerNight: num(r.pricePerNight),
      weekendPrice: r.weekendPrice == null ? null : num(r.weekendPrice),
      minNights: r.minNights,
    })),
  }));
}

export async function formGuests() {
  return db.guest.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true, phone: true, blacklisted: true } });
}

/** For each task, the next stay at its property that starts on/after the task day. */
export async function nextBookingsForTasks(tasks: { id: string; propertyId: string; dueDate: Date }[]) {
  const { BLOCKING_STATUSES } = await import("./availability");
  const { localDay } = await import("./format");
  if (!tasks.length) return new Map();
  const from = new Date(Math.min(...tasks.map((t) => localDay(t.dueDate).getTime())));
  const bookings = await db.booking.findMany({
    where: {
      propertyId: { in: [...new Set(tasks.map((t) => t.propertyId))] },
      status: { in: BLOCKING_STATUSES },
      checkIn: { gte: from },
    },
    include: { guest: true },
    orderBy: { checkIn: "asc" },
  });
  return new Map(
    tasks.map((t) => [t.id, bookings.find((b) => b.propertyId === t.propertyId && b.checkIn >= localDay(t.dueDate)) ?? null]),
  );
}
