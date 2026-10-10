"use client";

import { useActionState } from "react";
import type { Dictionary } from "@/lib/dictionaries";
import { AMENITY_KEYS, PROPERTY_TYPES } from "@/lib/ui";

export interface PropertyDefaults {
  id?: string;
  name?: string;
  slug?: string;
  type?: string;
  city?: string;
  address?: string;
  lat?: number | null;
  lng?: number | null;
  summarySq?: string;
  summaryEn?: string;
  descriptionSq?: string;
  descriptionEn?: string;
  maxGuests?: number;
  bedrooms?: number;
  beds?: number;
  bathrooms?: number;
  areaM2?: number | null;
  distanceToSeaM?: number | null;
  basePrice?: number;
  weekendPrice?: number | null;
  cleaningFee?: number;
  minNights?: number;
  checkInTime?: string;
  checkOutTime?: string;
  wifiName?: string | null;
  wifiPassword?: string | null;
  doorCode?: string | null;
  internalNotes?: string | null;
  ownerId?: string | null;
  cleanerId?: string | null;
  amenities?: string[];
  published?: boolean;
  active?: boolean;
}

type Action = (prev: { error?: string } | undefined, fd: FormData) => Promise<{ error?: string } | undefined>;

export function PropertyForm({
  action,
  d,
  owners,
  cleaners,
  t,
}: {
  action: Action;
  d: PropertyDefaults;
  owners: { id: string; name: string }[];
  cleaners: { id: string; name: string }[];
  t: Pick<Dictionary, "propertyAdmin" | "propertyTypes" | "amenities" | "common" | "public">;
}) {
  const [state, formAction, pending] = useActionState(action, undefined);
  const p = t.propertyAdmin;
  const num = (name: keyof PropertyDefaults, label: string, opts: { step?: string; min?: number; required?: boolean } = {}) => (
    <label>
      <span className="label">{label}</span>
      <input
        type="number"
        name={name}
        step={opts.step ?? "1"}
        min={opts.min ?? 0}
        required={opts.required}
        className="input"
        defaultValue={(d[name] as number | null | undefined) ?? ""}
      />
    </label>
  );
  const text = (name: keyof PropertyDefaults, label: string, required = false) => (
    <label>
      <span className="label">{label}</span>
      <input name={name} required={required} className="input" defaultValue={(d[name] as string | null | undefined) ?? ""} />
    </label>
  );

  return (
    <form action={formAction} className="space-y-6">
      {d.id && <input type="hidden" name="id" value={d.id} />}

      <section className="card p-5 space-y-4">
        <h2 className="font-semibold">{p.basics}</h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {text("name", p.name, true)}
          {text("slug", p.slug)}
          <label>
            <span className="label">{p.type}</span>
            <select name="type" className="input" defaultValue={d.type ?? "APT_1_1"}>
              {PROPERTY_TYPES.map((ty) => (
                <option key={ty} value={ty}>
                  {t.propertyTypes[ty]}
                </option>
              ))}
            </select>
          </label>
          {text("city", p.city)}
          <div className="sm:col-span-2">{text("address", p.address)}</div>
          {num("lat", p.lat, { step: "any", min: -90 })}
          {num("lng", p.lng, { step: "any", min: -180 })}
          <label>
            <span className="label">{p.owner}</span>
            <select name="ownerId" className="input" defaultValue={d.ownerId ?? ""}>
              <option value="">–</option>
              {owners.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span className="label">{p.cleaner}</span>
            <select name="cleanerId" className="input" defaultValue={d.cleanerId ?? ""}>
              <option value="">–</option>
              {cleaners.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.name}
                </option>
              ))}
            </select>
          </label>
          <label className="flex items-center gap-2 text-sm mt-6">
            <input type="checkbox" name="published" defaultChecked={d.published ?? true} className="size-4 accent-black" /> {p.published}
          </label>
          <label className="flex items-center gap-2 text-sm mt-6">
            <input type="checkbox" name="active" defaultChecked={d.active ?? true} className="size-4 accent-black" /> {p.active}
          </label>
        </div>
      </section>

      <section className="card p-5 space-y-4">
        <h2 className="font-semibold">{p.capacity}</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
          {num("maxGuests", p.maxGuests, { min: 1, required: true })}
          {num("bedrooms", p.bedrooms, { required: true })}
          {num("beds", p.beds, { required: true })}
          {num("bathrooms", p.bathrooms, { required: true })}
          {num("areaM2", p.areaM2)}
          {num("distanceToSeaM", p.distanceToSeaM)}
        </div>
        <div>
          <span className="label">{t.public.amenities}</span>
          <div className="flex flex-wrap gap-2">
            {AMENITY_KEYS.map((a) => (
              <label key={a} className="chip cursor-pointer has-[:checked]:bg-ink has-[:checked]:text-white has-[:checked]:border-ink">
                <input type="checkbox" name="amenities" value={a} defaultChecked={d.amenities?.includes(a)} className="sr-only" />
                {t.amenities[a]}
              </label>
            ))}
          </div>
        </div>
      </section>

      <section className="card p-5 space-y-4">
        <h2 className="font-semibold">{p.pricing}</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
          {num("basePrice", p.basePrice, { step: "0.01", required: true })}
          {num("weekendPrice", p.weekendPrice, { step: "0.01" })}
          {num("cleaningFee", p.cleaningFee, { step: "0.01", required: true })}
          {num("minNights", p.minNights, { min: 1, required: true })}
          <label>
            <span className="label">{p.checkInTime}</span>
            <input type="time" name="checkInTime" className="input" defaultValue={d.checkInTime ?? "15:00"} />
          </label>
          <label>
            <span className="label">{p.checkOutTime}</span>
            <input type="time" name="checkOutTime" className="input" defaultValue={d.checkOutTime ?? "11:00"} />
          </label>
        </div>
      </section>

      <section className="card p-5 space-y-4">
        <h2 className="font-semibold">{p.descriptions}</h2>
        <div className="grid md:grid-cols-2 gap-4">
          {text("summarySq", p.summarySq)}
          {text("summaryEn", p.summaryEn)}
          <label>
            <span className="label">{p.descriptionSq}</span>
            <textarea name="descriptionSq" rows={7} className="input" defaultValue={d.descriptionSq} />
          </label>
          <label>
            <span className="label">{p.descriptionEn}</span>
            <textarea name="descriptionEn" rows={7} className="input" defaultValue={d.descriptionEn} />
          </label>
        </div>
      </section>

      <section className="card p-5 space-y-4">
        <h2 className="font-semibold">{p.access}</h2>
        <div className="grid sm:grid-cols-3 gap-4">
          {text("wifiName", p.wifiName)}
          {text("wifiPassword", p.wifiPassword)}
          {text("doorCode", p.doorCode)}
        </div>
        <label className="block">
          <span className="label">{p.internalNotes}</span>
          <textarea name="internalNotes" rows={3} className="input" defaultValue={d.internalNotes ?? ""} />
        </label>
      </section>

      {state?.error && <p className="card border-red-200 bg-red-50 text-red-700 p-4 text-sm">{state.error}</p>}
      <button className="btn-primary" disabled={pending}>
        {t.common.save}
      </button>
    </form>
  );
}
