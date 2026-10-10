import { db } from "@/lib/db";
import { getT } from "@/lib/i18n";
import { toISODate, addDays, parseISODate } from "@/lib/dates";
import { num } from "@/lib/money";
import { formGuests, formProperties } from "@/lib/queries";
import { BookingForm, type BookingDefaults } from "@/components/BookingForm";
import { PageHeader } from "@/components/ui";
import { saveBooking } from "../actions";

export default async function NewBookingPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sp = await searchParams;
  const { t } = await getT();
  const [properties, guests] = await Promise.all([formProperties(), formGuests()]);

  const defaults: BookingDefaults = { propertyId: sp.propertyId, checkIn: sp.checkIn };
  const ci = parseISODate(sp.checkIn);
  if (ci) {
    const p = properties.find((x) => x.id === sp.propertyId);
    defaults.checkOut = toISODate(addDays(ci, p?.minNights ?? 2));
  }

  let subtitle: string | undefined;
  if (sp.inquiry) {
    const inq = await db.inquiry.findUnique({ where: { id: sp.inquiry } });
    if (inq) {
      const existing = await db.guest.findFirst({ where: { email: inq.email } });
      Object.assign(defaults, {
        propertyId: inq.propertyId,
        checkIn: toISODate(inq.checkIn),
        checkOut: toISODate(inq.checkOut),
        adults: inq.guests,
        source: "DIRECT",
        guestId: existing?.id,
        guestName: inq.name,
        guestEmail: inq.email,
        guestPhone: inq.phone ?? undefined,
        notes: inq.message ?? undefined,
        inquiryId: inq.id,
      });
      subtitle = `${t.bookingAdmin.fromInquiry} ${inq.name}${inq.quotedTotal ? ` · ${t.requests.quoted}: €${num(inq.quotedTotal)}` : ""}`;
    }
  }

  return (
    <>
      <PageHeader title={t.bookingAdmin.new} subtitle={subtitle} back="/admin/rezervimet" />
      <BookingForm
        action={saveBooking}
        properties={properties}
        guests={guests}
        defaults={defaults}
        t={{
          bookingAdmin: t.bookingAdmin,
          bookingKinds: t.bookingKinds,
          bookingSources: t.bookingSources,
          bookingStatuses: t.bookingStatuses,
          common: t.common,
          guestAdmin: t.guestAdmin,
        }}
      />
    </>
  );
}
