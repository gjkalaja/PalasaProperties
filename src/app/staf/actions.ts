"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { parseISODate } from "@/lib/dates";
import { atLocalTime } from "@/lib/links";

type Item = { label: string; done: boolean };

/** Cleaners may only touch their own tasks. */
async function loadTask(id: string) {
  const user = await requireUser(["ADMIN", "MANAGER", "CLEANER"]);
  const task = await db.task.findUniqueOrThrow({ where: { id } });
  if (user.role === "CLEANER" && task.assigneeId !== user.id) throw new Error("forbidden");
  return task;
}

function refresh() {
  revalidatePath("/staf");
  revalidatePath("/admin", "layout");
}

export async function setTaskStatus(id: string, fd: FormData) {
  await loadTask(id);
  const status = z.enum(["TODO", "IN_PROGRESS", "DONE"]).parse(fd.get("status"));
  await db.task.update({ where: { id }, data: { status, completedAt: status === "DONE" ? new Date() : null } });
  refresh();
}

export async function toggleChecklistItem(id: string, index: number) {
  const task = await loadTask(id);
  const list = (Array.isArray(task.checklist) ? task.checklist : []) as Item[];
  if (!list[index]) return;
  list[index] = { ...list[index], done: !list[index].done };
  await db.task.update({
    where: { id },
    data: { checklist: list, status: task.status === "TODO" ? "IN_PROGRESS" : task.status },
  });
  refresh();
}

export async function reportIssue(id: string, fd: FormData) {
  const task = await loadTask(id);
  const text = String(fd.get("issue") ?? "").trim().slice(0, 2000);
  if (!text) return;
  const stamp = new Date().toISOString().slice(0, 16).replace("T", " ");
  await db.task.update({
    where: { id },
    data: { issueReport: [task.issueReport, `[${stamp}] ${text}`].filter(Boolean).join("\n") },
  });
  refresh();
}

export async function assignTask(id: string, fd: FormData) {
  await requireUser(["ADMIN", "MANAGER"]);
  const assigneeId = String(fd.get("assigneeId") ?? "") || null;
  await db.task.update({ where: { id }, data: { assigneeId } });
  refresh();
}

export async function createTask(fd: FormData) {
  await requireUser(["ADMIN", "MANAGER"]);
  const d = z
    .object({
      propertyId: z.string().min(1),
      type: z.enum(["CLEANING", "MAINTENANCE", "INSPECTION", "CHECKIN", "OTHER"]),
      title: z.string().trim().min(1).max(200),
      date: z.string(),
      time: z.string().regex(/^\d{2}:\d{2}$/),
      assigneeId: z.string().optional(),
      description: z.string().max(4000).optional(),
      checklist: z.string().max(4000).optional(),
    })
    .parse(Object.fromEntries(fd));
  const day = parseISODate(d.date);
  if (!day) return;
  await db.task.create({
    data: {
      propertyId: d.propertyId,
      type: d.type,
      title: d.title,
      dueDate: atLocalTime(day, d.time),
      assigneeId: d.assigneeId || null,
      description: d.description || null,
      checklist: (d.checklist ?? "")
        .split("\n")
        .map((l) => l.trim())
        .filter(Boolean)
        .map((label) => ({ label, done: false })),
    },
  });
  refresh();
}

export async function deleteTask(id: string) {
  await requireUser(["ADMIN", "MANAGER"]);
  await db.task.delete({ where: { id } });
  refresh();
}
