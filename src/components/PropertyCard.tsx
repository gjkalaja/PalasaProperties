"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/ui";

export interface CardData {
  slug: string;
  name: string;
  city: string;
  typeLabel: string;
  images: string[];
  seaLabel: string | null;
  meta: string;
  priceLabel: string;
  priceSuffix: string;
  strip: { day: string; weekday: string; free: boolean }[];
  stripLabel: string;
  freeLabel: string;
  href: string;
}

/** Listing card: photos cycle while hovered (swipe on touch) and a 14-night availability strip. */
export function PropertyCard({ data, priority }: { data: CardData; priority?: boolean }) {
  const [idx, setIdx] = useState(0);
  const [hover, setHover] = useState(false);
  const touchX = useRef<number | null>(null);
  const n = data.images.length;

  useEffect(() => {
    if (!hover || n < 2) return;
    const id = setInterval(() => setIdx((i) => (i + 1) % n), 1100);
    return () => clearInterval(id);
  }, [hover, n]);

  const freeCount = data.strip.filter((d) => d.free).length;

  return (
    <Link
      href={data.href}
      className="group block"
      onMouseEnter={() => {
        setHover(true);
        if (n > 1) setIdx((i) => (i + 1) % n);
      }}
      onMouseLeave={() => {
        setHover(false);
        setIdx(0);
      }}
    >
      <div
        className="relative aspect-[4/3] overflow-hidden rounded-2xl bg-neutral-100"
        onTouchStart={(e) => (touchX.current = e.touches[0].clientX)}
        onTouchEnd={(e) => {
          if (touchX.current === null) return;
          const dx = e.changedTouches[0].clientX - touchX.current;
          if (Math.abs(dx) > 30) {
            e.preventDefault();
            setIdx((i) => (i + (dx < 0 ? 1 : -1) + n) % n);
          }
          touchX.current = null;
        }}
      >
        {data.images.map((src, i) => (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            key={src}
            src={src}
            alt=""
            loading={priority && i === 0 ? "eager" : "lazy"}
            className={cn(
              "absolute inset-0 size-full object-cover transition-all duration-700",
              i === idx ? "opacity-100 scale-100" : "opacity-0 scale-105",
            )}
          />
        ))}
        <div className="absolute inset-x-0 top-0 p-3 flex justify-between gap-2">
          <span className="badge bg-white/95 text-ink shadow-sm">{data.typeLabel}</span>
          {data.seaLabel && <span className="badge bg-ink/80 text-white backdrop-blur">{data.seaLabel}</span>}
        </div>
        {n > 1 && (
          <div className="absolute inset-x-0 bottom-3 flex justify-center gap-1.5">
            {data.images.map((src, i) => (
              <span
                key={src}
                className={cn("h-1 rounded-full bg-white transition-all", i === idx ? "w-5 opacity-100" : "w-1.5 opacity-60")}
              />
            ))}
          </div>
        )}
      </div>

      <div className="pt-3.5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="font-medium truncate group-hover:underline underline-offset-4">{data.name}</h3>
            <p className="text-sm text-muted truncate">
              {data.city} · {data.meta}
            </p>
          </div>
          <div className="text-right shrink-0">
            <div className="font-semibold">{data.priceLabel}</div>
            <div className="text-xs text-muted">{data.priceSuffix}</div>
          </div>
        </div>

        <div className="mt-3">
          <div className="flex items-center justify-between text-[11px] text-muted mb-1.5">
            <span>{data.stripLabel}</span>
            <span>
              {freeCount}/14 {data.freeLabel}
            </span>
          </div>
          <div className="grid grid-cols-14 gap-[3px]" style={{ gridTemplateColumns: "repeat(14, minmax(0, 1fr))" }}>
            {data.strip.map((d) => (
              <div key={d.day} title={d.day} className="flex flex-col items-center gap-1">
                <span
                  className={cn(
                    "h-1.5 w-full rounded-full",
                    d.free ? "bg-emerald-500" : "bg-neutral-200",
                  )}
                />
                <span className="text-[9px] leading-none text-neutral-400">{d.weekday}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </Link>
  );
}
