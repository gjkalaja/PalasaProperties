"use server";

import { z } from "zod";
import type { PropertyType } from "@prisma/client";
import { db } from "@/lib/db";
import { getT, fmt } from "@/lib/i18n";
import { BLOCKING_STATUSES, findConflicts } from "@/lib/availability";
import { parseISODate, today } from "@/lib/dates";
import { quoteStay } from "@/lib/pricing";
import { PROPERTY_TYPES } from "@/lib/ui";

const inquirySchema = z.object({
  name: z.string().trim().min(2).max(120),
  email: z.string().trim().email().max(200),
  phone: z.string().trim().max(40).optional(),
  guests: z.coerce.number().int().min(1).max(50),
  message: z.string().trim().max(2000).optional(),
  checkIn: z.string(),
  checkOut: z.string(),
});

export async function submitInquiry(propertyId: string, _prev: unknown, fd: FormData) {
  const { t, locale } = await getT();
  const parsed = inquirySchema.safeParse(Object.fromEntries(fd));
  if (!parsed.success) return { error: t.public.fillRequired };
  const data = parsed.data;
  const checkIn = parseISODate(data.checkIn);
  const checkOut = parseISODate(data.checkOut);
  if (!checkIn || !checkOut || checkOut <= checkIn || checkIn < today()) return { error: t.public.datesUnavailable };

  const property = await db.property.findFirst({
    where: { id: propertyId, published: true, active: true },
    include: {
      rates: true,
      bookings: { where: { status: { in: BLOCKING_STATUSES }, checkIn: { lt: checkOut }, checkOut: { gt: checkIn } } },
    },
  });
  if (!property) return { error: t.public.notFound };
  if (data.guests > property.maxGuests) return { error: fmt(t.public.tooManyGuests, { n: property.maxGuests }) };
  if (findConflicts(property.bookings, checkIn, checkOut).length) return { error: t.public.datesUnavailable };
  const quote = quoteStay(property, property.rates, checkIn, checkOut);
  if (!quote.meetsMinNights) return { error: fmt(t.public.minNightsError, { n: quote.minNights }) };

  await db.inquiry.create({
    data: {
      propertyId,
      name: data.name,
      email: data.email,
      phone: data.phone || null,
      guests: data.guests,
      message: data.message || null,
      checkIn,
      checkOut,
      quotedTotal: quote.total,
      locale,
    },
  });
  return { ok: true };
}

const leadSchema = z.object({
  name: z.string().trim().min(2).max(120),
  phone: z.string().trim().min(6).max(40),
  email: z.string().trim().email().max(200).optional().or(z.literal("")),
  propertyType: z.string().optional(),
  location: z.string().trim().max(200).optional(),
  message: z.string().trim().max(2000).optional(),
});

export async function submitOwnerLead(_prev: unknown, fd: FormData) {
  const { t } = await getT();
  const parsed = leadSchema.safeParse(Object.fromEntries(fd));
  if (!parsed.success) return { error: t.public.fillRequired };
  const d = parsed.data;
  await db.ownerLead.create({
    data: {
      name: d.name,
      phone: d.phone,
      email: d.email || null,
      propertyType: PROPERTY_TYPES.includes(d.propertyType as PropertyType) ? (d.propertyType as PropertyType) : null,
      location: d.location || null,
      message: d.message || null,
    },
  });
  return { ok: true };
}
