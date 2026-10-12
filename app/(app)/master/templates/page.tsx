import Link from "next/link";
import { Suspense } from "react";
import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { Card, PageHeader } from "@/components/ui";
import { TemplateEditor } from "./template-editor";

export default function TemplatesPage() {
  return (
    <>
      <PageHeader title="Templates" />
      <Suspense fallback={<p className="text-zinc-500">Loading templates…</p>}>
        <Templates />
      </Suspense>
    </>
  );
}

async function Templates() {
  await requireProfile("qa");
  const supabase = await createClient();
  const { data, error } = await supabase.from("templates").select("id, name, active, template_versions(version)").order("name");
  if (error) throw new Error(`Could not load templates: ${error.message}`);
  const rows = (data ?? []) as unknown as { id: number; name: string; active: boolean; template_versions: { version: number }[] }[];

  return (
    <>
      <ul className="divide-y divide-zinc-200 rounded-xl border border-zinc-200 dark:divide-zinc-800 dark:border-zinc-800">
        {rows.length === 0 && <li className="p-4 text-zinc-500">No templates yet.</li>}
        {rows.map((t) => (
          <li key={t.id} className="flex items-center justify-between p-3">
            <Link href={`/master/templates/${t.id}`} className="underline">{t.name}</Link>
            <span className="text-sm text-zinc-500">
              v{Math.max(0, ...t.template_versions.map((v) => v.version))}{t.active ? "" : " · inactive"}
            </span>
          </li>
        ))}
      </ul>
      <Card title="New template">
        <TemplateEditor templateId={null} name="" items={[]} characteristics={[]} />
      </Card>
    </>
  );
}
