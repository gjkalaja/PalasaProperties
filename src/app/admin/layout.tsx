import Link from "next/link";
import { LogOut, ExternalLink } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { getT } from "@/lib/i18n";
import { db } from "@/lib/db";
import { logout } from "@/app/actions";
import { LanguageSwitch } from "@/components/LanguageSwitch";
import { AdminNav, type NavItem } from "@/components/AdminNav";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser(["ADMIN", "MANAGER"]);
  const { t, locale } = await getT();
  const [inquiries, ownerStays, leads] = await Promise.all([
    db.inquiry.count({ where: { status: "NEW" } }),
    db.booking.count({ where: { kind: "OWNER_STAY", status: "PENDING" } }),
    db.ownerLead.count({ where: { status: "NEW" } }),
  ]);
  const isAdmin = user.role === "ADMIN";
  const items: NavItem[] = [
    { key: "dashboard", href: "/admin", label: t.nav.dashboard },
    { key: "calendar", href: "/admin/kalendari", label: t.nav.calendar },
    { key: "bookings", href: "/admin/rezervimet", label: t.nav.bookings },
    { key: "requests", href: "/admin/kerkesat", label: t.nav.requests, badge: inquiries + ownerStays + leads },
    { key: "tasks", href: "/admin/detyrat", label: t.nav.tasks },
    { key: "properties", href: "/admin/prona", label: t.nav.properties },
    { key: "guests", href: "/admin/mysafiret", label: t.nav.guests },
    { key: "messages", href: "/admin/mesazhet", label: t.nav.messages },
    ...(isAdmin
      ? [
          { key: "finance", href: "/admin/financat", label: t.nav.finance },
          { key: "users", href: "/admin/perdoruesit", label: t.nav.users },
        ]
      : []),
  ];

  return (
    <div className="min-h-dvh bg-paper lg:grid lg:grid-cols-[240px_1fr]">
      <aside className="hidden lg:flex flex-col sticky top-0 h-dvh border-r border-line bg-white p-4">
        <Link href="/admin" className="flex items-center gap-2.5 font-semibold tracking-tight px-2 mb-8 mt-1">
          <span className="grid place-items-center size-8 rounded-full bg-ink text-white text-xs">P</span>
          {t.brand}
        </Link>
        <AdminNav items={items} />
        <div className="mt-auto space-y-3 pt-4 border-t border-line">
          <Link href="/" className="flex items-center gap-2 text-sm text-muted hover:text-ink px-2">
            <ExternalLink className="size-3.5" /> {t.nav.publicSite}
          </Link>
          <div className="flex items-center justify-between gap-2 px-2">
            <div className="min-w-0">
              <div className="text-sm font-medium truncate">{user.name}</div>
              <div className="text-xs text-muted">{t.roles[user.role]}</div>
            </div>
            <form action={logout}>
              <button className="btn-ghost size-8 p-0" title={t.common.logout}>
                <LogOut className="size-4" />
              </button>
            </form>
          </div>
          <LanguageSwitch locale={locale} className="ml-2" />
        </div>
      </aside>

      <div className="lg:hidden sticky top-0 z-30 bg-white/90 backdrop-blur border-b border-line">
        <div className="flex items-center justify-between h-14 px-4">
          <Link href="/admin" className="flex items-center gap-2 font-semibold">
            <span className="grid place-items-center size-7 rounded-full bg-ink text-white text-[10px]">P</span>
            {t.brand}
          </Link>
          <div className="flex items-center gap-2">
            <LanguageSwitch locale={locale} />
            <form action={logout}>
              <button className="btn-ghost size-8 p-0" title={t.common.logout}>
                <LogOut className="size-4" />
              </button>
            </form>
          </div>
        </div>
        <AdminNav items={items} mobile />
      </div>

      <main className="min-w-0 px-4 md:px-8 py-6 md:py-10 max-w-[1600px]">{children}</main>
    </div>
  );
}
