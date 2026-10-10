import type { BookingKind, BookingSource, BookingStatus, TaskStatus, InquiryStatus } from "@prisma/client";

export function cn(...classes: (string | false | null | undefined)[]): string {
  return classes.filter(Boolean).join(" ");
}

/** Colour of a booking bar/dot, by channel (owner stays & maintenance have their own). */
export function bookingColor(source: BookingSource, kind: BookingKind = "RESERVATION"): string {
  if (kind === "OWNER_STAY") return "var(--color-owner)";
  if (kind === "MAINTENANCE") return "#a3a3a3";
  return {
    DIRECT: "var(--color-direct)",
    BOOKING: "var(--color-booking)",
    AIRBNB: "var(--color-airbnb)",
    PHONE: "var(--color-phone)",
    OWNER: "var(--color-owner)",
    OTHER: "var(--color-other)",
  }[source];
}

export const statusTone: Record<BookingStatus | TaskStatus | InquiryStatus, string> = {
  PENDING: "bg-amber-50 text-amber-700",
  CONFIRMED: "bg-emerald-50 text-emerald-700",
  CHECKED_IN: "bg-sky-50 text-sky-700",
  CHECKED_OUT: "bg-neutral-100 text-neutral-600",
  CANCELLED: "bg-red-50 text-red-600 line-through",
  REJECTED: "bg-red-50 text-red-600",
  TODO: "bg-amber-50 text-amber-700",
  IN_PROGRESS: "bg-sky-50 text-sky-700",
  DONE: "bg-emerald-50 text-emerald-700",
  NEW: "bg-amber-50 text-amber-700",
  CONTACTED: "bg-sky-50 text-sky-700",
  CONVERTED: "bg-emerald-50 text-emerald-700",
};

export const AMENITY_KEYS = [
  "wifi",
  "ac",
  "pool",
  "seaView",
  "beach",
  "parking",
  "kitchen",
  "washer",
  "terrace",
  "garden",
  "bbq",
  "jacuzzi",
  "tv",
  "heating",
  "workspace",
  "pets",
] as const;

export const PROPERTY_TYPES = ["STUDIO", "APT_1_1", "APT_2_1", "APT_3_1", "VILLA", "VILLA_POOL", "HOUSE"] as const;
