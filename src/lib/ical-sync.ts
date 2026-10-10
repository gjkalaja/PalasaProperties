import "server-only";
import type { BookingSource, Channel } from "@prisma/client";
import { db } from "./db";
import { parseIcal } from "./ical";
import { generateCode, syncCleaningTask } from "./bookings";
import { today } from "./dates";

const SOURCE: Record<Channel, BookingSource> = { BOOKING: "BOOKING", AIRBNB: "AIRBNB", OTHER: "OTHER" };

/** Airbnb exports owner-blocked days as "Airbnb (Not available)" — those are not stays and need no cleaning. */
function isPlainBlock(summary: string): boolean {
  return /not available/i.test(summary) && !/closed/i.test(summary);
}

export async function syncFeed(feedId: string) {
  const feed = await db.icalFeed.findUniqueOrThrow({ where: { id: feedId }, include: { property: true } });
  try {
    const res = await fetch(feed.url, {
      headers: { "User-Agent": "PalasaProperties/1.0 (+calendar sync)" },
      cache: "no-store",
      signal: AbortSignal.timeout(20_000),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const text = await res.text();
    if (!text.includes("BEGIN:VCALENDAR")) throw new Error("Not an iCal feed");
    const events = parseIcal(text);
    const seen = new Set<string>();
    let created = 0;

    for (const ev of events) {
      seen.add(ev.uid);
      const existing = await db.booking.findUnique({
        where: { icalFeedId_externalUid: { icalFeedId: feed.id, externalUid: ev.uid } },
      });
      if (existing) {
        const moved =
          existing.checkIn.getTime() !== ev.start.getTime() || existing.checkOut.getTime() !== ev.end.getTime();
        if (moved || existing.status === "CANCELLED") {
          await db.$transaction(async (tx) => {
            const b = await tx.booking.update({
              where: { id: existing.id },
              data: {
                checkIn: ev.start,
                checkOut: ev.end,
                status: existing.status === "CANCELLED" ? "CONFIRMED" : existing.status,
              },
            });
            await syncCleaningTask(tx, b, feed.property);
          });
        }
        continue;
      }
      const plainBlock = isPlainBlock(ev.summary);
      if (plainBlock) {
        // Usually the channel echoing back dates we exported ourselves — skip if we already hold them.
        const covered = await db.booking.findFirst({
          where: {
            propertyId: feed.propertyId,
            OR: [{ icalFeedId: null }, { icalFeedId: { not: feed.id } }],
            status: { in: ["PENDING", "CONFIRMED", "CHECKED_IN", "CHECKED_OUT"] },
            checkIn: { lte: ev.start },
            checkOut: { gte: ev.end },
          },
          select: { id: true },
        });
        if (covered) continue;
      }
      await db.$transaction(async (tx) => {
        const b = await tx.booking.create({
          data: {
            code: generateCode(),
            propertyId: feed.propertyId,
            kind: plainBlock ? "MAINTENANCE" : "EXTERNAL_BLOCK",
            source: SOURCE[feed.channel],
            status: "CONFIRMED",
            checkIn: ev.start,
            checkOut: ev.end,
            externalUid: ev.uid,
            icalFeedId: feed.id,
            notes: [ev.summary, ev.description].filter(Boolean).join("\n"),
          },
        });
        await syncCleaningTask(tx, b, feed.property);
      });
      created++;
    }

    // Future events that disappeared from the feed were cancelled on the channel.
    const gone = await db.booking.findMany({
      where: {
        icalFeedId: feed.id,
        status: { not: "CANCELLED" },
        checkOut: { gte: today() },
        externalUid: { notIn: [...seen] },
      },
    });
    for (const b of gone) {
      await db.$transaction(async (tx) => {
        const updated = await tx.booking.update({ where: { id: b.id }, data: { status: "CANCELLED" } });
        await syncCleaningTask(tx, updated, feed.property);
      });
    }

    await db.icalFeed.update({ where: { id: feed.id }, data: { lastSyncAt: new Date(), lastError: null } });
    return { ok: true as const, events: events.length, created, cancelled: gone.length };
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    await db.icalFeed.update({ where: { id: feed.id }, data: { lastSyncAt: new Date(), lastError: message } });
    return { ok: false as const, error: message };
  }
}

export async function syncAllFeeds() {
  const feeds = await db.icalFeed.findMany({ select: { id: true } });
  const results = [];
  for (const f of feeds) results.push({ id: f.id, ...(await syncFeed(f.id)) });
  return results;
}
