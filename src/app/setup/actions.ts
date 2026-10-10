"use server";

import { redirect } from "next/navigation";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { db } from "@/lib/db";
import { seedDemo } from "@/lib/demo-seed";

/** One-time installation: only works while the database has no users. */
async function assertEmpty() {
  if ((await db.user.count()) > 0) redirect("/login");
}

export async function installDemo() {
  await assertEmpty();
  await seedDemo(db, () => {});
  redirect("/login?setup=demo");
}

export async function installAdmin(_prev: { error?: string } | undefined, fd: FormData) {
  await assertEmpty();
  const d = z
    .object({ name: z.string().trim().min(2), email: z.string().trim().toLowerCase().email(), password: z.string().min(8) })
    .safeParse(Object.fromEntries(fd));
  if (!d.success) return { error: "Plotësoni emrin, një email të saktë dhe fjalëkalim me të paktën 8 karaktere." };
  await db.user.create({
    data: { name: d.data.name, email: d.data.email, role: "ADMIN", passwordHash: await bcrypt.hash(d.data.password, 10) },
  });
  redirect("/login?setup=admin");
}
