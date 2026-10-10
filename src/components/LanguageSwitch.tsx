import { setLocale } from "@/app/actions";
import type { Locale } from "@/lib/dictionaries";
import { cn } from "@/lib/ui";

export function LanguageSwitch({ locale, className }: { locale: Locale; className?: string }) {
  return (
    <form action={setLocale} className={cn("inline-flex rounded-full border border-line p-0.5 text-xs", className)}>
      {(["sq", "en"] as const).map((l) => (
        <button
          key={l}
          name="locale"
          value={l}
          className={cn(
            "px-2.5 h-7 rounded-full uppercase font-medium transition",
            l === locale ? "bg-ink text-white" : "text-muted hover:text-ink",
          )}
        >
          {l}
        </button>
      ))}
    </form>
  );
}
