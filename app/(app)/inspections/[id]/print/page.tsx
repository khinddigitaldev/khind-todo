import { notFound } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import { requireProfile } from "@/lib/auth";
import { loadInspection } from "@/lib/iqc/load";
import { AuditTrail } from "../audit-trail";
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
      <table className="w-full border border-zinc-800 text-center">
        <tbody>
          <tr><td className="border-b border-zinc-800 p-2 font-semibold">KHIND MISTRAL INDUSTRIES SDN BHD &nbsp;·&nbsp; QC DEPARTMENT</td></tr>
          <tr><td className="p-2 text-lg font-bold">INCOMING INSPECTION REPORT (IQC) — {b.number}</td></tr>
        </tbody>
      </table>
      <p className="text-xs text-zinc-500">
        One report per incoming lot · printed {printedAt()} by {profile.fullName} · demo system, fictional data
      </p>
      <InspectionView b={b} />
      <div className="break-before-page">
        <AuditTrail inspectionId={b.id} title="REVIEW & APPROVAL LOG" />
      </div>
      <div className="flex justify-between border-t border-zinc-800 pt-1 text-xs">
        <span>Combines QSP-18-1 (F1-4) to (F1-17) Rev.00 &amp; QSP-16-1 (F1) Rev.04</span>
        <span>QSP-18-1 (F1-12) Incoming Inspection Report – combined</span>
      </div>
    </div>
  );
}
