"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { LOCALE_COOKIE } from "@/lib/i18n";
import { SESSION_COOKIE, homeFor, sessionCookieOptions, signSession, allowedRoles } from "@/lib/session";

export async function setLocale(formData: FormData) {
  const locale = formData.get("locale") === "en" ? "en" : "sq";
  (await cookies()).set(LOCALE_COOKIE, locale, { path: "/", maxAge: 60 * 60 * 24 * 365 });
}

export async function login(_prev: { error?: string } | undefined, formData: FormData) {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  const next = String(formData.get("next") ?? "");
  const user = await db.user.findUnique({ where: { email } });
  if (!user || !user.active || !(await bcrypt.compare(password, user.passwordHash))) {
    return { error: "invalid" };
  }
  const token = await signSession({ sub: user.id, role: user.role, name: user.name });
  (await cookies()).set(SESSION_COOKIE, token, sessionCookieOptions);
  const nextAllowed = next.startsWith("/") && !next.startsWith("//") && allowedRoles(next)?.includes(user.role);
  redirect(nextAllowed ? next : homeFor(user.role));
}

export async function logout() {
  (await cookies()).delete(SESSION_COOKIE);
  redirect("/login");
}
