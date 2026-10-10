"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { getT } from "@/lib/i18n";
import { parseISODate, today } from "@/lib/dates";
import { BookingConflictError, createBooking } from "@/lib/bookings";

export async function requestOwnerStay(_prev: { ok?: boolean; error?: string } | undefined, fd: FormData) {
  const user = await requireUser(["OWNER", "ADMIN"]);
  const { t } = await getT();
  const d = z
    .object({ propertyId: z.string(), checkIn: z.string(), checkOut: z.string(), notes: z.string().max(1000).optional() })
    .safeParse(Object.fromEntries(fd));
  if (!d.success) return { error: t.bookingAdmin.invalidDates };
  const checkIn = parseISODate(d.data.checkIn);
  const checkOut = parseISODate(d.data.checkOut);
  if (!checkIn || !checkOut || checkOut <= checkIn || checkIn < today()) return { error: t.bookingAdmin.invalidDates };
  const property = await db.property.findFirst({
    where: { id: d.data.propertyId, ...(user.role === "OWNER" ? { ownerId: user.id } : {}) },
  });
  if (!property) return { error: t.public.notFound };
  try {
    await createBooking({
      propertyId: property.id,
      kind: "OWNER_STAY",
      source: "OWNER",
      status: "PENDING",
      checkIn,
      checkOut,
      adults: 0,
      requestedById: user.id,
      notes: d.data.notes || null,
    });
  } catch (e) {
    if (e instanceof BookingConflictError) return { error: t.public.datesUnavailable };
    throw e;
  }
  revalidatePath("/pronari");
  revalidatePath("/admin", "layout");
  return { ok: true };
}
