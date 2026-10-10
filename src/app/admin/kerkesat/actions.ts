"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";

const status = z.enum(["NEW", "CONTACTED", "CONVERTED", "REJECTED"]);

export async function setInquiryStatus(id: string, fd: FormData) {
  await requireUser(["ADMIN", "MANAGER"]);
  await db.inquiry.update({ where: { id }, data: { status: status.parse(fd.get("status")) } });
  revalidatePath("/admin", "layout");
}

export async function setLeadStatus(id: string, fd: FormData) {
  await requireUser(["ADMIN", "MANAGER"]);
  await db.ownerLead.update({ where: { id }, data: { status: status.parse(fd.get("status")) } });
  revalidatePath("/admin", "layout");
}
