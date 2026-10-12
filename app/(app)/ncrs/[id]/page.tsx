import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { ncrAgeDays } from "@/lib/iqc/metrics";
import { DISPOSITION_LABELS } from "@/lib/iqc/types";
import { Badge, Card, NCR_TONE, PageHeader } from "@/components/ui";
import type { NcrListRow } from "../page";
import { NcrForm } from "./ncr-form";

type NcrDetail = NcrListRow & { rma_no: string | null; supplier_response: string | null };

// Request-time only (the page awaits connection() first).
function ageOf(n: NcrDetail) {
  return ncrAgeDays(n.created_at, n.closed_at, new Date());
}

export default function NcrPage({ params }: PageProps<"/ncrs/[id]">) {
  return (
    <Suspense fallback={<p className="text-zinc-500">Loading NCR…</p>}>
      <Ncr params={params} />
    </Suspense>
  );
}

async function Ncr({ params }: { params: PageProps<"/ncrs/[id]">["params"] }) {
  const profile = await requireProfile();
  await connection();
  const { id } = await params;
  if (!/^\d+$/.test(id)) notFound();
  const supabase = await createClient();
  const { data } = await supabase
    .from("ncrs")
    .select(`id, number, status, disposition, qty_affected, summary, scar_no, rma_no, supplier_response, created_at, closed_at,
      inspection:inspections(id, number, supplier:suppliers(name), part:parts(part_no))`)
    .eq("id", Number(id))
    .maybeSingle();
  if (!data) notFound();
  const n = data as unknown as NcrDetail;
  const canEdit = profile.role === "purchasing" || profile.role === "qa";

  return (
    <>
      <PageHeader title={n.number}>
        <Badge tone={NCR_TONE[n.status] ?? "gray"}>{n.status.replace("_", " ")}</Badge>
      </PageHeader>
      <Card title="Summary">
        <dl className="grid gap-3 text-sm sm:grid-cols-3">
          <div><dt className="text-xs text-zinc-500">Age</dt><dd>{ageOf(n)} days</dd></div>
          <div><dt className="text-xs text-zinc-500">Disposition</dt><dd>{DISPOSITION_LABELS[n.disposition]}</dd></div>
          <div><dt className="text-xs text-zinc-500">Quantity affected</dt><dd>{n.qty_affected}</dd></div>
          <div><dt className="text-xs text-zinc-500">Supplier</dt><dd>{n.inspection?.supplier?.name}</dd></div>
          <div><dt className="text-xs text-zinc-500">Part</dt><dd>{n.inspection?.part?.part_no}</dd></div>
          <div>
            <dt className="text-xs text-zinc-500">Inspection</dt>
            <dd>{n.inspection && <Link href={`/inspections/${n.inspection.id}`} className="underline">{n.inspection.number}</Link>}</dd>
          </div>
          <div className="sm:col-span-3"><dt className="text-xs text-zinc-500">Defects</dt><dd>{n.summary}</dd></div>
        </dl>
      </Card>
      <Card title="Supplier follow-up">
        {canEdit ? (
          <NcrForm ncr={n} />
        ) : (
          <dl className="grid gap-3 text-sm sm:grid-cols-2">
            <div><dt className="text-xs text-zinc-500">SCAR no.</dt><dd>{n.scar_no ?? "—"}</dd></div>
            <div><dt className="text-xs text-zinc-500">RMA no.</dt><dd>{n.rma_no ?? "—"}</dd></div>
            <div className="sm:col-span-2"><dt className="text-xs text-zinc-500">Supplier response</dt><dd>{n.supplier_response ?? "—"}</dd></div>
          </dl>
        )}
      </Card>
    </>
  );
}
