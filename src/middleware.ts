import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE, allowedRoles, homeFor, verifySession } from "@/lib/session";

export async function middleware(req: NextRequest) {
  const roles = allowedRoles(req.nextUrl.pathname);
  if (!roles) return NextResponse.next();

  const session = await verifySession(req.cookies.get(SESSION_COOKIE)?.value);
  if (!session) {
    if (req.nextUrl.pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }
    const url = new URL("/login", req.url);
    url.searchParams.set("next", req.nextUrl.pathname);
    return NextResponse.redirect(url);
  }
  if (!roles.includes(session.role)) {
    return NextResponse.redirect(new URL(homeFor(session.role), req.url));
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*", "/staf/:path*", "/pronari/:path*", "/api/finance/:path*"],
};
