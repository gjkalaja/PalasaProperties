"use client";

import { useActionState, useState } from "react";
import type { Dictionary } from "@/lib/dictionaries";
import { saveUser } from "./actions";

export interface UserRow {
  id?: string;
  name?: string;
  email?: string;
  phone?: string | null;
  role?: string;
  commissionRate?: number;
  active?: boolean;
}

export function UserForm({ u, t, self }: { u: UserRow; t: Pick<Dictionary, "users" | "roles" | "common">; self?: boolean }) {
  const [state, action, pending] = useActionState(saveUser, undefined);
  const [role, setRole] = useState(u.role ?? "CLEANER");
  return (
    <form action={action} className="grid sm:grid-cols-2 lg:grid-cols-[1.2fr_1.4fr_1fr_1fr_0.8fr_1fr_auto_auto] gap-2 items-end">
      {u.id && <input type="hidden" name="id" value={u.id} />}
      {self && <input type="hidden" name="role" value={role} />}
      <label>
        <span className="label">{t.common.name}</span>
        <input name="name" required defaultValue={u.name} className="input" />
      </label>
      <label>
        <span className="label">{t.common.email}</span>
        <input name="email" type="email" required defaultValue={u.email} className="input" />
      </label>
      <label>
        <span className="label">{t.common.phone}</span>
        <input name="phone" defaultValue={u.phone ?? ""} className="input" />
      </label>
      <label>
        <span className="label">{t.users.role}</span>
        <select name="role" value={role} onChange={(e) => setRole(e.target.value)} disabled={self} className="input">
          {Object.entries(t.roles).map(([k, v]) => (
            <option key={k} value={k}>
              {v}
            </option>
          ))}
        </select>
      </label>
      <label className={role === "OWNER" ? "" : "invisible"}>
        <span className="label">%</span>
        <input name="commissionRate" type="number" step="0.5" min={0} max={100} defaultValue={u.commissionRate ?? 20} className="input" title={t.users.commissionRate} />
      </label>
      <label>
        <span className="label">{u.id ? t.users.newPassword : t.common.password}</span>
        <input name="password" type="password" minLength={6} required={!u.id} placeholder={u.id ? "••••••" : ""} className="input" autoComplete="new-password" />
      </label>
      <label className="flex items-center gap-2 text-sm h-10">
        <input type="checkbox" name="active" defaultChecked={u.active ?? true} disabled={self} className="size-4 accent-black" />
        {t.users.active}
      </label>
      <button className={u.id ? "btn-secondary" : "btn-primary"} disabled={pending}>
        {state?.ok ? "✓" : u.id ? t.common.save : `+ ${t.common.add}`}
      </button>
      {state?.error && <p className="text-sm text-red-600 sm:col-span-full">{state.error}</p>}
    </form>
  );
}
