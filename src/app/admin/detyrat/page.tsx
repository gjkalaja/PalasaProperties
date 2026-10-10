import Link from "next/link";
import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { getT } from "@/lib/i18n";
import { addDays, toISODate, today } from "@/lib/dates";
import { dayMonth, localDay, weekdayShort } from "@/lib/format";
import { atLocalTime } from "@/lib/links";
import { nextBookingsForTasks } from "@/lib/queries";
import { PageHeader, Empty } from "@/components/ui";
import { AutoSubmitSelect, SubmitButton } from "@/components/client";
import { TaskCard } from "@/components/TaskCard";
import { createTask } from "@/app/staf/actions";

export const dynamic = "force-dynamic";

export default async function TasksPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sp = await searchParams;
  const { t, locale } = await getT();
  const d0 = today();
  const range = sp.range ?? "week";
  const showDone = sp.done === "1";
  const end = range === "today" ? addDays(d0, 1) : range === "week" ? addDays(d0, 7) : addDays(d0, 60);

  const where: Prisma.TaskWhereInput = {
    dueDate: { lt: atLocalTime(end, "00:00"), ...(showDone ? { gte: atLocalTime(addDays(d0, -7), "00:00") } : {}) },
    ...(showDone ? {} : { status: { not: "DONE" } }),
    ...(sp.assignee === "none" ? { assigneeId: null } : sp.assignee ? { assigneeId: sp.assignee } : {}),
  };
  const [tasks, staff, properties] = await Promise.all([
    db.task.findMany({ where, include: { property: true, assignee: true, booking: true }, orderBy: { dueDate: "asc" }, take: 300 }),
    db.user.findMany({ where: { role: { in: ["CLEANER", "MANAGER"] }, active: true }, select: { id: true, name: true }, orderBy: { name: "asc" } }),
    db.property.findMany({ where: { active: true }, select: { id: true, name: true }, orderBy: { name: "asc" } }),
  ]);
  const next = await nextBookingsForTasks(tasks);

  const groups = new Map<string, typeof tasks>();
  for (const task of tasks) {
    const day = localDay(task.dueDate);
    const key = day < d0 ? "overdue" : toISODate(day);
    groups.set(key, [...(groups.get(key) ?? []), task]);
  }
  const label = (key: string) => {
    if (key === "overdue") return t.taskAdmin.overdue;
    const d = new Date(`${key}T00:00:00Z`);
    if (key === toISODate(d0)) return `${t.common.today} · ${dayMonth(d, locale)}`;
    if (key === toISODate(addDays(d0, 1))) return `${t.common.tomorrow} · ${dayMonth(d, locale)}`;
    return `${weekdayShort(d, locale)} · ${dayMonth(d, locale)}`;
  };

  return (
    <>
      <PageHeader title={t.taskAdmin.title} subtitle={`${tasks.length}`} />

      <div className="grid xl:grid-cols-[1fr_340px] gap-6 items-start">
        <div className="min-w-0">
          <form className="flex flex-wrap gap-2 mb-6" action="/admin/detyrat">
            <AutoSubmitSelect name="range" defaultValue={range} className="input max-w-40">
              <option value="today">{t.common.today}</option>
              <option value="week">{t.taskAdmin.next7}</option>
              <option value="all">{t.taskAdmin.next60}</option>
            </AutoSubmitSelect>
            <AutoSubmitSelect name="assignee" defaultValue={sp.assignee ?? ""} className="input max-w-52">
              <option value="">{t.taskAdmin.assignee}: {t.common.all}</option>
              <option value="none">{t.taskAdmin.unassigned}</option>
              {staff.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </AutoSubmitSelect>
            <label className="chip cursor-pointer">
              <input type="checkbox" name="done" value="1" defaultChecked={showDone} className="accent-black" />
              {t.taskAdmin.showDone}
            </label>
            <button className="btn-secondary">{t.common.filter}</button>
          </form>

          {[...groups.entries()].map(([key, list]) => (
            <section key={key} className="mb-8">
              <h2 className={`eyebrow mb-3 ${key === "overdue" ? "text-red-600" : ""}`}>
                {label(key)} · {list.length}
              </h2>
              <div className="grid lg:grid-cols-2 gap-3">
                {list.map((task) => (
                  <TaskCard key={task.id} task={task} nextBooking={next.get(task.id)} t={t} locale={locale} staff={staff} mode="admin" />
                ))}
              </div>
            </section>
          ))}
          {!tasks.length && <Empty>{t.taskAdmin.noTasks}</Empty>}
        </div>

        <aside className="card p-5 xl:sticky xl:top-6">
          <h2 className="font-semibold mb-4">{t.taskAdmin.new}</h2>
          <form action={createTask} className="space-y-3">
            <select name="propertyId" required className="input">
              {properties.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
            <select name="type" className="input" defaultValue="MAINTENANCE">
              {Object.entries(t.taskTypes).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </select>
            <input name="title" required placeholder={t.taskAdmin.titleField} className="input" />
            <div className="grid grid-cols-2 gap-2">
              <input type="date" name="date" required defaultValue={toISODate(d0)} className="input" />
              <input type="time" name="time" required defaultValue="10:00" className="input" />
            </div>
            <select name="assigneeId" className="input">
              <option value="">{t.taskAdmin.unassigned}</option>
              {staff.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
            <textarea name="description" placeholder={t.taskAdmin.description} rows={2} className="input" />
            <textarea name="checklist" placeholder={`${t.taskAdmin.checklist} (${t.taskAdmin.checklistHelp})`} rows={3} className="input" />
            <SubmitButton className="btn-primary w-full">+ {t.common.add}</SubmitButton>
          </form>
          <p className="text-xs text-muted mt-4">
            {t.taskAdmin.autoCleaning}: <Link href="/admin/prona" className="underline">{t.propertyAdmin.cleaner}</Link>
          </p>
        </aside>
      </div>
    </>
  );
}
