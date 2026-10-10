import { db } from "@/lib/db";
import { getT } from "@/lib/i18n";
import { PageHeader, Section } from "@/components/ui";
import { SubmitButton } from "@/components/client";
import { deleteTemplate, saveTemplate } from "./actions";

export const dynamic = "force-dynamic";

export default async function MessagesPage() {
  const { t } = await getT();
  const templates = await db.messageTemplate.findMany({ orderBy: { name: "asc" } });
  const m = t.messagesAdmin;
  const form = (tpl?: (typeof templates)[number]) => (
    <form action={saveTemplate} className="space-y-3">
      {tpl && <input type="hidden" name="id" value={tpl.id} />}
      <input name="name" required defaultValue={tpl?.name} placeholder={t.common.name} className="input font-medium" />
      <div className="grid md:grid-cols-2 gap-3">
        <label>
          <span className="label">{m.bodySq}</span>
          <textarea name="bodySq" rows={7} defaultValue={tpl?.bodySq} className="input font-mono text-xs" />
        </label>
        <label>
          <span className="label">{m.bodyEn}</span>
          <textarea name="bodyEn" rows={7} defaultValue={tpl?.bodyEn} className="input font-mono text-xs" />
        </label>
      </div>
      <div className="flex gap-2">
        <SubmitButton>{tpl ? t.common.save : `+ ${t.common.add}`}</SubmitButton>
      </div>
    </form>
  );
  return (
    <>
      <PageHeader title={m.title} subtitle={m.help} />
      <div className="space-y-4">
        {templates.map((tpl) => (
          <Section
            key={tpl.id}
            actions={
              <form action={deleteTemplate.bind(null, tpl.id)}>
                <SubmitButton className="btn-ghost btn-sm text-red-600" confirm={`${t.common.delete}?`}>
                  {t.common.delete}
                </SubmitButton>
              </form>
            }
            title={tpl.name}
          >
            {form(tpl)}
          </Section>
        ))}
        <Section title={`+ ${t.common.add}`}>{form()}</Section>
      </div>
    </>
  );
}
