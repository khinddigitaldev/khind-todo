import { notFound } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import { requireProfile } from "@/lib/auth";
import { loadInspection } from "@/lib/iqc/load";
import { InspectionView } from "../inspection-view";
import { PrintButton } from "./print-button";

// Request-time only (the page awaits connection() first).
function printedAt() {
  return new Date().toLocaleString("en-MY", { timeZone: "Asia/Kuala_Lumpur" });
}

export default function PrintPage({ params }: PageProps<"/inspections/[id]/print">) {
  return (
    <Suspense fallback={<p className="text-zinc-500">Preparing report…</p>}>
      <Report params={params} />
    </Suspense>
  );
}

async function Report({ params }: { params: PageProps<"/inspections/[id]/print">["params"] }) {
  const profile = await requireProfile();
  await connection();
  const { id } = await params;
  if (!/^\d+$/.test(id)) notFound();
  const b = await loadInspection(Number(id));
  if (!b) notFound();
  return (
    <div className="flex flex-col gap-4">
      <PrintButton />
      <div>
        <h1 className="text-2xl font-semibold">Incoming Quality Inspection Report — {b.number}</h1>
        <p className="text-sm text-zinc-500">Printed {printedAt()} by {profile.fullName}</p>
      </div>
      <InspectionView b={b} />
      <p className="text-xs text-zinc-500">KHIND IQC demo · fictional data</p>
    </div>
  );
}
