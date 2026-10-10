"use client";

import { useActionState, useMemo, useState } from "react";
import { Wand2 } from "lucide-react";
import type { Dictionary } from "@/lib/dictionaries";
import { quoteStay } from "@/lib/pricing";
import { parseISODate } from "@/lib/dates";
import type { BookingFormState } from "@/app/admin/rezervimet/actions";

export interface FormProperty {
  id: string;
  name: string;
  basePrice: number;
  weekendPrice: number | null;
  cleaningFee: number;
  minNights: number;
  maxGuests: number;
  rates: { startDate: string; endDate: string; pricePerNight: number; weekendPrice: number | null; minNights: number | null }[];
}

export interface BookingDefaults {
  id?: string;
  propertyId?: string;
  kind?: string;
  source?: string;
  status?: string;
  checkIn?: string;
  checkOut?: string;
  adults?: number;
  children?: number;
  guestId?: string;
  guestName?: string;
  guestPhone?: string;
  guestEmail?: string;
  accommodationTotal?: number;
  cleaningFee?: number;
  platformCommission?: number;
  notes?: string;
  inquiryId?: string;
}

const COMMISSION: Record<string, number> = { BOOKING: 0.15, AIRBNB: 0.155 };

export function BookingForm({
  action,
  properties,
  guests,
  defaults,
  t,
}: {
  action: (prev: BookingFormState, fd: FormData) => Promise<BookingFormState>;
  properties: FormProperty[];
  guests: { id: string; name: string; phone: string | null; blacklisted: boolean }[];
  defaults: BookingDefaults;
  t: Pick<Dictionary, "bookingAdmin" | "bookingKinds" | "bookingSources" | "bookingStatuses" | "common" | "guestAdmin">;
}) {
  const [state, formAction, pending] = useActionState(action, undefined);
  const [propertyId, setPropertyId] = useState(defaults.propertyId ?? properties[0]?.id ?? "");
  const [checkIn, setCheckIn] = useState(defaults.checkIn ?? "");
  const [checkOut, setCheckOut] = useState(defaults.checkOut ?? "");
  const [source, setSource] = useState(defaults.source ?? "DIRECT");
  const [guestId, setGuestId] = useState(defaults.guestId ?? "");
  const [acc, setAcc] = useState(String(defaults.accommodationTotal ?? ""));
  const [clean, setClean] = useState(String(defaults.cleaningFee ?? ""));
  const [comm, setComm] = useState(String(defaults.platformCommission ?? "0"));

  const property = properties.find((p) => p.id === propertyId);
  const quote = useMemo(() => {
    const ci = parseISODate(checkIn);
    const co = parseISODate(checkOut);
    if (!property || !ci || !co || co <= ci) return null;
    return quoteStay(
      property,
      property.rates.map((r) => ({ ...r, startDate: parseISODate(r.startDate)!, endDate: parseISODate(r.endDate)! })),
      ci,
      co,
    );
  }, [property, checkIn, checkOut]);

  const applyQuote = () => {
    if (!quote) return;
    setAcc(String(quote.accommodation));
    setClean(String(quote.cleaningFee));
    setComm(String(Math.round(quote.accommodation * (COMMISSION[source] ?? 0) * 100) / 100));
  };
  const selectedGuest = guests.find((g) => g.id === guestId);
  const fmt = (v: number) => new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR" }).format(v);

  return (
    <form action={formAction} className="space-y-6">
      {defaults.id && <input type="hidden" name="id" value={defaults.id} />}
      {defaults.inquiryId && <input type="hidden" name="inquiryId" value={defaults.inquiryId} />}

      <section className="card p-5 grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <label className="sm:col-span-2">
          <span className="label">{t.common.property}</span>
          <select name="propertyId" className="input" value={propertyId} onChange={(e) => setPropertyId(e.target.value)}>
            {properties.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span className="label">{t.bookingAdmin.checkIn}</span>
          <input type="date" name="checkIn" required className="input" value={checkIn} onChange={(e) => setCheckIn(e.target.value)} />
        </label>
        <label>
          <span className="label">{t.bookingAdmin.checkOut}</span>
          <input type="date" name="checkOut" required className="input" min={checkIn} value={checkOut} onChange={(e) => setCheckOut(e.target.value)} />
        </label>
        <label>
          <span className="label">{t.bookingAdmin.kind}</span>
          <select name="kind" className="input" defaultValue={defaults.kind ?? "RESERVATION"}>
            {Object.entries(t.bookingKinds).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span className="label">{t.bookingAdmin.source}</span>
          <select name="source" className="input" value={source} onChange={(e) => setSource(e.target.value)}>
            {Object.entries(t.bookingSources).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span className="label">{t.common.status}</span>
          <select name="status" className="input" defaultValue={defaults.status ?? "CONFIRMED"}>
            {Object.entries(t.bookingStatuses).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </select>
        </label>
        <div className="grid grid-cols-2 gap-3">
          <label>
            <span className="label">{t.bookingAdmin.adults}</span>
            <input type="number" name="adults" min={0} max={property?.maxGuests ?? 50} className="input" defaultValue={defaults.adults ?? 2} />
          </label>
          <label>
            <span className="label">{t.bookingAdmin.children}</span>
            <input type="number" name="children" min={0} className="input" defaultValue={defaults.children ?? 0} />
          </label>
        </div>
      </section>

      <section className="card p-5 space-y-4">
        <h2 className="font-semibold">{t.bookingAdmin.guestSection}</h2>
        <label className="block">
          <span className="label">{t.bookingAdmin.existingGuest}</span>
          <select name="guestId" className="input" value={guestId} onChange={(e) => setGuestId(e.target.value)}>
            <option value="">–</option>
            {guests.map((g) => (
              <option key={g.id} value={g.id}>
                {g.blacklisted ? "⛔ " : ""}
                {g.name}
                {g.phone ? ` · ${g.phone}` : ""}
              </option>
            ))}
          </select>
        </label>
        {selectedGuest?.blacklisted && <p className="text-sm text-red-600">⛔ {t.guestAdmin.blacklistWarning}</p>}
        {!guestId && (
          <>
            <p className="text-xs text-muted">{t.bookingAdmin.newGuest}</p>
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <input name="guestName" placeholder={t.common.name} className="input" defaultValue={defaults.guestName} />
              <input name="guestPhone" placeholder={t.common.phone} className="input" defaultValue={defaults.guestPhone} />
              <input name="guestEmail" placeholder={t.common.email} className="input" defaultValue={defaults.guestEmail} />
              <input name="guestNationality" placeholder={t.guestAdmin.nationality} className="input" />
            </div>
          </>
        )}
      </section>

      <section className="card p-5 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-semibold">{t.bookingAdmin.money}</h2>
          {quote && (
            <div className="flex items-center gap-3 text-sm">
              <span className="text-muted">
                {t.bookingAdmin.suggested}: <b className="text-ink">{fmt(quote.total)}</b> · {quote.nights} {t.common.nights}
                {!quote.meetsMinNights && <span className="text-amber-600"> (min {quote.minNights})</span>}
              </span>
              <button type="button" className="btn-secondary btn-sm" onClick={applyQuote}>
                <Wand2 className="size-3.5" /> {t.bookingAdmin.useSuggested}
              </button>
            </div>
          )}
        </div>
        <div className="grid sm:grid-cols-3 gap-4">
          <label>
            <span className="label">{t.bookingAdmin.accommodationTotal}</span>
            <input type="number" step="0.01" min={0} name="accommodationTotal" className="input" value={acc} onChange={(e) => setAcc(e.target.value)} />
          </label>
          <label>
            <span className="label">{t.bookingAdmin.cleaningFee}</span>
            <input type="number" step="0.01" min={0} name="cleaningFee" className="input" value={clean} onChange={(e) => setClean(e.target.value)} />
          </label>
          <label>
            <span className="label">{t.bookingAdmin.platformCommission}</span>
            <input type="number" step="0.01" min={0} name="platformCommission" className="input" value={comm} onChange={(e) => setComm(e.target.value)} />
          </label>
        </div>
        <label className="block">
          <span className="label">{t.common.notes}</span>
          <textarea name="notes" className="input" rows={3} defaultValue={defaults.notes} />
        </label>
      </section>

      {state?.error && <p className="text-sm text-red-600 card border-red-200 bg-red-50 p-4">{state.error}</p>}
      <div className="flex gap-3">
        <button className="btn-primary" disabled={pending}>
          {t.common.save}
        </button>
      </div>
    </form>
  );
}
