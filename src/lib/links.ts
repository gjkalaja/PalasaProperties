// Share helpers: WhatsApp click-to-chat and Google Calendar "add event" links.

/** Normalises a phone number to the digits-only international format wa.me expects (Albania default). */
export function normalizePhone(phone: string | null | undefined): string | null {
  if (!phone) return null;
  let digits = phone.replace(/[^\d+]/g, "");
  if (digits.startsWith("+")) digits = digits.slice(1);
  else if (digits.startsWith("00")) digits = digits.slice(2);
  else if (digits.startsWith("0")) digits = "355" + digits.slice(1);
  return digits.length >= 8 ? digits : null;
}

/** wa.me link; without a phone WhatsApp lets the sender pick the contact. */
export function whatsappLink(text: string, phone?: string | null): string {
  const p = normalizePhone(phone);
  return `https://wa.me/${p ?? ""}?text=${encodeURIComponent(text)}`;
}

function gcalDate(d: Date, allDay: boolean): string {
  return allDay
    ? d.toISOString().slice(0, 10).replace(/-/g, "")
    : d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
}

export function googleCalendarLink(opts: {
  title: string;
  start: Date;
  end: Date; // exclusive for all-day events
  details?: string;
  location?: string;
  allDay?: boolean;
}): string {
  const allDay = opts.allDay ?? true;
  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: opts.title,
    dates: `${gcalDate(opts.start, allDay)}/${gcalDate(opts.end, allDay)}`,
  });
  if (opts.details) params.set("details", opts.details);
  if (opts.location) params.set("location", opts.location);
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

/** Combines a date-only value with "HH:MM" local Albania time into an absolute instant. */
export function atLocalTime(date: Date, hhmm: string): Date {
  const [h, m] = hhmm.split(":").map(Number);
  const guess = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), h, m));
  // Offset of Europe/Tirane at that moment (CET/CEST)
  const tz = new Intl.DateTimeFormat("en-US", {
    timeZone: "Europe/Tirane",
    timeZoneName: "shortOffset",
  })
    .formatToParts(guess)
    .find((p) => p.type === "timeZoneName")?.value;
  const offset = Number(/GMT([+-]\d+)/.exec(tz ?? "")?.[1] ?? 1);
  return new Date(guess.getTime() - offset * 3_600_000);
}

export function fillTemplate(body: string, vars: Record<string, string | number | null | undefined>): string {
  return body.replace(/\{(\w+)\}/g, (m, k) => (vars[k] === undefined || vars[k] === null ? m : String(vars[k])));
}
