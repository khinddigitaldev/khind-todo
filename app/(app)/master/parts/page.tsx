import Link from "next/link";
import { Suspense } from "react";
import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { Badge, Card, PageHeader } from "@/components/ui";
import { PartForm, type PartRow } from "./part-form";

const TYPE_LABEL: Record<string, string> = { sampling: "Sampling", full: "100%", none: "No inspection" };

export default function PartsPage({ searchParams }: PageProps<"/master/parts">) {
  return (
    <>
      <PageHeader title="Parts" />
      <Suspense fallback={<p className="text-zinc-500">Loading parts…</p>}>
        <Parts searchParams={searchParams} />
      </Suspense>
    </>
  );
}

async function Parts({ searchParams }: { searchParams: PageProps<"/master/parts">["searchParams"] }) {
  const profile = await requireProfile();
  const { edit } = await searchParams;
  const supabase = await createClient();
  const [parts, templates] = await Promise.all([
    supabase
      .from("parts")
      .select("id, part_no, name, category, drawing_no, drawing_rev, regulated, template_id, inspection_type, active, templates(name)")
      .order("part_no"),
    supabase.from("templates").select("id, name").eq("active", true).order("name"),
  ]);
  if (parts.error) throw new Error(`Could not load parts: ${parts.error.message}`);
  if (templates.error) throw new Error(`Could not load templates: ${templates.error.message}`);
  const rows = (parts.data ?? []) as unknown as (PartRow & { templates: { name: string } | null })[];
  const editing = rows.find((p) => String(p.id) === edit);
  const isQa = profile.role === "qa";

  return (
    <>
      {isQa && (
        <Card title={editing ? `Edit ${editing.part_no}` : "Add a part"}>
          <PartForm part={editing} templates={templates.data ?? []} />
          {editing && <Link href="/master/parts" className="mt-3 inline-block text-sm underline">Cancel edit</Link>}
        </Card>
      )}
      <div className="overflow-x-auto rounded-xl border border-zinc-200 dark:border-zinc-800">
        <table className="w-full min-w-[760px] text-sm">
          <thead className="bg-zinc-50 text-left text-zinc-500 dark:bg-zinc-900">
            <tr>
              <th className="p-3">Part no.</th><th className="p-3">Name</th><th className="p-3">Category</th><th className="p-3">Template</th>
              <th className="p-3">Type</th><th className="p-3">Regulated</th><th className="p-3">Active</th>{isQa && <th />}
            </tr>
          </thead>
          <tbody>
            {rows.map((p) => (
              <tr key={p.id} className="border-t border-zinc-200 dark:border-zinc-800">
                <td className="p-3 font-mono">{p.part_no}</td>
                <td className="p-3">{p.name}</td>
                <td className="p-3">{p.category ?? "—"}</td>
                <td className="p-3">{p.templates?.name ?? "—"}</td>
                <td className="p-3">{TYPE_LABEL[p.inspection_type] ?? p.inspection_type}</td>
                <td className="p-3">{p.regulated ? <Badge tone="amber">Regulated</Badge> : "—"}</td>
                <td className="p-3">{p.active ? "Yes" : "No"}</td>
                {isQa && <td className="p-3"><Link href={`/master/parts?edit=${p.id}`} className="underline">Edit</Link></td>}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
