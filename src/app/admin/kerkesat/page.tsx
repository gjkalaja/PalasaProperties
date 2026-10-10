import Link from "next/link";
import { Mail, Phone } from "lucide-react";
import { db } from "@/lib/db";
import { getT } from "@/lib/i18n";
import { nightsBetween } from "@/lib/dates";
import { dayMonth, dayMonthYear, dateTime } from "@/lib/format";
import { formatMoney } from "@/lib/money";
import { PageHeader, Section, StatusBadge, Empty } from "@/components/ui";
import { SubmitButton } from "@/components/client";
import { WhatsAppButton } from "@/components/share";
import { setBookingStatus } from "../rezervimet/actions";
import { setInquiryStatus, setLeadStatus } from "./actions";

export const dynamic = "force-dynamic";

export default async function RequestsPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sp = await searchParams;
  const { t, locale } = await getT();
  const showAll = sp.all === "1";
  const open = { in: ["NEW", "CONTACTED"] as ("NEW" | "CONTACTED")[] };
  const [inquiries, ownerStays, leads] = await Promise.all([
    db.inquiry.findMany({ where: showAll ? {} : { status: open }, include: { property: true }, orderBy: { createdAt: "desc" }, take: 100 }),
    db.booking.findMany({
      where: { kind: "OWNER_STAY", ...(showAll ? {} : { status: "PENDING" }) },
      include: { property: true, requestedBy: true },
      orderBy: { createdAt: "desc" },
      take: 100,
    }),
    db.ownerLead.findMany({ where: showAll ? {} : { status: open }, orderBy: { createdAt: "desc" }, take: 100 }),
  ]);

  return (
    <>
      <PageHeader
        title={t.requests.title}
        actions={
          <Link href={showAll ? "/admin/kerkesat" : "/admin/kerkesat?all=1"} className="btn-secondary">
            {showAll ? t.requests.openOnly : t.common.all}
          </Link>
        }
      />
      <div className="space-y-6">
        <Section title={`${t.requests.inquiries} · ${inquiries.length}`}>
          <div className="grid lg:grid-cols-2 gap-3">
            {inquiries.map((q) => (
              <article key={q.id} className="rounded-2xl border border-line p-4">
                <div className="flex justify-between gap-3">
                  <div>
                    <div className="font-medium">{q.name}</div>
                    <div className="text-xs text-muted">{dateTime(q.createdAt, locale)} · {q.locale.toUpperCase()}</div>
                  </div>
                  <StatusBadge status={q.status} label={t.inquiryStatuses[q.status]} />
                </div>
                <div className="mt-3 text-sm">
                  <b>{q.property.name}</b> · {dayMonth(q.checkIn, locale)} → {dayMonthYear(q.checkOut, locale)} ·{" "}
                  {nightsBetween(q.checkIn, q.checkOut)} {t.common.nights} · {q.guests} {t.common.guests.toLowerCase()}
                </div>
                {q.quotedTotal && (
                  <div className="text-sm text-muted">
                    {t.requests.quoted}: <span className="text-ink font-medium">{formatMoney(q.quotedTotal)}</span>
                  </div>
                )}
                {q.message && <p className="text-sm mt-2 bg-paper rounded-xl p-3 whitespace-pre-line">{q.message}</p>}
                <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted mt-3">
                  <a href={`mailto:${q.email}`} className="flex items-center gap-1 hover:text-ink"><Mail className="size-3" /> {q.email}</a>
                  {q.phone && <a href={`tel:${q.phone}`} className="flex items-center gap-1 hover:text-ink"><Phone className="size-3" /> {q.phone}</a>}
                </div>
                <div className="flex flex-wrap gap-2 mt-4">
                  {q.status !== "CONVERTED" && (
                    <Link href={`/admin/rezervimet/new?inquiry=${q.id}`} className="btn-primary btn-sm">
                      {t.requests.convert}
                    </Link>
                  )}
                  {q.phone && (
                    <WhatsAppButton
                      className="btn-sm"
                      label="WhatsApp"
                      phone={q.phone}
                      text={
                        q.locale === "en"
                          ? `Hello ${q.name.split(" ")[0]}! Thank you for your request for ${q.property.name} (${dayMonth(q.checkIn, "en")} → ${dayMonthYear(q.checkOut, "en")}). `
                          : `Përshëndetje ${q.name.split(" ")[0]}! Faleminderit për kërkesën për ${q.property.name} (${dayMonth(q.checkIn, "sq")} → ${dayMonthYear(q.checkOut, "sq")}). `
                      }
                    />
                  )}
                  {q.status === "NEW" && (
                    <form action={setInquiryStatus.bind(null, q.id)}>
                      <SubmitButton name="status" value="CONTACTED" className="btn-secondary btn-sm">{t.requests.markContacted}</SubmitButton>
                    </form>
                  )}
                  {q.status !== "REJECTED" && q.status !== "CONVERTED" && (
                    <form action={setInquiryStatus.bind(null, q.id)}>
                      <SubmitButton name="status" value="REJECTED" className="btn-ghost btn-sm text-red-600">{t.common.reject}</SubmitButton>
                    </form>
                  )}
                </div>
              </article>
            ))}
          </div>
          {!inquiries.length && <Empty>{t.requests.noneNew}</Empty>}
        </Section>

        <Section title={`${t.requests.ownerStays} · ${ownerStays.length}`}>
          <div className="divide-y divide-line">
            {ownerStays.map((b) => (
              <div key={b.id} className="py-3 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <div className="font-medium">
                    {b.requestedBy?.name ?? "–"} · <span className="font-normal">{b.property.name}</span>
                  </div>
                  <div className="text-sm text-muted">
                    {dayMonth(b.checkIn, locale)} → {dayMonthYear(b.checkOut, locale)} · {nightsBetween(b.checkIn, b.checkOut)} {t.common.nights}
                    {b.notes && <> · “{b.notes}”</>}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <StatusBadge status={b.status} label={t.bookingStatuses[b.status]} />
                  {b.status === "PENDING" && (
                    <>
                      <form action={setBookingStatus.bind(null, b.id)}>
                        <SubmitButton name="status" value="CONFIRMED" className="btn-primary btn-sm">{t.common.approve}</SubmitButton>
                      </form>
                      <form action={setBookingStatus.bind(null, b.id)}>
                        <SubmitButton name="status" value="REJECTED" className="btn-danger btn-sm">{t.common.reject}</SubmitButton>
                      </form>
                    </>
                  )}
                  <Link href={`/admin/rezervimet/${b.id}`} className="btn-ghost btn-sm">{t.common.view}</Link>
                </div>
              </div>
            ))}
          </div>
          {!ownerStays.length && <Empty>{t.requests.noneNew}</Empty>}
        </Section>

        <Section title={`${t.requests.ownerLeads} · ${leads.length}`}>
          <div className="grid lg:grid-cols-2 gap-3">
            {leads.map((l) => (
              <article key={l.id} className="rounded-2xl border border-line p-4">
                <div className="flex justify-between gap-3">
                  <div>
                    <div className="font-medium">{l.name}</div>
                    <div className="text-xs text-muted">{dateTime(l.createdAt, locale)}</div>
                  </div>
                  <StatusBadge status={l.status} label={t.inquiryStatuses[l.status]} />
                </div>
                <div className="text-sm mt-2">
                  {l.propertyType && t.propertyTypes[l.propertyType]}
                  {l.location && ` · ${l.location}`}
                </div>
                {l.message && <p className="text-sm mt-2 bg-paper rounded-xl p-3">{l.message}</p>}
                <div className="flex flex-wrap gap-2 mt-4">
                  <a href={`tel:${l.phone}`} className="btn-secondary btn-sm"><Phone className="size-3.5" /> {l.phone}</a>
                  <WhatsAppButton className="btn-sm" label="WhatsApp" phone={l.phone} text={`Përshëndetje ${l.name.split(" ")[0]}! Ju shkruajmë nga Palasa Properties lidhur me pronën tuaj.`} />
                  {l.status === "NEW" && (
                    <form action={setLeadStatus.bind(null, l.id)}>
                      <SubmitButton name="status" value="CONTACTED" className="btn-secondary btn-sm">{t.requests.markContacted}</SubmitButton>
                    </form>
                  )}
                  {l.status !== "CONVERTED" && (
                    <form action={setLeadStatus.bind(null, l.id)}>
                      <SubmitButton name="status" value="CONVERTED" className="btn-primary btn-sm">✓ {t.inquiryStatuses.CONVERTED}</SubmitButton>
                    </form>
                  )}
                  {l.status !== "REJECTED" && l.status !== "CONVERTED" && (
                    <form action={setLeadStatus.bind(null, l.id)}>
                      <SubmitButton name="status" value="REJECTED" className="btn-ghost btn-sm text-red-600">{t.common.reject}</SubmitButton>
                    </form>
                  )}
                </div>
              </article>
            ))}
          </div>
          {!leads.length && <Empty>{t.requests.noneNew}</Empty>}
        </Section>
      </div>
    </>
  );
}
