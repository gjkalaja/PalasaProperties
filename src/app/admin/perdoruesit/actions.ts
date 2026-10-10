"use server";

import { revalidatePath } from "next/cache";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { getT } from "@/lib/i18n";

export async function saveUser(_prev: { error?: string; ok?: boolean } | undefined, fd: FormData) {
  const me = await requireUser(["ADMIN"]);
  const { t } = await getT();
  const parsed = z
    .object({
      id: z.string().optional(),
      name: z.string().trim().min(1).max(120),
      email: z.string().trim().toLowerCase().email(),
      phone: z.string().trim().max(40).optional(),
      role: z.enum(["ADMIN", "MANAGER", "CLEANER", "OWNER"]),
      commissionRate: z.coerce.number().min(0).max(100).default(20),
      password: z.string().max(200).optional(),
    })
    .safeParse(Object.fromEntries(fd));
  if (!parsed.success) return { error: parsed.error.issues.map((i) => i.path.join(".")).join(", ") };
  const d = parsed.data;
  const clash = await db.user.findFirst({ where: { email: d.email, ...(d.id ? { id: { not: d.id } } : {}) } });
  if (clash) return { error: t.users.emailTaken };
  if (!d.id && (!d.password || d.password.length < 6)) return { error: `${t.common.password} (min 6)` };
  if (d.password && d.password.length < 6) return { error: `${t.common.password} (min 6)` };
  const active = d.id === me.id ? true : fd.get("active") === "on";
  const data = {
    name: d.name,
    email: d.email,
    phone: d.phone || null,
    role: d.id === me.id ? me.role : d.role,
    commissionRate: d.commissionRate,
    active,
    ...(d.password ? { passwordHash: await bcrypt.hash(d.password, 10) } : {}),
  };
  if (d.id) await db.user.update({ where: { id: d.id }, data });
  else await db.user.create({ data: { ...data, passwordHash: data.passwordHash! } });
  revalidatePath("/admin/perdoruesit");
  return { ok: true };
}
