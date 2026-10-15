import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";
import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { ncrAgeDays } from "@/lib/iqc/metrics";
import { ACTION_LABELS, DECISION_LABELS, type LotAction, type LotDecision } from "@/lib/iqc/types";
import { Badge, MDR_TONE, PageHeader } from "@/components/ui";

export type MdrListRow = {
  id: number; number: string; status: string; lot_decision: LotDecision; lot_action: LotAction; qty_affected: number; summary: string;
  scar_no: string | null; created_at: string; closed_at: string | null;
  inspection: { id: number; number: string; supplier: { name: string } | null; part: { part_no: string } | null } | null;
};

const FILTERS = [
  { key: "", label: "Open & waiting" },
  { key: "closed", label: "Closed" },
  { key: "all", label: "All" },
];

// Request-time only (the list awaits connection() first).
function age(r: MdrListRow) {
  return ncrAgeDays(r.created_at, r.closed_at, new Date());
}

export default function MdrsPage({ searchParams }: PageProps<"/mdrs">) {
  return (
    <>
      <PageHeader title="Material Discrepancy Reports (MDR)" />
      <Suspense fallback={<p className="text-zinc-500">Loading MDRs…</p>}>
        <List searchParams={searchParams} />
      </Suspense>
    </>
  );
}

async function List({ searchParams }: { searchParams: PageProps<"/mdrs">["searchParams"] }) {
  await requireProfile();
  await connection();
  const { status } = await searchParams;
  const filter = typeof status === "string" ? status : "";
  const supabase = await createClient();
  let q = supabase
    .from("mdrs")
    .select(`id, number, status, lot_decision, lot_action, qty_affected, summary, scar_no, created_at, closed_at,
      inspection:inspections(id, number, supplier:suppliers(name), part:parts(part_no))`)
    .order("created_at", { ascending: true });
  if (filter === "closed") q = q.eq("status", "closed");
  else if (filter !== "all") q = q.neq("status", "closed");
  const { data, error } = await q;
  if (error) throw new Error(`Could not load MDRs: ${error.message}`);
  const rows = (data ?? []) as unknown as MdrListRow[];

  return (
    <>
      <div className="flex gap-2">
        {FILTERS.map((f) => (
          <Link key={f.key} href={f.key ? `/mdrs?status=${f.key}` : "/mdrs"}
            className={`flex min-h-11 items-center rounded-lg px-3 text-sm ${filter === f.key ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900" : "border border-zinc-300 dark:border-zinc-700"}`}>
            {f.label}
          </Link>
        ))}
      </div>
      {rows.length === 0 ? (
        <p className="text-zinc-500">No MDRs here.</p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-zinc-200 dark:border-zinc-800">
          <table className="w-full min-w-[760px] text-sm">
            <thead className="bg-zinc-50 text-left text-zinc-500 dark:bg-zinc-900">
              <tr><th className="p-3">MDR</th><th className="p-3">Age</th><th className="p-3">Supplier</th><th className="p-3">Part</th><th className="p-3">Inspection</th><th className="p-3">Decision / action</th><th className="p-3">SCAR</th><th className="p-3">Status</th></tr>
            </thead>
            <tbody>
              {rows.map((r) => {
                const days = age(r);
                return (
                  <tr key={r.id} className="border-t border-zinc-200 dark:border-zinc-800">
                    <td className="p-3"><Link href={`/mdrs/${r.id}`} className="font-mono underline">{r.number}</Link></td>
                    <td className={`p-3 ${days > 14 && r.status !== "closed" ? "font-semibold text-red-600" : ""}`}>{days} d</td>
                    <td className="p-3">{r.inspection?.supplier?.name}</td>
                    <td className="p-3 font-mono">{r.inspection?.part?.part_no}</td>
                    <td className="p-3">{r.inspection && <Link href={`/inspections/${r.inspection.id}`} className="underline">{r.inspection.number}</Link>}</td>
                    <td className="p-3">{DECISION_LABELS[r.lot_decision]} / {ACTION_LABELS[r.lot_action]}</td>
                    <td className="p-3">{r.scar_no ?? "—"}</td>
                    <td className="p-3"><Badge tone={MDR_TONE[r.status] ?? "gray"}>{r.status.replace("_", " ")}</Badge></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
