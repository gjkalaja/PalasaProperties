import Link from "next/link";
import { notFound } from "next/navigation";
import { ExternalLink, RefreshCw, Star, Trash2, Upload } from "lucide-react";
import { db } from "@/lib/db";
import { getT } from "@/lib/i18n";
import { num, formatMoney } from "@/lib/money";
import { dayMonthYear, dateTime } from "@/lib/format";
import { appUrl } from "@/lib/text";
import { PageHeader, Section } from "@/components/ui";
import { PropertyForm } from "@/components/PropertyForm";
import { CopyField, SubmitButton } from "@/components/client";
import { addFeed, addRate, deleteFeed, deleteImage, deleteRate, makeCover, saveProperty, syncFeedNow, uploadImages } from "../actions";

export const dynamic = "force-dynamic";

export default async function EditProperty({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const { id } = await params;
  const sp = await searchParams;
  const { t, locale } = await getT();
  const p = await db.property.findUnique({
    where: { id },
    include: {
      images: { orderBy: { position: "asc" } },
      rates: { orderBy: { startDate: "asc" } },
      icalFeeds: { orderBy: { createdAt: "asc" }, include: { _count: { select: { bookings: true } } } },
    },
  });
  if (!p) notFound();
  const [owners, cleaners] = await Promise.all([
    db.user.findMany({ where: { role: "OWNER" }, select: { id: true, name: true }, orderBy: { name: "asc" } }),
    db.user.findMany({ where: { role: "CLEANER" }, select: { id: true, name: true }, orderBy: { name: "asc" } }),
  ]);
  const pa = t.propertyAdmin;
  const exportUrl = `${appUrl()}/api/ical/${p.icalToken}.ics`;

  return (
    <>
      <PageHeader
        back="/admin/prona"
        title={p.name}
        subtitle={`${t.propertyTypes[p.type]} · ${p.city}`}
        actions={
          <>
            <Link href={`/admin/kalendari`} className="btn-secondary">{t.nav.calendar}</Link>
            {p.published && (
              <Link href={`/prona/${p.slug}`} target="_blank" className="btn-secondary">
                <ExternalLink className="size-4" /> {pa.previewPublic}
              </Link>
            )}
          </>
        }
      />
      {sp.saved && <p className="card border-emerald-200 bg-emerald-50 text-emerald-800 p-3 mb-6 text-sm">✓ {t.common.saved}</p>}

      <div className="grid xl:grid-cols-2 gap-6 mb-6">
        <Section title={pa.photos} className="xl:col-span-2">
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3">
            {p.images.map((img, i) => (
              <div key={img.id} className="relative group aspect-[4/3] rounded-xl overflow-hidden bg-neutral-100">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={img.url} alt="" className="size-full object-cover" />
                {i === 0 && <span className="absolute top-2 left-2 badge bg-white">★ Cover</span>}
                <div className="absolute inset-x-0 bottom-0 p-2 flex gap-1 justify-end opacity-0 group-hover:opacity-100 transition bg-gradient-to-t from-black/50">
                  {i > 0 && (
                    <form action={makeCover.bind(null, img.id)}>
                      <SubmitButton className="btn-secondary btn-sm size-8 p-0">
                        <Star className="size-3.5" />
                      </SubmitButton>
                    </form>
                  )}
                  <form action={deleteImage.bind(null, img.id)}>
                    <SubmitButton className="btn-danger btn-sm size-8 p-0" confirm={`${t.common.delete}?`}>
                      <Trash2 className="size-3.5" />
                    </SubmitButton>
                  </form>
                </div>
              </div>
            ))}
            <form action={uploadImages.bind(null, p.id)} className="aspect-[4/3] rounded-xl border-2 border-dashed border-line grid place-items-center p-3 text-center">
              <label className="cursor-pointer text-sm text-muted flex flex-col items-center gap-2">
                <Upload className="size-5" />
                {pa.uploadPhotos}
                <input type="file" name="files" accept="image/*" multiple className="text-xs w-full max-w-36" required />
              </label>
              <SubmitButton className="btn-primary btn-sm">{t.common.add}</SubmitButton>
            </form>
          </div>
        </Section>

        <Section title={pa.seasonalRates}>
          {p.rates.length ? (
            <table className="table mb-4">
              <thead>
                <tr>
                  <th>{pa.rateName}</th>
                  <th>{t.common.from} – {t.common.to}</th>
                  <th className="text-right">€ / {t.common.night}</th>
                  <th className="text-right">{pa.rateMinNights}</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {p.rates.map((r) => (
                  <tr key={r.id}>
                    <td className="font-medium">{r.name}</td>
                    <td className="whitespace-nowrap text-muted">
                      {dayMonthYear(r.startDate, locale)} – {dayMonthYear(r.endDate, locale)}
                    </td>
                    <td className="text-right whitespace-nowrap">
                      {formatMoney(r.pricePerNight)}
                      {r.weekendPrice != null && <span className="text-muted"> / {formatMoney(r.weekendPrice)}</span>}
                    </td>
                    <td className="text-right">{r.minNights ?? "–"}</td>
                    <td className="w-10">
                      <form action={deleteRate.bind(null, r.id)}>
                        <SubmitButton className="btn-ghost size-8 p-0" confirm={`${t.common.delete}?`}>
                          <Trash2 className="size-3.5" />
                        </SubmitButton>
                      </form>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className="text-sm text-muted mb-4">{pa.noRates}</p>
          )}
          <form action={addRate.bind(null, p.id)} className="grid grid-cols-2 sm:grid-cols-3 gap-2 items-end">
            <input name="name" required placeholder={pa.rateName} className="input col-span-2 sm:col-span-3" />
            <input name="startDate" type="date" required className="input" aria-label={t.common.from} />
            <input name="endDate" type="date" required className="input" aria-label={t.common.to} />
            <input name="pricePerNight" type="number" step="0.01" min={0} required placeholder={`€ / ${t.common.night}`} className="input" />
            <input name="weekendPrice" type="number" step="0.01" min={0} placeholder={pa.weekendPrice} className="input" />
            <input name="minNights" type="number" min={1} placeholder={pa.rateMinNights} className="input" />
            <SubmitButton className="btn-secondary">+ {t.common.add}</SubmitButton>
          </form>
        </Section>

        <Section title={pa.icalTitle}>
          <div className="space-y-5">
            <div>
              <div className="label">{pa.icalExport}</div>
              <div className="space-y-2">
                <div className="text-xs text-muted">→ Booking.com</div>
                <CopyField value={`${exportUrl}?exclude=BOOKING`} copyLabel={t.common.copy} copiedLabel={t.common.copied} />
                <div className="text-xs text-muted">→ Airbnb</div>
                <CopyField value={`${exportUrl}?exclude=AIRBNB`} copyLabel={t.common.copy} copiedLabel={t.common.copied} />
              </div>
              <p className="text-xs text-muted mt-2">{pa.icalExportHelp}</p>
            </div>
            <div>
              <div className="label">{pa.icalImport}</div>
              <ul className="space-y-2 mb-3">
                {p.icalFeeds.map((f) => (
                  <li key={f.id} className="rounded-xl border border-line p-3 text-sm">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-medium">{t.channels[f.channel]}</span>
                      <div className="flex gap-1">
                        <form action={syncFeedNow.bind(null, f.id)}>
                          <SubmitButton className="btn-secondary btn-sm">
                            <RefreshCw className="size-3.5" /> {pa.syncNow}
                          </SubmitButton>
                        </form>
                        <form action={deleteFeed.bind(null, f.id)}>
                          <SubmitButton className="btn-ghost btn-sm size-8 p-0" confirm={`${t.common.delete}?`}>
                            <Trash2 className="size-3.5" />
                          </SubmitButton>
                        </form>
                      </div>
                    </div>
                    <div className="text-xs text-muted truncate mt-1">{f.url}</div>
                    <div className="text-xs mt-1">
                      {pa.lastSync}: {f.lastSyncAt ? dateTime(f.lastSyncAt, locale) : pa.never} · {f._count.bookings} {t.nav.bookings.toLowerCase()}
                      {f.lastError && <span className="text-red-600"> · ⚠ {f.lastError}</span>}
                    </div>
                  </li>
                ))}
                {!p.icalFeeds.length && <li className="text-sm text-muted">{pa.noFeeds}</li>}
              </ul>
              <form action={addFeed.bind(null, p.id)} className="flex flex-wrap sm:flex-nowrap gap-2">
                <select name="channel" className="input sm:w-40">
                  <option value="BOOKING">Booking.com</option>
                  <option value="AIRBNB">Airbnb</option>
                  <option value="OTHER">{t.channels.OTHER}</option>
                </select>
                <input name="url" type="url" required placeholder="https://…/calendar.ics" className="input" />
                <SubmitButton className="btn-secondary">+ {t.common.add}</SubmitButton>
              </form>
              <p className="text-xs text-muted mt-2">{pa.icalImportHelp}</p>
            </div>
          </div>
        </Section>
      </div>

      <PropertyForm
        action={saveProperty}
        owners={owners}
        cleaners={cleaners}
        t={{ propertyAdmin: t.propertyAdmin, propertyTypes: t.propertyTypes, amenities: t.amenities, common: t.common, public: t.public }}
        d={{
          id: p.id,
          name: p.name,
          slug: p.slug,
          type: p.type,
          city: p.city,
          address: p.address,
          lat: p.lat,
          lng: p.lng,
          summarySq: p.summarySq,
          summaryEn: p.summaryEn,
          descriptionSq: p.descriptionSq,
          descriptionEn: p.descriptionEn,
          maxGuests: p.maxGuests,
          bedrooms: p.bedrooms,
          beds: p.beds,
          bathrooms: p.bathrooms,
          areaM2: p.areaM2,
          distanceToSeaM: p.distanceToSeaM,
          minNights: p.minNights,
          checkInTime: p.checkInTime,
          checkOutTime: p.checkOutTime,
          wifiName: p.wifiName,
          wifiPassword: p.wifiPassword,
          doorCode: p.doorCode,
          internalNotes: p.internalNotes,
          ownerId: p.ownerId,
          cleanerId: p.cleanerId,
          amenities: p.amenities,
          published: p.published,
          active: p.active,
          basePrice: num(p.basePrice),
          weekendPrice: p.weekendPrice == null ? null : num(p.weekendPrice),
          cleaningFee: num(p.cleaningFee),
        }}
      />
    </>
  );
}
