import Link from "next/link";
import { db } from "@/lib/db";
import { getT } from "@/lib/i18n";
import { formatMoney } from "@/lib/money";
import { PageHeader } from "@/components/ui";
import { cn } from "@/lib/ui";

export const dynamic = "force-dynamic";

export default async function PropertiesAdmin() {
  const { t } = await getT();
  const properties = await db.property.findMany({
    orderBy: { name: "asc" },
    include: {
      images: { orderBy: { position: "asc" }, take: 1 },
      owner: { select: { name: true } },
      cleaner: { select: { name: true } },
      icalFeeds: { select: { channel: true, lastError: true } },
    },
  });
  return (
    <>
      <PageHeader
        title={t.propertyAdmin.title}
        subtitle={`${properties.length} ${t.public.results}`}
        actions={
          <Link href="/admin/prona/new" className="btn-primary">
            + {t.propertyAdmin.new}
          </Link>
        }
      />
      <div className="grid sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4">
        {properties.map((p) => (
          <Link key={p.id} href={`/admin/prona/${p.id}`} className={cn("card overflow-hidden group hover:shadow-lg transition", !p.active && "opacity-50")}>
            <div className="aspect-[16/9] bg-neutral-100 overflow-hidden">
              {p.images[0] && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={p.images[0].url} alt="" className="size-full object-cover group-hover:scale-105 transition duration-500" />
              )}
            </div>
            <div className="p-4">
              <div className="flex justify-between gap-2">
                <div className="font-medium truncate">{p.name}</div>
                <div className="text-sm shrink-0">{formatMoney(p.basePrice)}</div>
              </div>
              <div className="text-xs text-muted mt-0.5">
                {t.propertyTypesShort[p.type]} · {p.city} · {p.maxGuests} {t.common.guests.toLowerCase()}
              </div>
              <div className="flex flex-wrap gap-1.5 mt-3 text-[11px]">
                {!p.published && <span className="badge bg-neutral-100">{t.propertyAdmin.published}: {t.common.no}</span>}
                {p.icalFeeds.map((f, i) => (
                  <span key={i} className={cn("badge", f.lastError ? "bg-red-50 text-red-600" : "bg-neutral-100")}>
                    ⇄ {t.channels[f.channel]}
                  </span>
                ))}
                {p.owner && <span className="badge bg-amber-50 text-amber-800">{p.owner.name}</span>}
                {p.cleaner && <span className="badge bg-sky-50 text-sky-800">🧹 {p.cleaner.name}</span>}
              </div>
            </div>
          </Link>
        ))}
      </div>
    </>
  );
}
