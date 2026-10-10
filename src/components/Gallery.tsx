"use client";

import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, Grid2x2, X } from "lucide-react";
import { cn } from "@/lib/ui";

/* eslint-disable @next/next/no-img-element */

/** Desktop mosaic: the cover takes the left half, the rest fill the right half without gaps. */
function tileSpan(count: number, i: number): string {
  if (i === 0) return count === 1 ? "md:col-span-4" : "";
  const shown = Math.min(count, 5) - 1;
  if (shown === 1) return "md:col-span-2 md:row-span-2";
  if (shown === 2) return "md:col-span-2";
  if (shown === 3) return i === 3 ? "md:col-span-2" : "";
  return "";
}
export function Gallery({ images, title, allLabel }: { images: string[]; title: string; allLabel: string }) {
  const [open, setOpen] = useState<number | null>(null);

  useEffect(() => {
    if (open === null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(null);
      if (e.key === "ArrowRight") setOpen((i) => (i! + 1) % images.length);
      if (e.key === "ArrowLeft") setOpen((i) => (i! - 1 + images.length) % images.length);
    };
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, images.length]);

  if (!images.length) return <div className="aspect-[21/9] rounded-3xl bg-neutral-100" />;

  return (
    <>
      <div className="relative grid grid-cols-4 grid-rows-2 gap-2 aspect-[4/3] md:aspect-[21/9] rounded-3xl overflow-hidden">
        {images.slice(0, 5).map((src, i) => (
          <button
            key={src}
            onClick={() => setOpen(i)}
            className={cn("relative overflow-hidden bg-neutral-100 group", i === 0 ? "col-span-4 row-span-2 md:col-span-2" : "hidden md:block", tileSpan(images.length, i))}
          >
            <img src={src} alt={`${title} ${i + 1}`} className="size-full object-cover transition duration-700 group-hover:scale-105" />
          </button>
        ))}
        <button onClick={() => setOpen(0)} className="absolute bottom-4 right-4 btn-secondary btn-sm shadow-sm">
          <Grid2x2 className="size-3.5" /> {allLabel} · {images.length}
        </button>
      </div>

      {open !== null && (
        <div className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center" onClick={() => setOpen(null)}>
          <button className="absolute top-4 right-4 text-white/80 hover:text-white p-2" aria-label="close">
            <X className="size-6" />
          </button>
          <button
            className="absolute left-2 md:left-6 text-white/80 hover:text-white p-3"
            onClick={(e) => {
              e.stopPropagation();
              setOpen((open - 1 + images.length) % images.length);
            }}
            aria-label="prev"
          >
            <ChevronLeft className="size-8" />
          </button>
          <img
            src={images[open]}
            alt=""
            className="max-h-[85vh] max-w-[90vw] object-contain rounded-lg"
            onClick={(e) => e.stopPropagation()}
          />
          <button
            className="absolute right-2 md:right-6 text-white/80 hover:text-white p-3"
            onClick={(e) => {
              e.stopPropagation();
              setOpen((open + 1) % images.length);
            }}
            aria-label="next"
          >
            <ChevronRight className="size-8" />
          </button>
          <div className="absolute bottom-6 text-white/70 text-sm">
            {open + 1} / {images.length}
          </div>
        </div>
      )}
    </>
  );
}
