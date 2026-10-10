// Edge-safe session helpers (used by middleware and server code).
import { SignJWT, jwtVerify } from "jose";
import type { Role } from "@prisma/client";

export const SESSION_COOKIE = "palasa_session";
const MAX_AGE = 60 * 60 * 24 * 30; // 30 days

export interface SessionData {
  sub: string;
  role: Role;
  name: string;
}

function secret() {
  const s = process.env.AUTH_SECRET;
  if (!s || s.length < 16) throw new Error("AUTH_SECRET must be set (min 16 chars)");
  return new TextEncoder().encode(s);
}

export async function signSession(data: SessionData): Promise<string> {
  return new SignJWT({ role: data.role, name: data.name })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(data.sub)
    .setIssuedAt()
    .setExpirationTime(`${MAX_AGE}s`)
    .sign(secret());
}

export async function verifySession(token: string | undefined): Promise<SessionData | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret());
    return { sub: payload.sub!, role: payload.role as Role, name: String(payload.name ?? "") };
  } catch {
    return null;
  }
}

export const sessionCookieOptions = {
  httpOnly: true,
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
  path: "/",
  maxAge: MAX_AGE,
};

/** Where each role lands after login. */
export function homeFor(role: Role): string {
  if (role === "CLEANER") return "/staf";
  if (role === "OWNER") return "/pronari";
  return "/admin";
}

/** Which roles can open which app sections. */
export const SECTION_ROLES: Record<string, Role[]> = {
  "/admin/financat": ["ADMIN"],
  "/admin/perdoruesit": ["ADMIN"],
  "/api/finance": ["ADMIN"],
  "/admin": ["ADMIN", "MANAGER"],
  "/staf": ["ADMIN", "MANAGER", "CLEANER"],
  "/pronari": ["OWNER", "ADMIN"],
};

export function allowedRoles(pathname: string): Role[] | null {
  const key = Object.keys(SECTION_ROLES)
    .filter((k) => pathname === k || pathname.startsWith(k + "/"))
    .sort((a, b) => b.length - a.length)[0];
  return key ? SECTION_ROLES[key] : null;
}
