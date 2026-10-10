import { db } from "@/lib/db";
import { getT } from "@/lib/i18n";
import { requireUser } from "@/lib/auth";
import { num } from "@/lib/money";
import { PageHeader, Section } from "@/components/ui";
import { UserForm } from "./UserForm";

export const dynamic = "force-dynamic";

const ORDER = ["ADMIN", "MANAGER", "CLEANER", "OWNER"] as const;

export default async function UsersPage() {
  const me = await requireUser(["ADMIN"]);
  const { t } = await getT();
  const users = await db.user.findMany({ orderBy: { name: "asc" }, include: { _count: { select: { ownedProperties: true } } } });
  const tt = { users: t.users, roles: t.roles, common: t.common };
  return (
    <>
      <PageHeader title={t.users.title} subtitle={`${users.length}`} />
      <div className="space-y-6">
        <Section title={t.users.new}>
          <UserForm u={{}} t={tt} />
        </Section>
        {ORDER.map((role) => {
          const list = users.filter((u) => u.role === role);
          if (!list.length) return null;
          return (
            <Section key={role} title={`${t.roles[role]} · ${list.length}`}>
              <div className="space-y-4 divide-y divide-line">
                {list.map((u) => (
                  <div key={u.id} className="pt-4 first:pt-0">
                    <UserForm
                      self={u.id === me.id}
                      t={tt}
                      u={{ id: u.id, name: u.name, email: u.email, phone: u.phone, role: u.role, active: u.active, commissionRate: num(u.commissionRate) }}
                    />
                    {role === "OWNER" && <p className="text-xs text-muted mt-1">{u._count.ownedProperties} {t.common.properties.toLowerCase()}</p>}
                  </div>
                ))}
              </div>
            </Section>
          );
        })}
      </div>
    </>
  );
}
