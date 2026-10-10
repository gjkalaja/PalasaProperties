import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { SubmitButton } from "@/components/client";
import { installDemo } from "./actions";
import { AdminForm } from "./AdminForm";

export const dynamic = "force-dynamic";
export const maxDuration = 300;
export const metadata = { title: "Instalimi" };

export default async function SetupPage() {
  if ((await db.user.count()) > 0) redirect("/login");
  return (
    <div className="min-h-dvh grid place-items-center bg-paper p-4">
      <div className="w-full max-w-3xl">
        <h1 className="text-3xl font-semibold tracking-tight">Mirë se vini në Palasa Properties</h1>
        <p className="text-muted mt-2 mb-8">Baza e të dhënave është bosh. Zgjidhni si të filloni. Kjo faqe funksionon vetëm një herë.</p>
        <div className="grid md:grid-cols-2 gap-4">
          <div className="card p-6">
            <h2 className="font-semibold">Me të dhëna demo</h2>
            <p className="text-sm text-muted mt-1 mb-5">
              22 prona, rezervime, mysafirë, detyra dhe llogari për çdo rol. Ideale për testim. Zgjat rreth 1 minutë.
            </p>
            <form action={installDemo}>
              <SubmitButton className="btn-primary w-full">Krijo të dhënat demo</SubmitButton>
            </form>
          </div>
          <div className="card p-6">
            <h2 className="font-semibold">Fillim i pastër</h2>
            <p className="text-sm text-muted mt-1 mb-5">Krijoni vetëm llogarinë tuaj të administratorit dhe shtoni pronat reale.</p>
            <AdminForm />
          </div>
        </div>
      </div>
    </div>
  );
}
