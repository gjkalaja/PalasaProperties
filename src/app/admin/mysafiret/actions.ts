"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { parseISODate } from "@/lib/dates";

const optStr = z.preprocess((v) => (v === "" ? null : v), z.string().trim().max(500).nullable().optional());

export async function saveGuest(fd: FormData) {
  await requireUser(["ADMIN", "MANAGER"]);
  const d = z
    .object({
      id: z.string().optional(),
      name: z.string().trim().min(1).max(120),
      email: optStr,
      phone: optStr,
      nationality: optStr,
      documentType: optStr,
      documentNumber: optStr,
      birthDate: optStr,
      notes: z.string().max(5000).optional(),
    })
    .parse(Object.fromEntries(fd));
  const data = {
    name: d.name,
    email: d.email ?? null,
    phone: d.phone ?? null,
    nationality: d.nationality ?? null,
    documentType: d.documentType ?? null,
    documentNumber: d.documentNumber ?? null,
    birthDate: parseISODate(d.birthDate ?? null),
    notes: d.notes || null,
    vip: fd.get("vip") === "on",
    blacklisted: fd.get("blacklisted") === "on",
  };
  const guest = d.id ? await db.guest.update({ where: { id: d.id }, data }) : await db.guest.create({ data });
  revalidatePath("/admin/mysafiret");
  redirect(`/admin/mysafiret/${guest.id}`);
}
