import Link from "next/link";
import { getT } from "@/lib/i18n";
import { getSession } from "@/lib/auth";
import { homeFor } from "@/lib/session";
import { LanguageSwitch } from "@/components/LanguageSwitch";

export default async function PublicLayout({ children }: { children: React.ReactNode }) {
  const { t, locale } = await getT();
  const session = await getSession();
  return (
    <div className="min-h-dvh flex flex-col">
      <header className="sticky top-0 z-30 bg-white/85 backdrop-blur border-b border-line">
        <div className="mx-auto max-w-7xl px-4 md:px-8 h-16 flex items-center justify-between gap-4">
          <Link href="/" className="flex items-center gap-2.5 font-semibold tracking-tight">
            <span className="grid place-items-center size-8 rounded-full bg-ink text-white text-xs">P</span>
            <span className="hidden sm:inline">{t.brand}</span>
          </Link>
          <nav className="flex items-center gap-2">
            <Link href="/bashkohu" className="btn-secondary btn-sm sm:h-9 sm:px-4 sm:text-sm">
              + {t.public.listYourProperty}
            </Link>
            <Link href={session ? homeFor(session.role) : "/login"} className="btn-ghost btn-sm sm:h-9 sm:text-sm">
              {session ? session.name.split(" ")[0] : t.public.ownerLogin}
            </Link>
            <LanguageSwitch locale={locale} />
          </nav>
        </div>
      </header>
      <main className="flex-1">{children}</main>
      <footer className="border-t border-line mt-24">
        <div className="mx-auto max-w-7xl px-4 md:px-8 py-10 flex flex-wrap items-center justify-between gap-4 text-sm text-muted">
          <div>
            <span className="font-medium text-ink">{t.brand}</span> · {t.public.footerNote}
          </div>
          <div className="flex gap-5">
            <Link href="/bashkohu" className="hover:text-ink">{t.public.listYourProperty}</Link>
            <Link href="/login" className="hover:text-ink">{t.public.ownerLogin}</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
