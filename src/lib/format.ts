// Locale-stable date labels (browsers ship incomplete Albanian Intl data, so names are spelled out here).
const NAMES = {
  sq: {
    months: ["janar", "shkurt", "mars", "prill", "maj", "qershor", "korrik", "gusht", "shtator", "tetor", "nëntor", "dhjetor"],
    monthsShort: ["jan", "shk", "mar", "pri", "maj", "qer", "kor", "gus", "sht", "tet", "nën", "dhj"],
    weekdaysShort: ["hën", "mar", "mër", "enj", "pre", "sht", "die"], // Monday first
    weekdaysNarrow: ["H", "M", "M", "E", "P", "S", "D"],
  },
  en: {
    months: ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"],
    monthsShort: ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"],
    weekdaysShort: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
    weekdaysNarrow: ["M", "T", "W", "T", "F", "S", "S"],
  },
};

type L = string;
const n = (l: L) => (l === "en" ? NAMES.en : NAMES.sq);
const mondayIndex = (d: Date) => (d.getUTCDay() + 6) % 7;

export const weekdayNarrowList = (l: L) => n(l).weekdaysNarrow;
export const weekdayNarrow = (d: Date, l: L) => n(l).weekdaysNarrow[mondayIndex(d)];
export const weekdayShort = (d: Date, l: L) => n(l).weekdaysShort[mondayIndex(d)];

/** "tetor 2026" */
export const monthYear = (d: Date, l: L) => `${n(l).months[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
export const monthName = (m: number, l: L) => n(l).months[m];

/** "12 tet" */
export const dayMonth = (d: Date, l: L) => `${d.getUTCDate()} ${n(l).monthsShort[d.getUTCMonth()]}`;

/** "12 tet 2026" */
export const dayMonthYear = (d: Date, l: L) => `${dayMonth(d, l)} ${d.getUTCFullYear()}`;

/** "12 tet 11:00" for instants, shown in Albania time. */
export function dateTime(d: Date, l: L): string {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/Tirane",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(d);
  const get = (t: string) => Number(parts.find((p) => p.type === t)?.value);
  const local = new Date(Date.UTC(get("year"), get("month") - 1, get("day")));
  return `${dayMonth(local, l)} ${String(get("hour")).padStart(2, "0")}:${String(get("minute")).padStart(2, "0")}`;
}

/** Albania-local calendar date of an instant, as a UTC-midnight Date. */
export function localDay(d: Date): Date {
  const iso = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Tirane", year: "numeric", month: "2-digit", day: "2-digit" }).format(d);
  return new Date(`${iso}T00:00:00Z`);
}
