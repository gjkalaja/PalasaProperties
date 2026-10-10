import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import type { Role } from "@prisma/client";
import { db } from "./db";
import { SESSION_COOKIE, verifySession } from "./session";

export async function getSession() {
  const store = await cookies();
  return verifySession(store.get(SESSION_COOKIE)?.value);
}

/** Loads the signed-in, active user or redirects to login. Optionally restricts roles. */
export async function requireUser(roles?: Role[]) {
  const session = await getSession();
  if (!session) redirect("/login");
  const user = await db.user.findUnique({ where: { id: session.sub } });
  if (!user || !user.active) redirect("/login");
  if (roles && !roles.includes(user.role)) redirect("/login?error=forbidden");
  return user;
}
