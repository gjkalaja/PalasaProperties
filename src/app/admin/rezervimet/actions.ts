"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { getT } from "@/lib/i18n";
import { parseISODate } from "@/lib/dates";
import { BookingConflictError, createBooking, updateBooking } from "@/lib/bookings";
import { dayMonthYear } from "@/lib/format";

const schema = z.object({
  id: z.string().optional(),
  propertyId: z.string().min(1),
  kind: z.enum(["RESERVATION", "OWNER_STAY", "MAINTENANCE", "EXTERNAL_BLOCK"]),
  source: z.enum(["DIRECT", "BOOKING", "AIRBNB", "PHONE", "OWNER", "OTHER"]),
  status: z.enum(["PENDING", "CONFIRMED", "CHECKED_IN", "CHECKED_OUT", "CANCELLED", "REJECTED"]),
  checkIn: z.string(),
  checkOut: z.string(),
  adults: z.coerce.number().int().min(0).max(50),
  children: z.coerce.number().int().min(0).max(50),
  guestId: z.string().optional(),
  guestName: z.string().trim().max(120).optional(),
  guestPhone: z.string().trim().max(40).optional(),
  guestEmail: z.string().trim().max(200).optional(),
  guestNationality: z.string().trim().max(60).optional(),
  accommodationTotal: z.coerce.number().min(0),
  cleaningFee: z.coerce.number().min(0),
  platformCommission: z.coerce.number().min(0),
  notes: z.string().max(5000).optional(),
  inquiryId: z.string().optional(),
});

export type BookingFormState = { error?: string } | undefined;

export async function saveBooking(_prev: BookingFormState, fd: FormData): Promise<BookingFormState> {
  await requireUser(["ADMIN", "MANAGER"]);
  const { t, locale } = await getT();
  const parsed = schema.safeParse(Object.fromEntries(fd));
  if (!parsed.success) return { error: parsed.error.issues.map((i) => i.path.join(".")).join(", ") };
  const d = parsed.data;
  const checkIn = parseISODate(d.checkIn);
  const checkOut = parseISODate(d.checkOut);
  if (!checkIn || !checkOut || checkOut <= checkIn) return { error: t.bookingAdmin.invalidDates };

  let guestId = d.guestId || null;
  if (!guestId && d.guestName) {
    const guest = await db.guest.create({
      data: {
        name: d.guestName,
        phone: d.guestPhone || null,
        email: d.guestEmail || null,
        nationality: d.guestNationality || null,
      },
    });
    guestId = guest.id;
  }

  const data = {
    propertyId: d.propertyId,
    kind: d.kind,
    source: d.source,
    status: d.status,
    checkIn,
    checkOut,
    adults: d.adults,
    children: d.children,
    guestId,
    accommodationTotal: d.accommodationTotal,
    cleaningFee: d.cleaningFee,
    platformCommission: d.platformCommission,
    notes: d.notes || null,
  };

  let id = d.id;
  try {
    if (id) {
      await updateBooking(id, data);
    } else {
      id = (await createBooking(data)).id;
      if (d.inquiryId) await db.inquiry.update({ where: { id: d.inquiryId }, data: { status: "CONVERTED" } });
    }
  } catch (e) {
    if (e instanceof BookingConflictError) {
      const c = e.conflicts[0];
      return { error: `${t.bookingAdmin.conflict}: ${c.code} (${dayMonthYear(c.checkIn, locale)} → ${dayMonthYear(c.checkOut, locale)})` };
    }
    throw e;
  }
  revalidatePath("/admin", "layout");
  redirect(`/admin/rezervimet/${id}`);
}

export async function setBookingStatus(id: string, fd: FormData) {
  await requireUser(["ADMIN", "MANAGER"]);
  const status = z.enum(["PENDING", "CONFIRMED", "CHECKED_IN", "CHECKED_OUT", "CANCELLED", "REJECTED"]).parse(fd.get("status"));
  try {
    await updateBooking(id, { status });
  } catch (e) {
    if (e instanceof BookingConflictError) redirect(`/admin/rezervimet/${id}?error=conflict`);
    throw e;
  }
  revalidatePath("/admin", "layout");
}

export async function addPayment(bookingId: string, fd: FormData) {
  await requireUser(["ADMIN", "MANAGER"]);
  const d = z
    .object({
      amount: z.coerce.number().positive(),
      method: z.enum(["CASH", "BANK", "CARD", "PLATFORM", "OTHER"]),
      paidAt: z.string(),
      note: z.string().max(500).optional(),
    })
    .parse(Object.fromEntries(fd));
  await db.payment.create({
    data: { bookingId, amount: d.amount, method: d.method, paidAt: parseISODate(d.paidAt) ?? new Date(), note: d.note || null },
  });
  revalidatePath(`/admin/rezervimet/${bookingId}`);
}

export async function deletePayment(id: string) {
  await requireUser(["ADMIN"]);
  const p = await db.payment.delete({ where: { id } });
  revalidatePath(`/admin/rezervimet/${p.bookingId}`);
}

export async function deleteBooking(id: string) {
  await requireUser(["ADMIN"]);
  await db.booking.delete({ where: { id } });
  revalidatePath("/admin", "layout");
  redirect("/admin/rezervimet");
}
