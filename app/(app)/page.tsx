import Link from "next/link";
import { connection } from "next/server";
import { Suspense, type ReactNode } from "react";
import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { computeMetrics, supplierBreakdown, type LotRow } from "@/lib/iqc/metrics";
import { resolvePeriod } from "@/lib/iqc/periods";
import type { Disposition } from "@/lib/iqc/types";
import { backupStatus } from "@/lib/iqc/usage";
import { Notice, PageHeader, buttonClass, inputClass } from "@/components/ui";

type Approved = {
  disposition: Disposition; sample_size: number; received_at: string; approved_at: string; supplier_id: number;
  supplier: { name: string } | null; inspection_defects: { found: number | null }[];
};

export default function DashboardPage({ searchParams }: PageProps<"/">) {
  return (
    <>
      <Suspense>
        <Denied searchParams={searchParams} />
      </Suspense>
      <Suspense fallback={<p className="text-zinc-500">Loading dashboard…</p>}>
        <Dashboard searchParams={searchParams} />
      </Suspense>
    </>
  );
}

async function Denied({ searchParams }: { searchParams: PageProps<"/">["searchParams"] }) {
  const { denied } = await searchParams;
  return denied ? <Notice tone="amber">You don&apos;t have access to that page.</Notice> : null;
}

function Tile({ label, value, sub, href, danger }: { label: string; value: ReactNode; sub?: string; href?: string; danger?: boolean }) {
  const body = (
    <div className={`flex h-full flex-col gap-1 rounded-xl border p-4 ${danger ? "border-red-300 bg-red-50 dark:border-red-900 dark:bg-red-950" : "border-zinc-200 dark:border-zinc-800"}`}>
      <span className="text-sm text-zinc-500">{label}</span>
      <span className="text-2xl font-semibold">{value}</span>
      {sub && <span className="text-xs text-zinc-500">{sub}</span>}
    </div>
  );
  return href ? <Link href={href} className="hover:opacity-80">{body}</Link> : body;
}

// Request-time only (the page awaits connection() first).
const nowDate = () => new Date();

async function Dashboard({ searchParams }: { searchParams: PageProps<"/">["searchParams"] }) {
  const profile = await requireProfile();
  await connection();
  const sp = await searchParams;
  const one = (v: string | string[] | undefined) => (typeof v === "string" ? v : undefined);
  const period = resolvePeriod({ period: one(sp.period), from: one(sp.from), to: one(sp.to) }, nowDate());
  const supabase = await createClient();

  const [approved, pending, openNcrs, latestBackup] = await Promise.all([
    supabase
      .from("inspections")
      .select("disposition, sample_size, received_at, approved_at, supplier_id, supplier:suppliers(name), inspection_defects(found)")
      .eq("status", "approved")
      .gte("received_at", period.fromIso)
      .lt("received_at", period.toIso),
    supabase.from("inspections").select("id", { count: "exact", head: true }).eq("status", "submitted"),
    supabase.from("ncrs").select("id, inspection:inspections(supplier_id)").neq("status", "closed"),
    supabase.from("backups").select("at").order("at", { ascending: false }).limit(1).maybeSingle(),
  ]);
  if (approved.error) throw new Error(`Could not load the dashboard: ${approved.error.message}`);

  const rows: LotRow[] = ((approved.data ?? []) as unknown as Approved[]).map((r) => ({
    supplierId: r.supplier_id,
    supplierName: r.supplier?.name ?? "?",
    disposition: r.disposition,
    unitsInspected: r.sample_size,
    defectiveFound: r.inspection_defects.reduce((s, d) => s + (d.found ?? 0), 0),
    receivedAt: r.received_at,
    approvedAt: r.approved_at,
  }));
  const m = computeMetrics(rows);
  const suppliers = supplierBreakdown(rows);
  const ncrRows = (openNcrs.data ?? []) as unknown as { inspection: { supplier_id: number } | null }[];
  const ncrBySupplier = new Map<number, number>();
  for (const n of ncrRows) {
    const id = n.inspection?.supplier_id;
    if (id) ncrBySupplier.set(id, (ncrBySupplier.get(id) ?? 0) + 1);
  }
  const backup = backupStatus((latestBackup.data as { at: string } | null)?.at ?? null, nowDate());
  const range = `from=${period.fromDate}&to=${period.toDate}`;
  const canSeeBackup = profile.role === "admin" || profile.role === "qa";

  return (
    <>
      <PageHeader title={`Dashboard · ${period.label}`}>
        <div className="flex flex-wrap items-center gap-2">
          {[
            ["this-month", "This month"],
            ["last-month", "Last month"],
            ["90d", "Last 90 days"],
          ].map(([key, label]) => (
            <Link key={key} href={`/?period=${key}`} className={period.key === key ? buttonClass.primary : buttonClass.secondary}>{label}</Link>
          ))}
          <form className="flex items-center gap-1">
            <input type="hidden" name="period" value="custom" />
            <input type="date" name="from" aria-label="From" defaultValue={period.key === "custom" ? period.fromDate : ""} className={`${inputClass} w-40`} />
            <input type="date" name="to" aria-label="To" defaultValue={period.key === "custom" ? period.toDate : ""} className={`${inputClass} w-40`} />
            <button className={buttonClass.secondary}>Go</button>
          </form>
        </div>
      </PageHeader>
      <p className="text-sm text-zinc-500">Counts approved inspections whose goods were received in this period.</p>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Tile label="Lots decided" value={m.lots} href={`/inspections?status=approved&${range}`} />
        <Tile label="Lot acceptance rate" value={m.lar === null ? "—" : `${m.lar}%`} sub="concessions count as not accepted" />
        <Tile label="Lots rejected" value={m.rejected} href={`/inspections?status=approved&disposition=reject&${range}`} danger={m.rejected > 0} />
        <Tile label="PPM defective" value={m.ppm === null ? "—" : m.ppm.toLocaleString("en-MY")} sub="per million units inspected" />
        <Tile label="Median receipt → decision" value={m.medianDecisionHours === null ? "—" : `${m.medianDecisionHours} h`} />
        <Tile label="Waiting for approval" value={pending.count ?? 0} href={profile.role === "qa" ? "/approvals" : "/inspections?status=submitted"} />
        <Tile label="Open NCRs" value={ncrRows.length} href="/ncrs" danger={ncrRows.length > 0} />
        <Tile
          label="Last backup"
          value={backup.days === null ? "Never" : `${backup.days} d ago`}
          href={canSeeBackup ? "/admin/backup" : undefined}
          danger={backup.level === "danger"}
        />
      </div>

      {rows.length === 0 ? (
        <p className="text-zinc-500">No approved inspections received in {period.label}.</p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-zinc-200 dark:border-zinc-800">
          <table className="w-full min-w-[640px] text-sm">
            <thead className="bg-zinc-50 text-left text-zinc-500 dark:bg-zinc-900">
              <tr><th className="p-3">Supplier</th><th className="p-3">Lots</th><th className="p-3">LAR %</th><th className="p-3">Rejected</th><th className="p-3">PPM</th><th className="p-3">Open NCRs</th></tr>
            </thead>
            <tbody>
              {suppliers.map((s) => (
                <tr key={s.supplierId} className="border-t border-zinc-200 dark:border-zinc-800">
                  <td className="p-3">
                    <Link href={`/inspections?status=approved&supplier=${s.supplierId}&${range}`} className="underline">{s.supplierName}</Link>
                  </td>
                  <td className="p-3">{s.lots}</td>
                  <td className={`p-3 ${s.lar !== null && s.lar < 90 ? "font-semibold text-red-600" : ""}`}>{s.lar ?? "—"}</td>
                  <td className="p-3">{s.rejected}</td>
                  <td className="p-3">{s.ppm === null ? "—" : s.ppm.toLocaleString("en-MY")}</td>
                  <td className="p-3">{ncrBySupplier.get(s.supplierId) ?? 0}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
