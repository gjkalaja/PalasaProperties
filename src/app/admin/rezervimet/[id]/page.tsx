import Link from "next/link";
import { notFound } from "next/navigation";
import { Mail, Phone, Star, Ban, Trash2 } from "lucide-react";
import { db } from "@/lib/db";
import { getT } from "@/lib/i18n";
import { requireUser } from "@/lib/auth";
import { nightsBetween, toISODate, today } from "@/lib/dates";
import { dayMonthYear, dateTime, weekdayShort } from "@/lib/format";
import { bookingTotal } from "@/lib/finance";
import { formatMoney, num } from "@/lib/money";
import { atLocalTime } from "@/lib/links";
import { bookingVars, renderTemplate, taskMessage } from "@/lib/messages";
import { appUrl } from "@/lib/text";
import { formGuests, formProperties } from "@/lib/queries";
import { bookingColor } from "@/lib/ui";
import { Dot, PageHeader, Section, StatusBadge } from "@/components/ui";
import { BookingForm } from "@/components/BookingForm";
import { GoogleCalendarButton, WhatsAppButton } from "@/components/share";
import { SubmitButton } from "@/components/client";
import { addPayment, deleteBooking, deletePayment, saveBooking, setBookingStatus } from "../actions";

export const dynamic = "force-dynamic";

export default async function BookingDetail({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const { id } = await params;
  const sp = await searchParams;
  const user = await requireUser(["ADMIN", "MANAGER"]);
  const { t, locale } = await getT();
  const b = await db.booking.findUnique({
    where: { id },
    include: {
      property: true,
      guest: true,
      payments: { orderBy: { paidAt: "asc" } },
      tasks: { include: { assignee: true }, orderBy: { dueDate: "asc" } },
      icalFeed: true,
      requestedBy: true,
    },
  });
  if (!b) notFound();
  const [templates, properties, guests] = await Promise.all([
    db.messageTemplate.findMany({ orderBy: { name: "asc" } }),
    formProperties(),
    formGuests(),
  ]);

  const nights = nightsBetween(b.checkIn, b.checkOut);
  const total = bookingTotal(b);
  const paid = b.payments.reduce((s, p) => s + num(p.amount), 0);
  const balance = Math.round((total - paid) * 100) / 100;
  const guestLocale = b.guest?.nationality && b.guest.nationality !== "AL" && b.guest.nationality !== "XK" ? "en" : "sq";
  const vars = bookingVars(b, b.property, b.guest, guestLocale);
  const statusActions: { status: string; label: string; show: boolean; className?: string }[] = [
    { status: "CONFIRMED", label: b.kind === "OWNER_STAY" ? t.common.approve : t.common.confirm, show: b.status === "PENDING" },
    { status: "REJECTED", label: t.common.reject, show: b.status === "PENDING", className: "btn-danger" },
    { status: "CHECKED_IN", label: t.bookingAdmin.markCheckedIn, show: b.status === "CONFIRMED" && b.checkIn <= today() },
    { status: "CHECKED_OUT", label: t.bookingAdmin.markCheckedOut, show: b.status === "CHECKED_IN" },
    { status: "CANCELLED", label: t.bookingAdmin.cancelBooking, show: ["PENDING", "CONFIRMED"].includes(b.status), className: "btn-danger" },
  ];
  const gcalDetails = [
    b.guest ? `${b.guest.name}${b.guest.phone ? ` · ${b.guest.phone}` : ""}` : t.bookingKinds[b.kind],
    `${b.adults + b.children} ${t.common.guests.toLowerCase()} · ${t.bookingSources[b.source]}`,
    `${appUrl()}/admin/rezervimet/${b.id}`,
  ].join("\n");

  return (
    <>
      <PageHeader
        back="/admin/rezervimet"
        title={
          <span className="flex flex-wrap items-center gap-3">
            {b.guest?.name ?? t.bookingKinds[b.kind]}
            <StatusBadge status={b.status} label={t.bookingStatuses[b.status]} />
          </span>
        }
        subtitle={
          <span className="flex flex-wrap items-center gap-2">
            <span className="font-mono">{b.code}</span>·<Link href={`/admin/prona/${b.property.id}`} className="underline underline-offset-4">{b.property.name}</Link>·
            <span className="flex items-center gap-1.5">
              <Dot color={bookingColor(b.source, b.kind)} /> {t.bookingSources[b.source]}
            </span>
            {b.icalFeed && <span className="badge bg-neutral-100">{t.bookingAdmin.imported} {t.channels[b.icalFeed.channel]} (iCal)</span>}
          </span>
        }
        actions={statusActions
          .filter((a) => a.show)
          .map((a) => (
            <form key={a.status} action={setBookingStatus.bind(null, b.id)}>
              <SubmitButton name="status" value={a.status} className={a.className ?? "btn-primary"}>
                {a.label}
              </SubmitButton>
            </form>
          ))}
      />
      {sp.error === "conflict" && <p className="card border-red-200 bg-red-50 text-red-700 p-4 mb-6 text-sm">{t.bookingAdmin.conflict}</p>}
      {b.guest?.blacklisted && <p className="card border-red-200 bg-red-50 text-red-700 p-4 mb-6 text-sm">⛔ {t.guestAdmin.blacklistWarning}</p>}

      <div className="grid xl:grid-cols-[1fr_380px] gap-6">
        <div className="space-y-6 min-w-0">
          <div className="grid sm:grid-cols-3 gap-3">
            <div className="card p-5">
              <div className="eyebrow">{t.bookingAdmin.checkIn}</div>
              <div className="text-xl font-semibold mt-2">{dayMonthYear(b.checkIn, locale)}</div>
              <div className="text-sm text-muted">{weekdayShort(b.checkIn, locale)} · {b.property.checkInTime}</div>
            </div>
            <div className="card p-5">
              <div className="eyebrow">{t.bookingAdmin.checkOut}</div>
              <div className="text-xl font-semibold mt-2">{dayMonthYear(b.checkOut, locale)}</div>
              <div className="text-sm text-muted">{weekdayShort(b.checkOut, locale)} · {b.property.checkOutTime}</div>
            </div>
            <div className="card p-5">
              <div className="eyebrow">{t.common.nights}</div>
              <div className="text-xl font-semibold mt-2">{nights}</div>
              <div className="text-sm text-muted">
                {b.adults} {t.bookingAdmin.adults.toLowerCase()}
                {b.children ? ` · ${b.children} ${t.bookingAdmin.children.toLowerCase()}` : ""}
              </div>
            </div>
          </div>

          <Section
            title={t.bookingAdmin.payments}
            actions={
              <div className="text-sm">
                {t.bookingAdmin.paid} <b>{formatMoney(paid)}</b> / {formatMoney(total)} ·{" "}
                <span className={balance > 0 ? "text-amber-700 font-semibold" : "text-emerald-700"}>
                  {t.bookingAdmin.balance} {formatMoney(Math.max(0, balance))}
                </span>
              </div>
            }
          >
            <div className="grid sm:grid-cols-4 gap-3 text-sm mb-5">
              <div><div className="text-muted text-xs">{t.bookingAdmin.accommodationTotal}</div>{formatMoney(b.accommodationTotal)}</div>
              <div><div className="text-muted text-xs">{t.bookingAdmin.cleaningFee}</div>{formatMoney(b.cleaningFee)}</div>
              <div><div className="text-muted text-xs">{t.bookingAdmin.platformCommission}</div>{formatMoney(b.platformCommission)}</div>
              <div><div className="text-muted text-xs">{t.common.total}</div><b>{formatMoney(total)}</b></div>
            </div>
            {b.payments.length > 0 && (
              <table className="table mb-4 border border-line rounded-xl">
                <tbody>
                  {b.payments.map((p) => (
                    <tr key={p.id}>
                      <td>{dayMonthYear(p.paidAt, locale)}</td>
                      <td>{t.paymentMethods[p.method]}</td>
                      <td className="text-muted">{p.note}</td>
                      <td className="text-right font-medium">{formatMoney(p.amount)}</td>
                      <td className="w-10">
                        {user.role === "ADMIN" && (
                          <form action={deletePayment.bind(null, p.id)}>
                            <SubmitButton className="btn-ghost size-8 p-0" confirm={`${t.common.delete}?`}>
                              <Trash2 className="size-3.5" />
                            </SubmitButton>
                          </form>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
            <form action={addPayment.bind(null, b.id)} className="grid grid-cols-2 sm:grid-cols-[1fr_1fr_1fr_1.5fr_auto] gap-2 items-end">
              <label>
                <span className="label">{t.bookingAdmin.amount}</span>
                <input name="amount" type="number" step="0.01" min="0.01" required className="input" defaultValue={balance > 0 ? balance : undefined} />
              </label>
              <label>
                <span className="label">{t.bookingAdmin.method}</span>
                <select name="method" className="input" defaultValue={b.source === "BOOKING" || b.source === "AIRBNB" ? "PLATFORM" : "CASH"}>
                  {Object.entries(t.paymentMethods).map(([k, v]) => (
                    <option key={k} value={k}>{v}</option>
                  ))}
                </select>
              </label>
              <label>
                <span className="label">{t.common.date}</span>
                <input name="paidAt" type="date" className="input" defaultValue={toISODate(today())} />
              </label>
              <label>
                <span className="label">{t.common.notes}</span>
                <input name="note" className="input" />
              </label>
              <SubmitButton className="btn-secondary">{t.bookingAdmin.addPayment}</SubmitButton>
            </form>
          </Section>

          {templates.length > 0 && b.kind === "RESERVATION" && (
            <Section title={t.bookingAdmin.messages}>
              <div className="grid md:grid-cols-2 gap-3">
                {templates.map((tpl) => {
                  const text = renderTemplate(guestLocale === "en" ? tpl.bodyEn : tpl.bodySq, vars);
                  return (
                    <div key={tpl.id} className="rounded-xl border border-line p-4 flex flex-col">
                      <div className="font-medium text-sm mb-2">{tpl.name}</div>
                      <p className="text-xs text-muted whitespace-pre-line line-clamp-5 flex-1">{text}</p>
                      <div className="flex flex-wrap gap-2 mt-3">
                        <WhatsAppButton text={text} phone={b.guest?.phone} label="WhatsApp" className="btn-sm" />
                        {b.guest?.email && (
                          <a
                            className="btn-secondary btn-sm"
                            href={`mailto:${b.guest.email}?subject=${encodeURIComponent(`${b.property.name} · ${b.code}`)}&body=${encodeURIComponent(text)}`}
                          >
                            <Mail className="size-3.5" /> Email
                          </a>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </Section>
          )}

          <details className="card group">
            <summary className="cursor-pointer list-none p-5 font-semibold flex justify-between items-center">
              {t.common.edit}
              <span className="text-muted group-open:rotate-180 transition">⌄</span>
            </summary>
            <div className="px-5 pb-5">
              <BookingForm
                action={saveBooking}
                properties={properties}
                guests={guests}
                t={{
                  bookingAdmin: t.bookingAdmin,
                  bookingKinds: t.bookingKinds,
                  bookingSources: t.bookingSources,
                  bookingStatuses: t.bookingStatuses,
                  common: t.common,
                  guestAdmin: t.guestAdmin,
                }}
                defaults={{
                  id: b.id,
                  propertyId: b.propertyId,
                  kind: b.kind,
                  source: b.source,
                  status: b.status,
                  checkIn: toISODate(b.checkIn),
                  checkOut: toISODate(b.checkOut),
                  adults: b.adults,
                  children: b.children,
                  guestId: b.guestId ?? undefined,
                  accommodationTotal: num(b.accommodationTotal),
                  cleaningFee: num(b.cleaningFee),
                  platformCommission: num(b.platformCommission),
                  notes: b.notes ?? undefined,
                }}
              />
              {user.role === "ADMIN" && (
                <form action={deleteBooking.bind(null, b.id)} className="mt-6 pt-6 border-t border-line">
                  <SubmitButton className="btn-danger" confirm={`${t.common.delete} ${b.code}?`}>
                    <Trash2 className="size-4" /> {t.common.delete}
                  </SubmitButton>
                </form>
              )}
            </div>
          </details>
        </div>

        <aside className="space-y-6">
          {b.guest && (
            <Section title={t.common.guest}>
              <Link href={`/admin/mysafiret/${b.guest.id}`} className="font-medium hover:underline underline-offset-4 flex items-center gap-2">
                {b.guest.name}
                {b.guest.vip && <Star className="size-4 fill-amber-400 text-amber-400" />}
                {b.guest.blacklisted && <Ban className="size-4 text-red-500" />}
              </Link>
              <div className="text-sm text-muted space-y-1 mt-2">
                {b.guest.phone && (
                  <a href={`tel:${b.guest.phone}`} className="flex items-center gap-2 hover:text-ink"><Phone className="size-3.5" /> {b.guest.phone}</a>
                )}
                {b.guest.email && (
                  <a href={`mailto:${b.guest.email}`} className="flex items-center gap-2 hover:text-ink"><Mail className="size-3.5" /> {b.guest.email}</a>
                )}
                {b.guest.documentNumber && <div>{b.guest.documentType}: {b.guest.documentNumber}</div>}
                {b.guest.nationality && <div>{t.guestAdmin.nationality}: {b.guest.nationality}</div>}
              </div>
            </Section>
          )}
          {b.requestedBy && (
            <Section title={t.requests.requestedBy}>
              <div className="font-medium">{b.requestedBy.name}</div>
              <div className="text-sm text-muted">{b.requestedBy.phone}</div>
            </Section>
          )}

          <Section title={t.bookingAdmin.share}>
            <div className="flex flex-col gap-2">
              <GoogleCalendarButton
                label={t.common.addToGoogle}
                title={`${b.property.name}: ${b.guest?.name ?? t.bookingKinds[b.kind]}`}
                start={atLocalTime(b.checkIn, b.property.checkInTime)}
                end={atLocalTime(b.checkOut, b.property.checkOutTime)}
                allDay={false}
                details={gcalDetails}
                location={[b.property.address, b.property.city].filter(Boolean).join(", ")}
              />
              <WhatsAppButton
                label={`${t.common.sendWhatsApp} (${t.roles.MANAGER.toLowerCase()})`}
                text={`📌 ${b.property.name}\n${b.guest?.name ?? t.bookingKinds[b.kind]} · ${b.adults + b.children} ${t.common.guests.toLowerCase()}\n📅 ${dayMonthYear(b.checkIn, locale)} ${b.property.checkInTime} → ${dayMonthYear(b.checkOut, locale)} ${b.property.checkOutTime}\n${b.guest?.phone ? `📞 ${b.guest.phone}\n` : ""}${b.notes ? `📝 ${b.notes}\n` : ""}${appUrl()}/admin/rezervimet/${b.id}`}
              />
            </div>
          </Section>

          <Section title={t.bookingAdmin.tasks}>
            <ul className="space-y-3">
              {b.tasks.map((task) => (
                <li key={task.id} className="rounded-xl border border-line p-3">
                  <div className="flex justify-between gap-2 items-start">
                    <div>
                      <div className="text-sm font-medium">{t.taskTypes[task.type]}</div>
                      <div className="text-xs text-muted">
                        {dateTime(task.dueDate, locale)} · {task.assignee?.name ?? t.taskAdmin.unassigned}
                      </div>
                    </div>
                    <StatusBadge status={task.status} label={t.taskStatuses[task.status]} />
                  </div>
                  <WhatsAppButton
                    className="btn-sm mt-2"
                    label={t.common.sendWhatsApp}
                    phone={task.assignee?.phone}
                    text={taskMessage(task, b.property, locale, appUrl(), null, task.assignee)}
                  />
                </li>
              ))}
              {!b.tasks.length && <li className="text-sm text-muted">–</li>}
            </ul>
          </Section>
          {b.notes && (
            <Section title={t.common.notes}>
              <p className="text-sm whitespace-pre-line">{b.notes}</p>
            </Section>
          )}
        </aside>
      </div>
    </>
  );
}
