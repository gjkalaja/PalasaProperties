import Link from "next/link";
import type { Booking, Guest, Property, Task, User } from "@prisma/client";
import { Check, KeyRound, MapPin, Navigation, Users, AlertTriangle } from "lucide-react";
import type { Dictionary, Locale } from "@/lib/dictionaries";
import { dateTime, dayMonth, localDay } from "@/lib/format";
import { today } from "@/lib/dates";

import { taskMessage } from "@/lib/messages";
import { appUrl } from "@/lib/text";
import { cn } from "@/lib/ui";
import { StatusBadge } from "@/components/ui";
import { GoogleCalendarButton, WhatsAppButton } from "@/components/share";
import { SubmitButton } from "@/components/client";
import { assignTask, deleteTask, reportIssue, setTaskStatus, toggleChecklistItem } from "@/app/staf/actions";

export type TaskWithRelations = Task & {
  property: Property;
  assignee: User | null;
  booking: Booking | null;
};

/** Task card used by both the admin task board and the staff (mobile) view. */
export function TaskCard({
  task,
  nextBooking,
  t,
  locale,
  staff,
  mode,
}: {
  task: TaskWithRelations;
  nextBooking?: (Booking & { guest: Guest | null }) | null;
  t: Dictionary;
  locale: Locale;
  staff?: { id: string; name: string }[];
  mode: "admin" | "staff";
}) {
  const checklist = (Array.isArray(task.checklist) ? task.checklist : []) as { label: string; done: boolean }[];
  const doneCount = checklist.filter((c) => c.done).length;
  const overdue = task.status !== "DONE" && localDay(task.dueDate) < today();
  const p = task.property;
  const sameDayArrival = nextBooking && localDay(task.dueDate).getTime() === nextBooking.checkIn.getTime();
  const mapsUrl =
    p.lat != null && p.lng != null
      ? `https://www.google.com/maps/dir/?api=1&destination=${p.lat},${p.lng}`
      : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${p.name} ${p.address} ${p.city}`)}`;

  return (
    <article className={cn("card p-4 md:p-5", task.status === "DONE" && "opacity-60", overdue && "border-red-200")}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className="badge bg-neutral-100">{t.taskTypes[task.type]}</span>
            <span className={cn("font-medium", overdue ? "text-red-600" : "text-muted")}>
              {overdue && `${t.taskAdmin.overdue} · `}
              {dateTime(task.dueDate, locale)}
            </span>
          </div>
          <h3 className="font-semibold mt-2 leading-tight">{p.name}</h3>
          {task.title !== t.taskTypes[task.type] && task.title !== "Pastrim pas largimit" && (
            <div className="text-sm">{task.title}</div>
          )}
          <div className="text-xs text-muted flex items-center gap-1 mt-0.5">
            <MapPin className="size-3" /> {[p.address, p.city].filter(Boolean).join(", ")}
          </div>
        </div>
        <StatusBadge status={task.status} label={t.taskStatuses[task.status]} />
      </div>

      {task.description && <p className="text-sm mt-3 whitespace-pre-line">{task.description}</p>}

      <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs mt-3">
        {p.doorCode && (
          <span className="flex items-center gap-1">
            <KeyRound className="size-3.5" /> {t.propertyAdmin.doorCode}: <b className="font-mono">{p.doorCode}</b>
          </span>
        )}
        {nextBooking && (
          <span className={cn("flex items-center gap-1", sameDayArrival && "text-violet-700 font-medium")}>
            <Users className="size-3.5" /> {t.taskAdmin.nextGuests}: {dayMonth(nextBooking.checkIn, locale)} ·{" "}
            {nextBooking.adults + nextBooking.children}
            {sameDayArrival && ` · ${t.taskAdmin.sameDay}`}
          </span>
        )}
      </div>

      {checklist.length > 0 && (
        <div className="mt-4">
          <div className="flex items-center justify-between text-xs text-muted mb-2">
            <span>{t.taskAdmin.checklist}</span>
            <span>
              {doneCount}/{checklist.length}
            </span>
          </div>
          <div className="h-1 rounded-full bg-neutral-100 mb-2 overflow-hidden">
            <div className="h-full bg-emerald-500 transition-all" style={{ width: `${(doneCount / checklist.length) * 100}%` }} />
          </div>
          <ul className={cn("grid gap-1", mode === "admin" && "sm:grid-cols-2")}>
            {checklist.map((c, i) => (
              <li key={i}>
                <form action={toggleChecklistItem.bind(null, task.id, i)}>
                  <button className="w-full flex items-center gap-2.5 text-left text-sm py-1.5 rounded-lg hover:bg-paper px-1">
                    <span
                      className={cn(
                        "size-5 rounded-md border grid place-items-center shrink-0 transition",
                        c.done ? "bg-emerald-500 border-emerald-500 text-white" : "border-neutral-300",
                      )}
                    >
                      {c.done && <Check className="size-3.5" />}
                    </span>
                    <span className={cn(c.done && "line-through text-muted")}>{c.label}</span>
                  </button>
                </form>
              </li>
            ))}
          </ul>
        </div>
      )}

      {task.issueReport && (
        <div className="mt-3 rounded-xl bg-red-50 text-red-800 text-xs p-3 whitespace-pre-line flex gap-2">
          <AlertTriangle className="size-4 shrink-0" />
          {task.issueReport}
        </div>
      )}

      <div className="flex flex-wrap gap-2 mt-4">
        {task.status === "TODO" && (
          <form action={setTaskStatus.bind(null, task.id)}>
            <SubmitButton name="status" value="IN_PROGRESS" className="btn-secondary btn-sm">
              {t.taskAdmin.start}
            </SubmitButton>
          </form>
        )}
        {task.status !== "DONE" ? (
          <form action={setTaskStatus.bind(null, task.id)}>
            <SubmitButton name="status" value="DONE" className="btn-primary btn-sm">
              <Check className="size-3.5" /> {t.taskAdmin.complete}
            </SubmitButton>
          </form>
        ) : (
          <form action={setTaskStatus.bind(null, task.id)}>
            <SubmitButton name="status" value="TODO" className="btn-secondary btn-sm">
              {t.taskAdmin.reopen}
            </SubmitButton>
          </form>
        )}
        {mode === "staff" && (
          <a href={mapsUrl} target="_blank" rel="noopener noreferrer" className="btn-secondary btn-sm">
            <Navigation className="size-3.5" /> {t.staff.navigate}
          </a>
        )}
        {mode === "admin" && (
          <>
            <WhatsAppButton
              className="btn-sm"
              label={t.common.sendWhatsApp}
              phone={task.assignee?.phone}
              text={taskMessage(task, p, locale, appUrl(), nextBooking, task.assignee)}
            />
            <GoogleCalendarButton
              className="btn-sm"
              label="Google Calendar"
              title={`${t.taskTypes[task.type]}: ${p.name}`}
              start={task.dueDate}
              end={new Date(task.dueDate.getTime() + 3 * 3_600_000)}
              allDay={false}
              location={[p.address, p.city].filter(Boolean).join(", ")}
              details={`${task.title}\n${task.description ?? ""}\n${appUrl()}/staf`}
            />
            {task.booking && (
              <Link href={`/admin/rezervimet/${task.booking.id}`} className="btn-ghost btn-sm">
                {task.booking.code}
              </Link>
            )}
          </>
        )}
      </div>

      {mode === "admin" && staff && (
        <div className="flex flex-wrap items-center gap-2 mt-3 pt-3 border-t border-line">
          <form action={assignTask.bind(null, task.id)} className="flex gap-2 items-center flex-1">
            <span className="text-xs text-muted">{t.taskAdmin.assignee}</span>
            <select name="assigneeId" defaultValue={task.assigneeId ?? ""} className="input h-8 text-xs max-w-48">
              <option value="">{t.taskAdmin.unassigned}</option>
              {staff.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
            <SubmitButton className="btn-secondary btn-sm">{t.common.save}</SubmitButton>
          </form>
          <form action={deleteTask.bind(null, task.id)}>
            <SubmitButton className="btn-ghost btn-sm text-red-600" confirm={`${t.common.delete}?`}>
              {t.common.delete}
            </SubmitButton>
          </form>
        </div>
      )}

      {mode === "staff" && task.status !== "DONE" && (
        <details className="mt-3">
          <summary className="text-xs text-muted cursor-pointer">{t.taskAdmin.issueReport}</summary>
          <form action={reportIssue.bind(null, task.id)} className="mt-2 space-y-2">
            <textarea name="issue" required rows={3} className="input" />
            <SubmitButton className="btn-danger btn-sm">{t.common.send}</SubmitButton>
          </form>
        </details>
      )}
    </article>
  );
}

