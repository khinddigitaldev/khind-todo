import { notFound } from "next/navigation";
import { Suspense } from "react";
import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { Card, PageHeader } from "@/components/ui";
import type { DefectClass } from "@/lib/iqc/types";
import { TemplateEditor } from "../template-editor";

export default function TemplatePage({ params }: PageProps<"/master/templates/[id]">) {
  return (
    <Suspense fallback={<p className="text-zinc-500">Loading template…</p>}>
      <Template params={params} />
    </Suspense>
  );
}

const str = (v: unknown) => (v === null || v === undefined ? "" : String(v));

async function Template({ params }: { params: PageProps<"/master/templates/[id]">["params"] }) {
  await requireProfile("qa");
  const { id } = await params;
  if (!/^\d+$/.test(id)) notFound();
  const supabase = await createClient();
  const { data: template } = await supabase.from("templates").select("id, name").eq("id", Number(id)).maybeSingle();
  if (!template) notFound();
  const { data: version } = await supabase
    .from("template_versions")
    .select("id, version, created_at")
    .eq("template_id", template.id)
    .order("version", { ascending: false })
    .limit(1)
    .maybeSingle();
  const [items, chars] = version
    ? await Promise.all([
        supabase.from("template_items").select("section, text").eq("version_id", version.id).order("position"),
        supabase.from("template_characteristics").select("name, nominal, min_value, max_value, unit, defect_class").eq("version_id", version.id).order("position"),
      ])
    : [{ data: [] }, { data: [] }];

  return (
    <>
      <PageHeader title={template.name} />
      <p className="text-sm text-zinc-500">
        {version
          ? `Version ${version.version} · created ${new Date(version.created_at).toLocaleDateString("en-MY")}. Saving creates version ${version.version + 1}. Inspections already started keep the version they used.`
          : "No versions yet."}
      </p>
      <Card>
        <TemplateEditor
          templateId={template.id}
          name={template.name}
          items={(items.data ?? []) as { section: string; text: string }[]}
          characteristics={((chars.data ?? []) as Record<string, unknown>[]).map((c) => ({
            name: str(c.name),
            nominal: str(c.nominal),
            min: str(c.min_value),
            max: str(c.max_value),
            unit: str(c.unit),
            defectClass: c.defect_class as DefectClass,
          }))}
        />
      </Card>
    </>
  );
}
