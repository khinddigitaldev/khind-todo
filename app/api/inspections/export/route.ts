import type { NextRequest } from "next/server";
import { getProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { toCsv } from "@/lib/iqc/csv";
import { parseListFilters } from "@/lib/iqc/filters";

type Row = {
  number: string; status: string; verdict: string | null; disposition: string | null; po_no: string | null; do_no: string | null;
  lot_no: string | null; qty_received: number; sample_size: number; received_at: string; submitted_at: string | null; approved_at: string | null;
  supplier: { code: string; name: string } | null; part: { part_no: string; name: string } | null;
  inspector: { full_name: string } | null; approver: { full_name: string } | null;
};

const COLUMNS = [
  "number", "status", "verdict", "disposition", "supplier_code", "supplier", "part_no", "part", "po_no", "do_no",
  "lot_no", "qty_received", "sample_size", "received_at", "submitted_at", "approved_at", "inspector", "approver",
];

export async function GET(request: NextRequest) {
  const profile = await getProfile();
  if (!profile) return new Response("Sign in first.", { status: 401 });
  if (!profile.active) return new Response("Account deactivated.", { status: 403 });
  const f = parseListFilters(Object.fromEntries(request.nextUrl.searchParams));
  const supabase = await createClient();
  let q = supabase
    .from("inspections")
    .select(`number, status, verdict, disposition, po_no, do_no, lot_no, qty_received, sample_size, received_at,
      submitted_at, approved_at, supplier:suppliers(code, name), part:parts(part_no, name),
      inspector:profiles!inspections_inspector_id_fkey(full_name), approver:profiles!inspections_approver_id_fkey(full_name)`)
    .order("received_at", { ascending: false })
    .limit(5000);
  if (f.status) q = q.eq("status", f.status);
  if (f.supplierId) q = q.eq("supplier_id", f.supplierId);
  if (f.disposition) q = q.eq("disposition", f.disposition);
  if (f.from) q = q.gte("received_at", `${f.from}T00:00:00+08:00`);
  if (f.to) q = q.lte("received_at", `${f.to}T23:59:59.999+08:00`);
  if (f.mine) q = q.eq("inspector_id", profile.id);
  const { data, error } = await q;
  if (error) return new Response(error.message, { status: 500 });
  const rows = ((data ?? []) as unknown as Row[]).map((r) => ({
    number: r.number, status: r.status, verdict: r.verdict, disposition: r.disposition,
    supplier_code: r.supplier?.code, supplier: r.supplier?.name, part_no: r.part?.part_no, part: r.part?.name,
    po_no: r.po_no, do_no: r.do_no, lot_no: r.lot_no, qty_received: r.qty_received, sample_size: r.sample_size,
    received_at: r.received_at, submitted_at: r.submitted_at, approved_at: r.approved_at,
    inspector: r.inspector?.full_name, approver: r.approver?.full_name,
  }));
  const today = new Date().toISOString().slice(0, 10);
  // The byte-order mark makes Excel open UTF-8 correctly.
  return new Response("﻿" + toCsv(rows, COLUMNS), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="inspections-${today}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
