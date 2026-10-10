import { Check } from "lucide-react";
import { getT } from "@/lib/i18n";
import { OwnerLeadForm } from "./OwnerLeadForm";

export const metadata = { title: "Shto pronën tënde" };

export default async function JoinPage() {
  const { t } = await getT();
  return (
    <div className="mx-auto max-w-6xl px-4 md:px-8 pt-12 md:pt-20 grid md:grid-cols-2 gap-12 md:gap-20">
      <div>
        <p className="eyebrow mb-4">{t.public.listYourProperty}</p>
        <h1 className="text-4xl md:text-5xl font-semibold tracking-tight leading-[1.05]">{t.public.joinTitle}</h1>
        <p className="text-lg text-muted mt-5 leading-relaxed">{t.public.joinSubtitle}</p>
        <ul className="mt-10 space-y-4">
          {t.public.joinBenefits.map((b) => (
            <li key={b} className="flex gap-3">
              <span className="grid place-items-center size-6 rounded-full bg-ink text-white shrink-0">
                <Check className="size-3.5" />
              </span>
              {b}
            </li>
          ))}
        </ul>
      </div>
      <OwnerLeadForm
        labels={{
          name: t.common.name,
          phone: t.common.phone,
          email: `${t.common.email} (${t.common.optional})`,
          type: t.propertyAdmin.type,
          location: t.public.joinLocation,
          message: t.public.message,
          send: t.common.send,
          sent: t.public.joinSent,
        }}
        types={Object.entries(t.propertyTypes)}
      />
    </div>
  );
}
