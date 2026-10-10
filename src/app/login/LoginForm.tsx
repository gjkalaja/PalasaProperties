"use client";

import { useActionState } from "react";
import { login } from "@/app/actions";

export function LoginForm({ next, labels }: { next: string; labels: Record<"email" | "password" | "submit" | "invalid", string> }) {
  const [state, action, pending] = useActionState(login, undefined);
  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="next" value={next} />
      <label className="block">
        <span className="label">{labels.email}</span>
        <input name="email" type="email" required autoComplete="email" className="input h-12" />
      </label>
      <label className="block">
        <span className="label">{labels.password}</span>
        <input name="password" type="password" required autoComplete="current-password" className="input h-12" />
      </label>
      {state?.error && <p className="text-sm text-red-600">{labels.invalid}</p>}
      <button className="btn-primary w-full h-12" disabled={pending}>
        {labels.submit}
      </button>
    </form>
  );
}
