// Minimal iCalendar (RFC 5545) support — enough for Booking.com / Airbnb availability feeds.
import { addDays, parseISODate } from "./dates";

export interface IcalEvent {
  uid: string;
  start: Date; // date-only, UTC midnight
  end: Date; // exclusive, date-only
  summary: string;
  description?: string;
}

function unfold(text: string): string[] {
  return text.replace(/\r\n/g, "\n").replace(/\n[ \t]/g, "").split("\n");
}

function unescapeText(v: string): string {
  return v.replace(/\\n/gi, "\n").replace(/\\([,;\\])/g, "$1");
}

/** Accepts 20261012, 20261012T140000 or 20261012T140000Z and returns the calendar date. */
function parseIcalDate(value: string): Date | null {
  const m = /^(\d{4})(\d{2})(\d{2})/.exec(value.trim());
  return m ? parseISODate(`${m[1]}-${m[2]}-${m[3]}`) : null;
}

export function parseIcal(text: string): IcalEvent[] {
  const events: IcalEvent[] = [];
  let cur: Record<string, string> | null = null;

  for (const line of unfold(text)) {
    if (line === "BEGIN:VEVENT") {
      cur = {};
      continue;
    }
    if (line === "END:VEVENT") {
      if (cur) {
        const start = cur.DTSTART ? parseIcalDate(cur.DTSTART) : null;
        let end = cur.DTEND ? parseIcalDate(cur.DTEND) : null;
        if (start && (!end || end <= start)) end = addDays(start, 1);
        if (start && end) {
          events.push({
            uid: cur.UID || `${cur.DTSTART}-${cur.DTEND}`,
            start,
            end,
            summary: unescapeText(cur.SUMMARY ?? ""),
            description: cur.DESCRIPTION ? unescapeText(cur.DESCRIPTION) : undefined,
          });
        }
      }
      cur = null;
      continue;
    }
    if (!cur) continue;
    const idx = line.indexOf(":");
    if (idx < 0) continue;
    const name = line.slice(0, idx).split(";")[0].toUpperCase();
    cur[name] = line.slice(idx + 1);
  }
  return events;
}

function escapeText(v: string): string {
  return v.replace(/\\/g, "\\\\").replace(/\n/g, "\\n").replace(/([,;])/g, "\\$1");
}

function icalDate(d: Date): string {
  return d.toISOString().slice(0, 10).replace(/-/g, "");
}

function icalStamp(d: Date): string {
  return d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
}

/** Folds lines longer than 75 octets as required by RFC 5545. */
function fold(line: string): string {
  const parts: string[] = [];
  let rest = line;
  while (rest.length > 74) {
    parts.push(rest.slice(0, 74));
    rest = " " + rest.slice(74);
  }
  parts.push(rest);
  return parts.join("\r\n");
}

export interface IcalExportEvent {
  uid: string;
  start: Date;
  end: Date; // exclusive
  summary: string;
  description?: string;
  allDay?: boolean;
}

export function buildIcal(calName: string, events: IcalExportEvent[]): string {
  const now = icalStamp(new Date());
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Palasa Properties//PMS//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    `X-WR-CALNAME:${escapeText(calName)}`,
  ];
  for (const e of events) {
    const allDay = e.allDay !== false;
    lines.push(
      "BEGIN:VEVENT",
      `UID:${e.uid}`,
      `DTSTAMP:${now}`,
      allDay ? `DTSTART;VALUE=DATE:${icalDate(e.start)}` : `DTSTART:${icalStamp(e.start)}`,
      allDay ? `DTEND;VALUE=DATE:${icalDate(e.end)}` : `DTEND:${icalStamp(e.end)}`,
      `SUMMARY:${escapeText(e.summary)}`,
    );
    if (e.description) lines.push(`DESCRIPTION:${escapeText(e.description)}`);
    lines.push("END:VEVENT");
  }
  lines.push("END:VCALENDAR");
  return lines.map(fold).join("\r\n") + "\r\n";
}
