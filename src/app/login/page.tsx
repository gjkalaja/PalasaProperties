import Link from "next/link";
import { getT } from "@/lib/i18n";
import { LanguageSwitch } from "@/components/LanguageSwitch";
import { LoginForm } from "./LoginForm";

export const metadata = { title: "Hyr" };

export default async function LoginPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sp = await searchParams;
  const { t, locale } = await getT();
  return (
    <div className="min-h-dvh grid md:grid-cols-2">
      <div className="hidden md:block relative bg-neutral-100 overflow-hidden">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/demo/p4-2.svg" alt="" className="absolute inset-0 size-full object-cover" />
        <div className="absolute bottom-10 left-10 right-10 text-white drop-shadow">
          <div className="text-3xl font-semibold tracking-tight">{t.brand}</div>
          <div className="opacity-90">{t.public.footerNote}</div>
        </div>
      </div>
      <div className="flex flex-col p-6 md:p-12">
        <div className="flex justify-between items-center">
          <Link href="/" className="text-sm text-muted hover:text-ink">← {t.nav.publicSite}</Link>
          <LanguageSwitch locale={locale} />
        </div>
        <div className="flex-1 grid place-items-center">
          <div className="w-full max-w-sm">
            <h1 className="text-3xl font-semibold tracking-tight">{t.login.title}</h1>
            <p className="text-muted mt-2 mb-8">{t.login.subtitle}</p>
            {sp.error === "forbidden" && <p className="text-sm text-red-600 mb-4">{t.login.forbidden}</p>}
            <LoginForm
              next={sp.next ?? ""}
              labels={{ email: t.common.email, password: t.common.password, submit: t.common.login, invalid: t.login.invalid }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
