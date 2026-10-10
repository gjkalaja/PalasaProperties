"use client";

import { useActionState, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/ui";
import { dayMonth, monthYear, weekdayNarrowList } from "@/lib/format";

export interface DayInfo {
  date: string; // YYYY-MM-DD
  price: number;
  free: boolean; // night is free
  minNights: number; // min stay if arriving this day
}

interface Labels {
  selectDates: string;
  selectCheckout: string;
  accommodation: string;
  cleaningFee: string;
  total: string;
  nights: string;
  night: string;
  noHiddenFees: string;
  requestBooking: string;
  requestSent: string;
  minNightsError: string;
  datesUnavailable: string;
  clearDates: string;
  name: string;
  email: string;
  phone: string;
  guests: string;
  message: string;
  checkIn: string;
  checkOut: string;
}

type State = { ok?: boolean; error?: string } | undefined;

const toDate = (iso: string) => new Date(`${iso}T00:00:00Z`);
const iso = (d: Date) => d.toISOString().slice(0, 10);
const addDays = (s: string, n: number) => iso(new Date(toDate(s).getTime() + n * 86_400_000));

/**
 * Two-month price calendar. Every day shows its nightly price; selecting arrival → departure
 * prices the stay live (same rules as the server, which re-checks everything on submit).
 */
export function BookingWidget({
  days,
  cleaningFee,
  maxGuests,
  locale,
  labels,
  action,
  initialIn,
  initialOut,
}: {
  days: DayInfo[];
  cleaningFee: number;
  maxGuests: number;
  locale: string;
  labels: Labels;
  action: (prev: State, fd: FormData) => Promise<State>;
  initialIn?: string;
  initialOut?: string;
}) {
  const byDate = useMemo(() => new Map(days.map((d) => [d.date, d])), [days]);
  const first = days[0]?.date ?? iso(new Date());
  const [monthOffset, setMonthOffset] = useState(() => {
    if (!initialIn || !byDate.has(initialIn)) return 0;
    const a = toDate(first);
    const b = toDate(initialIn);
    return Math.max(0, (b.getUTCFullYear() - a.getUTCFullYear()) * 12 + b.getUTCMonth() - a.getUTCMonth());
  });
  const [checkIn, setCheckIn] = useState<string | null>(initialIn && byDate.get(initialIn)?.free ? initialIn : null);
  const [checkOut, setCheckOut] = useState<string | null>(initialIn && initialOut ? initialOut : null);
  const [hoverDay, setHoverDay] = useState<string | null>(null);
  const [state, formAction, pending] = useActionState(action, undefined);

  const fmtMoney = (v: number) =>
    new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(v);
  const weekdays = weekdayNarrowList(locale);

  /** Departure is valid when every night in between is free. */
  const rangeFree = (from: string, to: string) => {
    for (let d = from; d < to; d = addDays(d, 1)) if (!byDate.get(d)?.free) return false;
    return true;
  };

  const stay = useMemo(() => {
    if (!checkIn || !checkOut) return null;
    const nights: DayInfo[] = [];
    for (let d = checkIn; d < checkOut; d = addDays(d, 1)) {
      const info = byDate.get(d);
      if (!info) return null;
      nights.push(info);
    }
    const accommodation = nights.reduce((s, n) => s + n.price, 0);
    const minNights = byDate.get(checkIn)?.minNights ?? 1;
    return {
      nights: nights.length,
      accommodation,
      total: accommodation + cleaningFee,
      minNights,
      ok: nights.length >= minNights && rangeFree(checkIn, checkOut),
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [checkIn, checkOut, byDate, cleaningFee]);

  const pick = (d: string) => {
    const info = byDate.get(d);
    if (!checkIn || checkOut) {
      if (!info?.free) return;
      setCheckIn(d);
      setCheckOut(null);
      return;
    }
    if (d <= checkIn) {
      if (info?.free) setCheckIn(d);
      return;
    }
    if (rangeFree(checkIn, d)) setCheckOut(d);
    else if (info?.free) setCheckIn(d);
  };

  const baseMonth = toDate(first);
  const months = [0, 1].map((k) => new Date(Date.UTC(baseMonth.getUTCFullYear(), baseMonth.getUTCMonth() + monthOffset + k, 1)));
  const maxOffset = 11;
  const previewEnd = checkIn && !checkOut && hoverDay && hoverDay > checkIn && rangeFree(checkIn, hoverDay) ? hoverDay : null;

  if (state?.ok) {
    return (
      <div className="card p-8 text-center">
        <div className="text-3xl mb-3">✓</div>
        <p className="font-medium">{labels.requestSent}</p>
      </div>
    );
  }

  return (
    <div className="card overflow-hidden">
      <div className="p-4 md:p-5">
        <div className="flex items-center justify-between mb-3">
          <button
            type="button"
            className="btn-ghost size-9 p-0"
            disabled={monthOffset === 0}
            onClick={() => setMonthOffset((m) => m - 1)}
            aria-label="prev"
          >
            <ChevronLeft className="size-4" />
          </button>
          <div className="text-sm text-muted">
            {!checkIn ? labels.selectDates : !checkOut ? labels.selectCheckout : `${dayMonth(toDate(checkIn), locale)} → ${dayMonth(toDate(checkOut), locale)}`}
          </div>
          <button
            type="button"
            className="btn-ghost size-9 p-0"
            disabled={monthOffset >= maxOffset}
            onClick={() => setMonthOffset((m) => m + 1)}
            aria-label="next"
          >
            <ChevronRight className="size-4" />
          </button>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {months.map((m, mi) => {
            const firstWeekday = (m.getUTCDay() + 6) % 7; // Monday first
            const daysIn = new Date(Date.UTC(m.getUTCFullYear(), m.getUTCMonth() + 1, 0)).getUTCDate();
            return (
              <div key={m.toISOString()} className={cn(mi === 1 && "hidden md:block")}>
                <div className="text-sm font-medium text-center mb-2 capitalize">{monthYear(m, locale)}</div>
                <div className="grid grid-cols-7 text-[10px] text-muted text-center mb-1">
                  {weekdays.map((w, i) => (
                    <div key={i}>{w}</div>
                  ))}
                </div>
                <div className="grid grid-cols-7 gap-y-1">
                  {Array.from({ length: firstWeekday }, (_, i) => (
                    <div key={`e${i}`} />
                  ))}
                  {Array.from({ length: daysIn }, (_, i) => {
                    const d = iso(new Date(Date.UTC(m.getUTCFullYear(), m.getUTCMonth(), i + 1)));
                    const info = byDate.get(d);
                    const past = d < first || !info;
                    const end = checkOut ?? previewEnd;
                    const inRange = checkIn && end && d > checkIn && d < end;
                    const isStart = d === checkIn;
                    const isEnd = d === end;
                    // A booked night can still be a departure day.
                    const canCheckout = !!checkIn && !checkOut && d > checkIn && rangeFree(checkIn, d);
                    const disabled = past || (!info?.free && !canCheckout);
                    return (
                      <button
                        key={d}
                        type="button"
                        disabled={disabled}
                        onClick={() => pick(d)}
                        onMouseEnter={() => setHoverDay(d)}
                        className={cn(
                          "relative h-12 flex flex-col items-center justify-center text-sm transition",
                          inRange && "bg-neutral-100",
                          (isStart || isEnd) && "bg-ink text-white rounded-xl z-10",
                          isStart && end && "rounded-r-none",
                          isEnd && checkIn && "rounded-l-none",
                          !disabled && !isStart && !isEnd && "hover:bg-neutral-100 rounded-xl",
                          disabled && "text-neutral-300 cursor-not-allowed",
                          !info?.free && !past && !canCheckout && "line-through",
                        )}
                      >
                        <span className="leading-none">{i + 1}</span>
                        {info && !past && info.free && (
                          <span className={cn("text-[10px] leading-none mt-1", isStart || isEnd ? "text-white/70" : "text-muted")}>
                            {Math.round(info.price)}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {checkIn && checkOut && stay && (
        <form action={formAction} className="border-t border-line p-4 md:p-5 space-y-4 bg-paper">
          <input type="hidden" name="checkIn" value={checkIn} />
          <input type="hidden" name="checkOut" value={checkOut} />
          <div className="space-y-1.5 text-sm">
            <div className="flex justify-between">
              <span className="text-muted">
                {labels.accommodation} · {stay.nights} {stay.nights === 1 ? labels.night : labels.nights}
              </span>
              <span>{fmtMoney(stay.accommodation)}</span>
            </div>
            {cleaningFee > 0 && (
              <div className="flex justify-between">
                <span className="text-muted">{labels.cleaningFee}</span>
                <span>{fmtMoney(cleaningFee)}</span>
              </div>
            )}
            <div className="flex justify-between font-semibold text-base pt-2 border-t border-line">
              <span>{labels.total}</span>
              <span>{fmtMoney(stay.total)}</span>
            </div>
            <p className="text-xs text-muted">{labels.noHiddenFees}</p>
          </div>

          {!stay.ok ? (
            <p className="text-sm text-red-600">{labels.minNightsError.replace("{n}", String(stay.minNights))}</p>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-3">
                <input name="name" required placeholder={labels.name} className="input col-span-2" autoComplete="name" />
                <input name="email" type="email" required placeholder={labels.email} className="input" autoComplete="email" />
                <input name="phone" placeholder={labels.phone} className="input" autoComplete="tel" />
                <select name="guests" className="input col-span-2" defaultValue={Math.min(2, maxGuests)}>
                  {Array.from({ length: maxGuests }, (_, i) => i + 1).map((g) => (
                    <option key={g} value={g}>
                      {g} · {labels.guests}
                    </option>
                  ))}
                </select>
                <textarea name="message" placeholder={labels.message} className="input col-span-2 min-h-20" />
              </div>
              {state?.error && <p className="text-sm text-red-600">{state.error}</p>}
              <button className="btn-primary w-full h-12" disabled={pending}>
                {labels.requestBooking}
              </button>
            </>
          )}
          <button
            type="button"
            className="text-xs text-muted underline underline-offset-4 w-full"
            onClick={() => {
              setCheckIn(null);
              setCheckOut(null);
            }}
          >
            {labels.clearDates}
          </button>
        </form>
      )}
    </div>
  );
}
