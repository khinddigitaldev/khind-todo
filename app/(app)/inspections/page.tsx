import Link from "next/link";
import { Suspense } from "react";
import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { parseListFilters } from "@/lib/iqc/filters";
import { Badge, PageHeader, STATUS_TONE, buttonClass, inputClass } from "@/components/ui";

type ListRow = {
  id: number; number: string; status: string; verdict: string | null; lot_decision: string | null; lot_action: string | null;
  qty_received: number; received_at: string; lot_no: string | null;
  supplier: { name: string } | null; part: { part_no: string } | null; inspector: { full_name: string } | null;
};

export default function InspectionsPage({ searchParams }: PageProps<"/inspections">) {
  return (
    <Suspense fallback={<p className="text-zinc-500">Loading inspections…</p>}>
      <List searchParams={searchParams} />
    </Suspense>
  );
}

async function List({ searchParams }: { searchParams: PageProps<"/inspections">["searchParams"] }) {
  const profile = await requireProfile();
  const sp = await searchParams;
  const f = parseListFilters(sp);
  const supabase = await createClient();
  let q = supabase
    .from("inspections")
    .select(`id, number, status, verdict, lot_decision, lot_action, qty_received, received_at, lot_no,
      supplier:suppliers(name), part:parts(part_no), inspector:profiles!inspections_inspector_id_fkey(full_name)`)
    .order("received_at", { ascending: false })
    .limit(200);
  if (f.status) q = q.eq("status", f.status);
  if (f.supplierId) q = q.eq("supplier_id", f.supplierId);
  if (f.decision) q = q.eq("lot_decision", f.decision);
  if (f.from) q = q.gte("received_at", `${f.from}T00:00:00+08:00`);
  if (f.to) q = q.lte("received_at", `${f.to}T23:59:59.999+08:00`);
  if (f.mine) q = q.eq("inspector_id", profile.id);
  const [{ data, error }, { data: suppliers }] = await Promise.all([q, supabase.from("suppliers").select("id, name").order("name")]);
  if (error) throw new Error(`Could not load inspections: ${error.message}`);
  const rows = (data ?? []) as unknown as ListRow[];
  const canCreate = profile.role === "inspector" || profile.role === "qa";
  const exportParams = new URLSearchParams(
    Object.entries(sp).filter((e): e is [string, string] => typeof e[1] === "string"),
  );

  return (
    <>
      <PageHeader title="Inspections">
        <div className="flex gap-2">
          <a href={`/api/inspections/export?${exportParams}`} className={buttonClass.secondary}>Export CSV</a>
          {canCreate && <Link href="/inspections/new" className={buttonClass.primary}>New inspection</Link>}
        </div>
      </PageHeader>
      <form className="grid gap-2 sm:grid-cols-6">
        <select name="status" defaultValue={f.status ?? ""} aria-label="Status" className={inputClass}>
          <option value="">All statuses</option>
          {["draft", "submitted", "returned", "approved"].map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
        <select name="supplier" defaultValue={f.supplierId ?? ""} aria-label="Supplier" className={inputClass}>
          <option value="">All suppliers</option>
          {((suppliers ?? []) as { id: number; name: string }[]).map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
        <select name="decision" defaultValue={f.decision ?? ""} aria-label="Lot decision" className={inputClass}>
          <option value="">Any decision</option>
          {["accept", "reject", "others"].map((d) => <option key={d} value={d}>{d.toUpperCase()}</option>)}
        </select>
        <input type="date" name="from" defaultValue={f.from} aria-label="Received from" className={inputClass} />
        <input type="date" name="to" defaultValue={f.to} aria-label="Received to" className={inputClass} />
        <button className={buttonClass.secondary}>Filter</button>
      </form>
      <div className="overflow-x-auto rounded-xl border border-zinc-200 dark:border-zinc-800">
        <table className="w-full min-w-[760px] text-sm">
          <thead className="bg-zinc-50 text-left text-zinc-500 dark:bg-zinc-900">
            <tr>
              <th className="p-3">No.</th><th className="p-3">Received</th><th className="p-3">Supplier</th><th className="p-3">Part</th>
              <th className="p-3">Lot / qty</th><th className="p-3">Inspector</th><th className="p-3">Status</th><th className="p-3">Result</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && <tr><td colSpan={8} className="p-6 text-center text-zinc-500">No inspections match these filters.</td></tr>}
            {rows.map((r) => (
              <tr key={r.id} className="border-t border-zinc-200 dark:border-zinc-800">
                <td className="p-3"><Link href={`/inspections/${r.id}`} className="font-mono underline">{r.number}</Link></td>
                <td className="p-3">{new Date(r.received_at).toLocaleDateString("en-MY")}</td>
                <td className="p-3">{r.supplier?.name}</td>
                <td className="p-3 font-mono">{r.part?.part_no}</td>
                <td className="p-3">{r.lot_no ?? "—"} / {r.qty_received}</td>
                <td className="p-3">{r.inspector?.full_name}</td>
                <td className="p-3"><Badge tone={STATUS_TONE[r.status] ?? "gray"}>{r.status}</Badge></td>
                <td className="p-3">
                  {r.lot_decision ? `${r.lot_decision.toUpperCase()} / ${(r.lot_action ?? "").replace("_", " ").toUpperCase()}` : (r.verdict ? <Badge tone={r.verdict === "reject" ? "red" : "green"}>{r.verdict}</Badge> : "—")}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
