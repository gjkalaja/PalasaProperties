import { describe, expect, it } from "vitest";
import { parseISODate as d, nightsBetween } from "./dates";
import { quoteStay } from "./pricing";
import { findConflicts, occupiedNights } from "./availability";
import { buildIcal, parseIcal } from "./ical";
import { googleCalendarLink, normalizePhone, whatsappLink, atLocalTime, fillTemplate } from "./links";
import { ownerSplit } from "./finance";

const property = { basePrice: 100, weekendPrice: 130, cleaningFee: 40, minNights: 2 };

describe("dates", () => {
  it("rejects invalid dates", () => {
    expect(d("2026-02-30")).toBeNull();
    expect(d("nope")).toBeNull();
    expect(nightsBetween(d("2026-07-01")!, d("2026-07-05")!)).toBe(4);
  });
});

describe("pricing", () => {
  it("uses base and weekend prices", () => {
    // Thu 2026-10-15 .. Sun 2026-10-18 => Thu, Fri, Sat nights
    const q = quoteStay(property, [], d("2026-10-15")!, d("2026-10-18")!);
    expect(q.breakdown.map((n) => n.price)).toEqual([100, 130, 130]);
    expect(q.total).toBe(400);
    expect(q.meetsMinNights).toBe(true);
  });

  it("prefers the most specific seasonal rate and its min nights", () => {
    const rates = [
      { startDate: d("2026-06-01")!, endDate: d("2026-09-30")!, pricePerNight: 150, minNights: 3 },
      { startDate: d("2026-08-10")!, endDate: d("2026-08-20")!, pricePerNight: 220, weekendPrice: 250, minNights: 5 },
    ];
    const q = quoteStay(property, rates, d("2026-08-09")!, d("2026-08-11")!);
    expect(q.breakdown.map((n) => n.price)).toEqual([150, 220]);
    expect(q.minNights).toBe(3);
    expect(quoteStay(property, rates, d("2026-08-14")!, d("2026-08-16")!).breakdown.map((n) => n.price)).toEqual([250, 250]);
    expect(quoteStay(property, rates, d("2026-08-14")!, d("2026-08-16")!).meetsMinNights).toBe(false);
  });
});

describe("availability", () => {
  const existing = [
    { id: "a", checkIn: d("2026-07-10")!, checkOut: d("2026-07-15")!, status: "CONFIRMED" as const },
    { id: "b", checkIn: d("2026-07-20")!, checkOut: d("2026-07-22")!, status: "CANCELLED" as const },
  ];
  it("allows back-to-back stays and ignores cancelled", () => {
    expect(findConflicts(existing, d("2026-07-15")!, d("2026-07-18")!)).toHaveLength(0);
    expect(findConflicts(existing, d("2026-07-05")!, d("2026-07-10")!)).toHaveLength(0);
    expect(findConflicts(existing, d("2026-07-14")!, d("2026-07-16")!)).toHaveLength(1);
    expect(findConflicts(existing, d("2026-07-20")!, d("2026-07-21")!)).toHaveLength(0);
    expect(findConflicts(existing, d("2026-07-11")!, d("2026-07-12")!, "a")).toHaveLength(0);
  });
  it("lists occupied nights", () => {
    const nights = occupiedNights(existing, d("2026-07-13")!, 4);
    expect([...nights]).toEqual(["2026-07-13", "2026-07-14"]);
  });
});

describe("ical", () => {
  it("parses Booking.com / Airbnb style feeds with folding", () => {
    const text = [
      "BEGIN:VCALENDAR",
      "BEGIN:VEVENT",
      "DTSTART;VALUE=DATE:20261012",
      "DTEND;VALUE=DATE:20261015",
      "UID:abc123@airbnb.com",
      "SUMMARY:Reserved",
      "DESCRIPTION:Reservation URL: https://www.airbnb.com/hosting/reservations/details/HM",
      " ABCDEF",
      "END:VEVENT",
      "BEGIN:VEVENT",
      "DTSTART:20261020T140000Z",
      "UID:x2",
      "SUMMARY:CLOSED - Not available",
      "END:VEVENT",
      "END:VCALENDAR",
    ].join("\r\n");
    const ev = parseIcal(text);
    expect(ev).toHaveLength(2);
    expect(ev[0].start.toISOString().slice(0, 10)).toBe("2026-10-12");
    expect(ev[0].end.toISOString().slice(0, 10)).toBe("2026-10-15");
    expect(ev[0].description).toContain("HMABCDEF");
    expect(ev[1].end.toISOString().slice(0, 10)).toBe("2026-10-21");
  });
  it("round-trips export", () => {
    const out = buildIcal("Vila; Test", [
      { uid: "1@palasa", start: d("2026-07-01")!, end: d("2026-07-04")!, summary: "Rezervuar, 2 persona" },
    ]);
    expect(out).toContain("DTSTART;VALUE=DATE:20260701");
    const back = parseIcal(out);
    expect(back[0].summary).toBe("Rezervuar, 2 persona");
    expect(back[0].uid).toBe("1@palasa");
  });
});

describe("links", () => {
  it("normalizes Albanian numbers", () => {
    expect(normalizePhone("069 12 34 567")).toBe("355691234567");
    expect(normalizePhone("+355 69 123 4567")).toBe("355691234567");
    expect(normalizePhone("0039 333 1234567")).toBe("393331234567");
    expect(whatsappLink("Përshëndetje & mirë", "0691234567")).toBe(
      "https://wa.me/355691234567?text=P%C3%ABrsh%C3%ABndetje%20%26%20mir%C3%AB",
    );
  });
  it("builds Google Calendar links", () => {
    const url = googleCalendarLink({ title: "Check-in", start: d("2026-07-01")!, end: d("2026-07-04")! });
    expect(url).toContain("dates=20260701%2F20260704");
  });
  it("converts Albania local time (summer/winter)", () => {
    expect(atLocalTime(d("2026-07-01")!, "15:00").toISOString()).toBe("2026-07-01T13:00:00.000Z");
    expect(atLocalTime(d("2026-12-01")!, "11:00").toISOString()).toBe("2026-12-01T10:00:00.000Z");
  });
  it("fills templates", () => {
    expect(fillTemplate("Hi {name}, code {code} {missing}", { name: "Ana", code: 12 })).toBe("Hi Ana, code 12 {missing}");
  });
});

describe("finance", () => {
  it("splits owner revenue", () => {
    expect(ownerSplit({ accommodationTotal: 1000, cleaningFee: 50, platformCommission: 150 }, 20)).toEqual({
      gross: 1050,
      accommodation: 1000,
      cleaning: 50,
      platform: 150,
      management: 170,
      ownerNet: 680,
    });
  });
});
