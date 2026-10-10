import type { Booking, Guest, Property, Task, User } from "@prisma/client";
import { dictionaries, type Locale } from "./dictionaries";
import { dayMonthYear, dateTime } from "./format";
import { bookingTotal } from "./finance";
import { formatMoney } from "./money";
import { fillTemplate } from "./links";
import { fmt } from "./text";

export function bookingVars(b: Booking, p: Property, g: Guest | null, locale: Locale) {
  return {
    guest: g?.name.split(" ")[0] ?? "",
    property: p.name,
    checkIn: dayMonthYear(b.checkIn, locale),
    checkOut: dayMonthYear(b.checkOut, locale),
    checkInTime: p.checkInTime,
    checkOutTime: p.checkOutTime,
    address: [p.address, p.city].filter(Boolean).join(", "),
    wifiName: p.wifiName ?? "",
    wifiPassword: p.wifiPassword ?? "",
    doorCode: p.doorCode ?? "",
    total: formatMoney(bookingTotal(b)),
    code: b.code,
  };
}

export function renderTemplate(body: string, vars: Record<string, string>) {
  return fillTemplate(body, vars);
}

/** WhatsApp text sent to the person assigned to a task. */
export function taskMessage(
  task: Task,
  property: Property,
  locale: Locale,
  appUrl: string,
  nextBooking?: (Booking & { guest: Guest | null }) | null,
  assignee?: User | null,
) {
  const t = dictionaries[locale];
  const checklist = Array.isArray(task.checklist) ? (task.checklist as { label: string }[]).map((c) => `▫️ ${c.label}`) : [];
  const details = [
    task.title !== t.taskTypes[task.type] ? task.title : null,
    task.description,
    property.doorCode ? `🔑 ${t.propertyAdmin.doorCode}: ${property.doorCode}` : null,
    nextBooking
      ? `👥 ${t.taskAdmin.nextGuests}: ${dayMonthYear(nextBooking.checkIn, locale)} (${nextBooking.adults + nextBooking.children} ${t.common.guests.toLowerCase()})`
      : null,
    checklist.length ? checklist.join("\n") : null,
  ]
    .filter(Boolean)
    .join("\n");
  const greeting = assignee ? `${assignee.name.split(" ")[0]}, ` : "";
  return (
    greeting +
    fmt(t.messages.taskWhatsApp, {
      type: t.taskTypes[task.type],
      property: property.name,
      date: dateTime(task.dueDate, locale),
      address: [property.address, property.city].filter(Boolean).join(", "),
      details,
      link: `${appUrl}/staf`,
    })
  );
}
