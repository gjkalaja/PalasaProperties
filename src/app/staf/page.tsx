import Link from "next/link";
import { LogOut } from "lucide-react";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { getT } from "@/lib/i18n";
import { addDays, today } from "@/lib/dates";
import { atLocalTime } from "@/lib/links";
import { localDay } from "@/lib/format";
import { nextBookingsForTasks } from "@/lib/queries";
import { logout } from "@/app/actions";
import { LanguageSwitch } from "@/components/LanguageSwitch";
import { TaskCard } from "@/components/TaskCard";
import { Empty } from "@/components/ui";

export const dynamic = "force-dynamic";
export const metadata = { title: "Detyrat" };

export default async function StaffPage() {
  const user = await requireUser(["ADMIN", "MANAGER", "CLEANER"]);
  const { t, locale } = await getT();
  const d0 = today();
  const tasks = await db.task.findMany({
    where: {
      ...(user.role === "CLEANER" ? { assigneeId: user.id } : {}),
      OR: [
        { status: { not: "DONE" }, dueDate: { lt: atLocalTime(addDays(d0, 8), "00:00") } },
        { status: "DONE", completedAt: { gte: atLocalTime(d0, "00:00") } },
      ],
    },
    include: { property: true, assignee: true, booking: true },
    orderBy: { dueDate: "asc" },
  });
  const next = await nextBookingsForTasks(tasks);
  const todayList = tasks.filter((x) => localDay(x.dueDate) <= d0);
  const later = tasks.filter((x) => localDay(x.dueDate) > d0);

  return (
    <div className="min-h-dvh bg-paper">
      <header className="sticky top-0 z-20 bg-white/90 backdrop-blur border-b border-line">
        <div className="max-w-2xl mx-auto px-4 h-14 flex items-center justify-between">
          <div>
            <div className="font-semibold leading-tight">{t.staff.title}</div>
            <div className="text-xs text-muted">{user.name}</div>
          </div>
          <div className="flex items-center gap-2">
            {user.role !== "CLEANER" && (
              <Link href="/admin" className="btn-ghost btn-sm">
                {t.nav.dashboard}
              </Link>
            )}
            <LanguageSwitch locale={locale} />
            <form action={logout}>
              <button className="btn-ghost size-8 p-0" aria-label={t.common.logout}>
                <LogOut className="size-4" />
              </button>
            </form>
          </div>
        </div>
      </header>
      <main className="max-w-2xl mx-auto px-4 py-6 space-y-8">
        <section>
          <h2 className="eyebrow mb-3">
            {t.staff.today} · {todayList.filter((x) => x.status !== "DONE").length}
          </h2>
          <div className="space-y-3">
            {todayList.map((task) => (
              <TaskCard key={task.id} task={task} nextBooking={next.get(task.id)} t={t} locale={locale} mode="staff" />
            ))}
            {!todayList.length && <Empty>{t.taskAdmin.noTasks}</Empty>}
          </div>
        </section>
        {later.length > 0 && (
          <section>
            <h2 className="eyebrow mb-3">
              {t.staff.upcoming} · {later.length}
            </h2>
            <div className="space-y-3">
              {later.map((task) => (
                <TaskCard key={task.id} task={task} nextBooking={next.get(task.id)} t={t} locale={locale} mode="staff" />
              ))}
            </div>
          </section>
        )}
      </main>
    </div>
  );
}
