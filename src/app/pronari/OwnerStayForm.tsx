"use client";

import { useActionState } from "react";
import { requestOwnerStay } from "./actions";

export function OwnerStayForm({
  properties,
  minDate,
  labels,
}: {
  properties: { id: string; name: string }[];
  minDate: string;
  labels: Record<"property" | "from" | "to" | "reason" | "send" | "sent" | "help", string>;
}) {
  const [state, action, pending] = useActionState(requestOwnerStay, undefined);
  return (
    <form action={action} className="space-y-3">
      <p className="text-sm text-muted">{labels.help}</p>
      <select name="propertyId" className="input" aria-label={labels.property}>
        {properties.map((p) => (
          <option key={p.id} value={p.id}>
            {p.name}
          </option>
        ))}
      </select>
      <div className="grid grid-cols-2 gap-2">
        <label>
          <span className="label">{labels.from}</span>
          <input type="date" name="checkIn" min={minDate} required className="input" />
        </label>
        <label>
          <span className="label">{labels.to}</span>
          <input type="date" name="checkOut" min={minDate} required className="input" />
        </label>
      </div>
      <input name="notes" placeholder={labels.reason} className="input" />
      {state?.error && <p className="text-sm text-red-600">{state.error}</p>}
      {state?.ok && <p className="text-sm text-emerald-700">✓ {labels.sent}</p>}
      <button className="btn-primary w-full" disabled={pending}>
        {labels.send}
      </button>
    </form>
  );
}
