import "server-only";
import { randomBytes } from "node:crypto";
import type { Booking, Prisma, Property } from "@prisma/client";
import { db } from "./db";
import { BLOCKING_STATUSES } from "./availability";
import { atLocalTime } from "./links";

export class BookingConflictError extends Error {
  constructor(public conflicts: { code: string; checkIn: Date; checkOut: Date }[]) {
    super("conflict");
  }
}

export function generateCode(): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const bytes = randomBytes(6);
  return "PL-" + Array.from(bytes, (b) => alphabet[b % alphabet.length]).join("");
}

export const DEFAULT_CLEANING_CHECKLIST = [
  "Ndërro çarçafët dhe peshqirët",
  "Pastro banjot",
  "Pastro kuzhinën dhe frigoriferin",
  "Fshi dhe laj dyshemetë",
  "Hidh mbeturinat",
  "Kontrollo për dëmtime",
  "Plotëso furnizimet (sapun, letër, kafe)",
  "Kontrollo telekomandat dhe çelësat",
];

type Tx = Prisma.TransactionClient;

/** Serialises writes per property so two requests can't book the same nights at the same time. */
async function lockProperty(tx: Tx, propertyId: string) {
  await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${propertyId}))`;
}

async function assertAvailable(tx: Tx, propertyId: string, checkIn: Date, checkOut: Date, ignoreId?: string) {
  const conflicts = await tx.booking.findMany({
    where: {
      propertyId,
      status: { in: BLOCKING_STATUSES },
      checkIn: { lt: checkOut },
      checkOut: { gt: checkIn },
      ...(ignoreId ? { id: { not: ignoreId } } : {}),
    },
    select: { code: true, checkIn: true, checkOut: true },
  });
  if (conflicts.length) throw new BookingConflictError(conflicts);
}

/** Creates or moves the cleaning task that follows a stay. */
export async function syncCleaningTask(
  tx: Tx,
  booking: Pick<Booking, "id" | "propertyId" | "checkOut" | "status" | "kind">,
  property: Pick<Property, "cleanerId" | "checkOutTime">,
) {
  const existing = await tx.task.findFirst({ where: { bookingId: booking.id, type: "CLEANING" } });
  const active = BLOCKING_STATUSES.includes(booking.status) && booking.kind !== "MAINTENANCE";
  if (!active) {
    if (existing && existing.status !== "DONE") await tx.task.delete({ where: { id: existing.id } });
    return;
  }
  const dueDate = atLocalTime(booking.checkOut, property.checkOutTime);
  if (existing) {
    if (existing.dueDate.getTime() !== dueDate.getTime()) {
      await tx.task.update({ where: { id: existing.id }, data: { dueDate } });
    }
    return;
  }
  await tx.task.create({
    data: {
      propertyId: booking.propertyId,
      bookingId: booking.id,
      type: "CLEANING",
      title: "Pastrim pas largimit",
      dueDate,
      assigneeId: property.cleanerId,
      checklist: DEFAULT_CLEANING_CHECKLIST.map((label) => ({ label, done: false })),
    },
  });
}

export async function createBooking(data: Omit<Prisma.BookingUncheckedCreateInput, "code">) {
  return db.$transaction(async (tx) => {
    await lockProperty(tx, data.propertyId);
    const checkIn = new Date(data.checkIn);
    const checkOut = new Date(data.checkOut);
    const status = data.status ?? "CONFIRMED";
    if (BLOCKING_STATUSES.includes(status)) await assertAvailable(tx, data.propertyId, checkIn, checkOut);
    const booking = await tx.booking.create({ data: { ...data, code: generateCode() } });
    const property = await tx.property.findUniqueOrThrow({ where: { id: data.propertyId } });
    await syncCleaningTask(tx, booking, property);
    return booking;
  });
}

export async function updateBooking(id: string, data: Prisma.BookingUncheckedUpdateInput) {
  return db.$transaction(async (tx) => {
    const current = await tx.booking.findUniqueOrThrow({ where: { id } });
    const propertyId = (data.propertyId as string | undefined) ?? current.propertyId;
    await lockProperty(tx, propertyId);
    const checkIn = data.checkIn ? new Date(data.checkIn as Date) : current.checkIn;
    const checkOut = data.checkOut ? new Date(data.checkOut as Date) : current.checkOut;
    const status = (data.status as Booking["status"] | undefined) ?? current.status;
    if (BLOCKING_STATUSES.includes(status)) await assertAvailable(tx, propertyId, checkIn, checkOut, id);
    const booking = await tx.booking.update({ where: { id }, data });
    const property = await tx.property.findUniqueOrThrow({ where: { id: booking.propertyId } });
    await syncCleaningTask(tx, booking, property);
    return booking;
  });
}
