import { NextResponse, type NextRequest } from "next/server";
import { db } from "@/lib/db";
import { BLOCKING_STATUSES } from "@/lib/availability";
import { addDays, today } from "@/lib/dates";
import { buildIcal } from "@/lib/ical";

/**
 * Public availability feed for one property, pasted into Booking.com / Airbnb.
 * `?exclude=AIRBNB` leaves out bookings imported from that channel so they aren't echoed back.
 */
export async function GET(req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const property = await db.property.findUnique({ where: { icalToken: token.replace(/\.ics$/, "") } });
  if (!property) return new NextResponse("Not found", { status: 404 });

  const exclude = req.nextUrl.searchParams.get("exclude")?.toUpperCase();
  const bookings = await db.booking.findMany({
    where: {
      propertyId: property.id,
      status: { in: BLOCKING_STATUSES },
      checkOut: { gte: addDays(today(), -30) },
      ...(exclude === "AIRBNB" || exclude === "BOOKING"
        ? { NOT: { AND: [{ icalFeedId: { not: null } }, { source: exclude }] } }
        : {}),
    },
    orderBy: { checkIn: "asc" },
  });

  const body = buildIcal(property.name, [
    ...bookings.map((b) => ({
      uid: `${b.id}@palasa`,
      start: b.checkIn,
      end: b.checkOut,
      summary: b.kind === "RESERVATION" ? "Reserved" : "Not available",
    })),
  ]);
  return new NextResponse(body, {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": `inline; filename="${property.slug}.ics"`,
      "Cache-Control": "no-store",
    },
  });
}
