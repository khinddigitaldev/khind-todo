import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";
import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { Badge, PageHeader } from "@/components/ui";

type Row = {
  id: number; number: string; submitted_at: string; verdict: string | null; qty_received: number;
  supplier: { name: string } | null; part: { part_no: string } | null; inspector: { id: string; full_name: string } | null;
};

// Request-time only (the page awaits connection() first).
function waitingHours(iso: string) {
  return Math.round((Date.now() - Date.parse(iso)) / 3_600_000);
}

export default function ApprovalsPage() {
  return (
    <>
      <PageHeader title="Waiting for approval" />
      <Suspense fallback={<p className="text-zinc-500">Loading…</p>}>
        <Queue />
      </Suspense>
    </>
  );
}

async function Queue() {
  const me = await requireProfile("qa");
  await connection();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("inspections")
    .select(`id, number, submitted_at, verdict, qty_received, supplier:suppliers(name), part:parts(part_no),
      inspector:profiles!inspections_inspector_id_fkey(id, full_name)`)
    .eq("status", "submitted")
    .order("submitted_at", { ascending: true });
  if (error) throw new Error(`Could not load the queue: ${error.message}`);
  const rows = (data ?? []) as unknown as Row[];
  if (!rows.length) return <p className="text-zinc-500">Nothing waiting for approval.</p>;

  return (
    <div className="overflow-x-auto rounded-xl border border-zinc-200 dark:border-zinc-800">
      <table className="w-full min-w-[640px] text-sm">
        <thead className="bg-zinc-50 text-left text-zinc-500 dark:bg-zinc-900">
          <tr><th className="p-3">No.</th><th className="p-3">Waiting</th><th className="p-3">Supplier</th><th className="p-3">Part</th><th className="p-3">Qty</th><th className="p-3">Inspector</th><th className="p-3">Verdict</th></tr>
        </thead>
        <tbody>
          {rows.map((r) => {
            const mine = r.inspector?.id === me.id;
            return (
              <tr key={r.id} className={`border-t border-zinc-200 dark:border-zinc-800 ${mine ? "text-zinc-400" : ""}`}>
                <td className="p-3"><Link href={`/inspections/${r.id}`} className="font-mono underline">{r.number}</Link></td>
                <td className="p-3">{waitingHours(r.submitted_at)} h</td>
                <td className="p-3">{r.supplier?.name}</td>
                <td className="p-3 font-mono">{r.part?.part_no}</td>
                <td className="p-3">{r.qty_received}</td>
                <td className="p-3">{r.inspector?.full_name}{mine && " (yours — another QA must decide)"}</td>
                <td className="p-3">{r.verdict ? <Badge tone={r.verdict === "reject" ? "red" : "green"}>{r.verdict}</Badge> : "—"}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
