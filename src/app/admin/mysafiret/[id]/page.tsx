import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { getT } from "@/lib/i18n";
import { toISODate, nightsBetween } from "@/lib/dates";
import { dayMonth, dayMonthYear } from "@/lib/format";
import { bookingTotal } from "@/lib/finance";
import { formatMoney } from "@/lib/money";
import { PageHeader, Section, StatusBadge, Field } from "@/components/ui";
import { SubmitButton } from "@/components/client";
import { WhatsAppButton } from "@/components/share";
import { saveGuest } from "../actions";

export const dynamic = "force-dynamic";

export default async function GuestPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { t, locale } = await getT();
  const isNew = id === "new";
  const g = isNew
    ? null
    : await db.guest.findUnique({
        where: { id },
        include: { bookings: { include: { property: { select: { name: true } } }, orderBy: { checkIn: "desc" } } },
      });
  if (!isNew && !g) notFound();
  const ga = t.guestAdmin;

  return (
    <>
      <PageHeader
        back="/admin/mysafiret"
        title={g?.name ?? ga.new}
        actions={g?.phone ? <WhatsAppButton label="WhatsApp" phone={g.phone} text={`Përshëndetje ${g.name.split(" ")[0]}! `} /> : null}
      />
      {g?.blacklisted && <p className="card border-red-200 bg-red-50 text-red-700 p-4 mb-6 text-sm">⛔ {ga.blacklistWarning}</p>}
      <div className="grid xl:grid-cols-[1fr_1fr] gap-6 items-start">
        <Section>
          <form action={saveGuest} className="grid sm:grid-cols-2 gap-4">
            {g && <input type="hidden" name="id" value={g.id} />}
            <Field label={t.common.name} className="sm:col-span-2">
              <input name="name" required defaultValue={g?.name} className="input" />
            </Field>
            <Field label={t.common.phone}>
              <input name="phone" defaultValue={g?.phone ?? ""} className="input" />
            </Field>
            <Field label={t.common.email}>
              <input name="email" type="email" defaultValue={g?.email ?? ""} className="input" />
            </Field>
            <Field label={ga.nationality}>
              <input name="nationality" defaultValue={g?.nationality ?? ""} className="input" />
            </Field>
            <Field label={ga.birthDate}>
              <input name="birthDate" type="date" defaultValue={g?.birthDate ? toISODate(g.birthDate) : ""} className="input" />
            </Field>
            <Field label={ga.documentType}>
              <input name="documentType" list="doctypes" defaultValue={g?.documentType ?? ""} className="input" />
              <datalist id="doctypes">
                <option value="Pasaportë" />
                <option value="ID" />
              </datalist>
            </Field>
            <Field label={ga.documentNumber}>
              <input name="documentNumber" defaultValue={g?.documentNumber ?? ""} className="input" />
            </Field>
            <Field label={t.common.notes} className="sm:col-span-2">
              <textarea name="notes" rows={3} defaultValue={g?.notes ?? ""} className="input" />
            </Field>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" name="vip" defaultChecked={g?.vip} className="size-4 accent-black" /> ⭐ {ga.vip}
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" name="blacklisted" defaultChecked={g?.blacklisted} className="size-4 accent-black" /> ⛔ {ga.blacklisted}
            </label>
            <div className="sm:col-span-2">
              <SubmitButton>{t.common.save}</SubmitButton>
            </div>
          </form>
        </Section>
        {g && (
          <Section title={`${ga.history} · ${g.bookings.length}`}>
            <ul className="divide-y divide-line">
              {g.bookings.map((b) => (
                <li key={b.id}>
                  <Link href={`/admin/rezervimet/${b.id}`} className="flex items-center justify-between gap-3 py-3 hover:bg-paper -mx-2 px-2 rounded-lg">
                    <div>
                      <div className="text-sm font-medium">{b.property.name}</div>
                      <div className="text-xs text-muted">
                        {dayMonth(b.checkIn, locale)} → {dayMonthYear(b.checkOut, locale)} · {nightsBetween(b.checkIn, b.checkOut)} {t.common.nights}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm">{formatMoney(bookingTotal(b))}</div>
                      <StatusBadge status={b.status} label={t.bookingStatuses[b.status]} />
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          </Section>
        )}
      </div>
    </>
  );
}
