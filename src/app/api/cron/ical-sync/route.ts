import { NextResponse, type NextRequest } from "next/server";
import { syncAllFeeds } from "@/lib/ical-sync";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

/** Called every 15–30 minutes by a scheduler (Vercel Cron, cron-job.org, crontab). */
export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  const provided = req.headers.get("authorization")?.replace(/^Bearer /, "") ?? req.nextUrl.searchParams.get("key");
  if (!secret || provided !== secret) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const results = await syncAllFeeds();
  return NextResponse.json({ synced: results.length, results });
}
