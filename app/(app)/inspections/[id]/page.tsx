import { notFound } from "next/navigation";
import { Suspense } from "react";
import { requireProfile } from "@/lib/auth";
import { loadInspection } from "@/lib/iqc/load";
import { Badge, Notice, PageHeader, STATUS_TONE } from "@/components/ui";
import { InspectionForm } from "./inspection-form";

export default function InspectionPage({ params }: PageProps<"/inspections/[id]">) {
  return (
    <Suspense fallback={<p className="text-zinc-500">Loading inspection…</p>}>
      <Inspection params={params} />
    </Suspense>
  );
}

async function Inspection({ params }: { params: PageProps<"/inspections/[id]">["params"] }) {
  const profile = await requireProfile();
  const { id } = await params;
  if (!/^\d+$/.test(id)) notFound();
  const b = await loadInspection(Number(id));
  if (!b) notFound();
  const editable =
    b.inspector.id === profile.id && (b.status === "draft" || b.status === "returned") && (profile.role === "inspector" || profile.role === "qa");

  return (
    <>
      <PageHeader title={`${b.number} · ${b.part.partNo}`}>
        <Badge tone={STATUS_TONE[b.status]}>{b.status}</Badge>
      </PageHeader>
      <p className="text-sm text-zinc-500">
        {b.supplier.name} · {b.part.name} · template {b.templateName} v{b.templateVersion} · inspector {b.inspector.name}
      </p>
      {editable ? (
        <InspectionForm b={b} />
      ) : (
        <Notice tone="blue">This inspection is {b.status}. The full read-only view arrives in Task 15.</Notice>
      )}
    </>
  );
}
