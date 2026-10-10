"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";

export async function saveTemplate(fd: FormData) {
  await requireUser(["ADMIN", "MANAGER"]);
  const d = z
    .object({
      id: z.string().optional(),
      name: z.string().trim().min(1).max(120),
      bodySq: z.string().max(5000),
      bodyEn: z.string().max(5000),
    })
    .parse(Object.fromEntries(fd));
  if (d.id) await db.messageTemplate.update({ where: { id: d.id }, data: { name: d.name, bodySq: d.bodySq, bodyEn: d.bodyEn } });
  else await db.messageTemplate.create({ data: { key: `custom-${Date.now()}`, name: d.name, bodySq: d.bodySq, bodyEn: d.bodyEn } });
  revalidatePath("/admin/mesazhet");
}

export async function deleteTemplate(id: string) {
  await requireUser(["ADMIN", "MANAGER"]);
  await db.messageTemplate.delete({ where: { id } });
  revalidatePath("/admin/mesazhet");
}
