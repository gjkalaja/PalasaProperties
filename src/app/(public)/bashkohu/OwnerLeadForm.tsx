"use client";

import { useActionState } from "react";
import { submitOwnerLead } from "../actions";

export function OwnerLeadForm({
  labels,
  types,
}: {
  labels: Record<"name" | "phone" | "email" | "type" | "location" | "message" | "send" | "sent", string>;
  types: [string, string][];
}) {
  const [state, action, pending] = useActionState(submitOwnerLead, undefined);
  if (state?.ok)
    return (
      <div className="card p-10 grid place-items-center text-center">
        <div>
          <div className="text-4xl mb-4">✓</div>
          <p className="text-lg font-medium">{labels.sent}</p>
        </div>
      </div>
    );
  return (
    <form action={action} className="card p-6 md:p-8 space-y-4 self-start">
      <label className="block">
        <span className="label">{labels.name}</span>
        <input name="name" required className="input" autoComplete="name" />
      </label>
      <div className="grid sm:grid-cols-2 gap-4">
        <label className="block">
          <span className="label">{labels.phone}</span>
          <input name="phone" required className="input" autoComplete="tel" />
        </label>
        <label className="block">
          <span className="label">{labels.email}</span>
          <input name="email" type="email" className="input" autoComplete="email" />
        </label>
      </div>
      <div className="grid sm:grid-cols-2 gap-4">
        <label className="block">
          <span className="label">{labels.type}</span>
          <select name="propertyType" className="input">
            {types.map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="label">{labels.location}</span>
          <input name="location" className="input" />
        </label>
      </div>
      <label className="block">
        <span className="label">{labels.message}</span>
        <textarea name="message" className="input" rows={4} />
      </label>
      {state?.error && <p className="text-sm text-red-600">{state.error}</p>}
      <button className="btn-primary w-full h-12" disabled={pending}>
        {labels.send}
      </button>
    </form>
  );
}
