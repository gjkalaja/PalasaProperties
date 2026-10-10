"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { parseISODate } from "@/lib/dates";
import { deleteUpload, saveUpload } from "@/lib/storage";
import { syncFeed } from "@/lib/ical-sync";
import { AMENITY_KEYS, PROPERTY_TYPES } from "@/lib/ui";

const optNum = z.preprocess((v) => (v === "" || v == null ? null : v), z.coerce.number().nullable());
const optStr = z.preprocess((v) => (v === "" ? null : v), z.string().trim().nullable().optional());

const schema = z.object({
  id: z.string().optional(),
  name: z.string().trim().min(2),
  slug: z
    .string()
    .trim()
    .toLowerCase()
    .regex(/^[a-z0-9-]*$/),
  type: z.enum(PROPERTY_TYPES),
  city: z.string().trim(),
  address: z.string().trim(),
  lat: optNum,
  lng: optNum,
  summarySq: z.string().trim(),
  summaryEn: z.string().trim(),
  descriptionSq: z.string(),
  descriptionEn: z.string(),
  maxGuests: z.coerce.number().int().min(1),
  bedrooms: z.coerce.number().int().min(0),
  beds: z.coerce.number().int().min(0),
  bathrooms: z.coerce.number().int().min(0),
  areaM2: optNum,
  distanceToSeaM: optNum,
  basePrice: z.coerce.number().min(0),
  weekendPrice: optNum,
  cleaningFee: z.coerce.number().min(0),
  minNights: z.coerce.number().int().min(1),
  checkInTime: z.string().regex(/^\d{2}:\d{2}$/),
  checkOutTime: z.string().regex(/^\d{2}:\d{2}$/),
  wifiName: optStr,
  wifiPassword: optStr,
  doorCode: optStr,
  internalNotes: optStr,
  ownerId: optStr,
  cleanerId: optStr,
});

function slugify(s: string) {
  return s
    .toLowerCase()
    .replace(/ë/g, "e")
    .replace(/ç/g, "c")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/\+/g, "-")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export async function saveProperty(_prev: { error?: string } | undefined, fd: FormData) {
  await requireUser(["ADMIN", "MANAGER"]);
  const parsed = schema.safeParse(Object.fromEntries(fd));
  if (!parsed.success) return { error: parsed.error.issues.map((i) => i.path.join(".")).join(", ") };
  const { id, ...d } = parsed.data;
  const slug = d.slug || slugify(d.name);
  const clash = await db.property.findFirst({ where: { slug, ...(id ? { id: { not: id } } : {}) } });
  if (clash) return { error: `slug "${slug}" ekziston` };
  const amenities = fd.getAll("amenities").map(String).filter((a) => (AMENITY_KEYS as readonly string[]).includes(a));
  const data = {
    ...d,
    slug,
    amenities,
    published: fd.get("published") === "on",
    active: fd.get("active") === "on",
    areaM2: d.areaM2 == null ? null : Math.round(d.areaM2),
    distanceToSeaM: d.distanceToSeaM == null ? null : Math.round(d.distanceToSeaM),
    ownerId: d.ownerId ?? null,
    cleanerId: d.cleanerId ?? null,
  };
  const property = id ? await db.property.update({ where: { id }, data }) : await db.property.create({ data });
  revalidatePath("/", "layout");
  redirect(`/admin/prona/${property.id}?saved=1`);
}

export async function uploadImages(propertyId: string, fd: FormData) {
  await requireUser(["ADMIN", "MANAGER"]);
  const files = fd.getAll("files").filter((f): f is File => f instanceof File && f.size > 0);
  const last = await db.propertyImage.findFirst({ where: { propertyId }, orderBy: { position: "desc" } });
  let pos = (last?.position ?? -1) + 1;
  for (const file of files) {
    const url = await saveUpload(file);
    if (url) await db.propertyImage.create({ data: { propertyId, url, position: pos++ } });
  }
  revalidatePath(`/admin/prona/${propertyId}`);
  revalidatePath("/", "layout");
}

export async function deleteImage(id: string) {
  await requireUser(["ADMIN", "MANAGER"]);
  const img = await db.propertyImage.delete({ where: { id } });
  await deleteUpload(img.url);
  revalidatePath(`/admin/prona/${img.propertyId}`);
}

export async function makeCover(id: string) {
  await requireUser(["ADMIN", "MANAGER"]);
  const img = await db.propertyImage.findUniqueOrThrow({ where: { id } });
  const all = await db.propertyImage.findMany({ where: { propertyId: img.propertyId }, orderBy: { position: "asc" } });
  const ordered = [img, ...all.filter((i) => i.id !== id)];
  await db.$transaction(ordered.map((i, position) => db.propertyImage.update({ where: { id: i.id }, data: { position } })));
  revalidatePath(`/admin/prona/${img.propertyId}`);
  revalidatePath("/", "layout");
}

export async function addRate(propertyId: string, fd: FormData) {
  await requireUser(["ADMIN", "MANAGER"]);
  const d = z
    .object({
      name: z.string().trim().min(1),
      startDate: z.string(),
      endDate: z.string(),
      pricePerNight: z.coerce.number().min(0),
      weekendPrice: optNum,
      minNights: optNum,
    })
    .parse(Object.fromEntries(fd));
  const startDate = parseISODate(d.startDate);
  const endDate = parseISODate(d.endDate);
  if (!startDate || !endDate || endDate < startDate) return;
  await db.seasonalRate.create({
    data: {
      propertyId,
      name: d.name,
      startDate,
      endDate,
      pricePerNight: d.pricePerNight,
      weekendPrice: d.weekendPrice,
      minNights: d.minNights == null ? null : Math.round(d.minNights),
    },
  });
  revalidatePath(`/admin/prona/${propertyId}`);
}

export async function deleteRate(id: string) {
  await requireUser(["ADMIN", "MANAGER"]);
  const r = await db.seasonalRate.delete({ where: { id } });
  revalidatePath(`/admin/prona/${r.propertyId}`);
}

export async function addFeed(propertyId: string, fd: FormData) {
  await requireUser(["ADMIN", "MANAGER"]);
  const d = z
    .object({ channel: z.enum(["BOOKING", "AIRBNB", "OTHER"]), url: z.string().trim().url() })
    .safeParse(Object.fromEntries(fd));
  if (!d.success) return;
  const feed = await db.icalFeed.create({ data: { propertyId, channel: d.data.channel, url: d.data.url } });
  await syncFeed(feed.id);
  revalidatePath(`/admin/prona/${propertyId}`);
}

export async function deleteFeed(id: string) {
  await requireUser(["ADMIN", "MANAGER"]);
  const f = await db.icalFeed.delete({ where: { id } });
  revalidatePath(`/admin/prona/${f.propertyId}`);
}

export async function syncFeedNow(id: string) {
  await requireUser(["ADMIN", "MANAGER"]);
  const f = await db.icalFeed.findUniqueOrThrow({ where: { id } });
  await syncFeed(id);
  revalidatePath(`/admin/prona/${f.propertyId}`);
}
