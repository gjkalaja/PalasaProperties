"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { parseISODate } from "@/lib/dates";

export async function addExpense(fd: FormData) {
  await requireUser(["ADMIN"]);
  const d = z
    .object({
      propertyId: z.string().min(1),
      category: z.string().trim().min(1).max(60),
      amount: z.coerce.number().positive(),
      date: z.string(),
      description: z.string().max(500).optional(),
    })
    .parse(Object.fromEntries(fd));
  const date = parseISODate(d.date);
  if (!date) return;
  await db.expense.create({
    data: { ...d, date, description: d.description || null, chargeToOwner: fd.get("chargeToOwner") === "on" },
  });
  revalidatePath("/admin/financat");
}

export async function deleteExpense(id: string) {
  await requireUser(["ADMIN"]);
  await db.expense.delete({ where: { id } });
  revalidatePath("/admin/financat");
}
