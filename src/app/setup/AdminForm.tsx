"use client";

import { useActionState } from "react";
import { installAdmin } from "./actions";

export function AdminForm() {
  const [state, action, pending] = useActionState(installAdmin, undefined);
  return (
    <form action={action} className="space-y-3">
      <input name="name" required placeholder="Emri" className="input" />
      <input name="email" type="email" required placeholder="Email" className="input" />
      <input name="password" type="password" required minLength={8} placeholder="Fjalëkalimi (min. 8)" className="input" />
      {state?.error && <p className="text-sm text-red-600">{state.error}</p>}
      <button className="btn-secondary w-full" disabled={pending}>
        Krijo administratorin
      </button>
    </form>
  );
}
