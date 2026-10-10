"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutGrid, CalendarDays, Home, BookOpen, Users, ClipboardCheck, Inbox, Wallet, UserCog, MessageSquareText, type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/ui";

const ICONS: Record<string, LucideIcon> = {
  dashboard: LayoutGrid,
  calendar: CalendarDays,
  properties: Home,
  bookings: BookOpen,
  guests: Users,
  tasks: ClipboardCheck,
  requests: Inbox,
  finance: Wallet,
  users: UserCog,
  messages: MessageSquareText,
};

export interface NavItem {
  key: string;
  href: string;
  label: string;
  badge?: number;
}

export function AdminNav({ items, mobile }: { items: NavItem[]; mobile?: boolean }) {
  const pathname = usePathname();
  const isActive = (href: string) => (href === "/admin" ? pathname === "/admin" : pathname.startsWith(href));
  return (
    <nav className={cn(mobile ? "flex gap-1 overflow-x-auto no-scrollbar px-3 pb-2" : "space-y-0.5")}>
      {items.map((item) => {
        const Icon = ICONS[item.key];
        const active = isActive(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex items-center gap-3 rounded-xl text-sm transition whitespace-nowrap",
              mobile ? "px-3 h-9 shrink-0" : "px-3 h-10",
              active ? "bg-ink text-white" : "text-neutral-600 hover:bg-neutral-100 hover:text-ink",
            )}
          >
            <Icon className="size-4 shrink-0" strokeWidth={1.75} />
            <span className="flex-1">{item.label}</span>
            {!!item.badge && (
              <span className={cn("text-[10px] font-semibold rounded-full px-1.5 min-w-5 text-center", active ? "bg-white text-ink" : "bg-amber-400 text-ink")}>
                {item.badge}
              </span>
            )}
          </Link>
        );
      })}
    </nav>
  );
}
