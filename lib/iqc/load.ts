import { createClient } from "@/lib/supabase/server";
import type { CheckResult, DefectClass, InspectionStatus, LotAction, LotDecision, SupplierCategory } from "./types";

export type InspectionBundle = {
  id: number;
  number: string;
  status: InspectionStatus;
  verdict: "accept" | "reject" | null;
  decision: LotDecision | null;
  action: LotAction | null;
  acceptQty: number | null;
  rejectQty: number | null;
  decisionOther: string | null;
  uaiReason: string | null;
  raiseMdr: boolean;
  supplier: { id: number; code: string; name: string; status: string; category: SupplierCategory | null };
  part: { id: number; partNo: string; name: string; drawingNo: string | null; drawingRev: string | null; regulated: boolean };
  poNo: string;
  doNo: string;
  lotNo: string;
  grnNo: string;
  refNo: string;
  motorPartNo: string;
  componentMarking: string;
  quick: { result: "ok" | "ng" | null; qty: number | null; remark: string } | null;
  qtyReceived: number;
  receivedAt: string;
  stage: "normal" | "tightened";
  sampleSize: number | null;
  sampleOverrideReason: string | null;
  instrument: string;
  sectionNotes: Record<string, string>;
  inspector: { id: string; name: string };
  approver: { id: string; name: string } | null;
  submittedAt: string | null;
  approvedAt: string | null;
  returnComment: string | null;
  reopenReason: string | null;
  templateName: string;
  templateVersion: number | null;
  items: { id: number; section: string; position: number; text: string }[];
  characteristics: { id: number; name: string; nominal: number | null; min: number | null; max: number | null; unit: string; defectClass: DefectClass }[];
  checks: Record<number, { result: CheckResult; comment: string }>;
  readings: Record<number, number[]>;
  defects: { defectClass: DefectClass; found: number | null; ac: number; description: string }[];
  attachments: { id: number; itemId: number | null; url: string | null; bytes: number }[];
  mdr: { id: number; number: string; status: string } | null;
};

const ORDER: DefectClass[] = ["critical", "major", "minor"];

// PostgREST returns a single object for many-to-one embeds; this also copes
// with an array, which is what the untyped client claims.
function one<T>(x: T | T[] | null | undefined): T | null {
  if (Array.isArray(x)) return x[0] ?? null;
  return x ?? null;
}

type Row = Record<string, unknown>;

export async function loadInspection(id: number): Promise<InspectionBundle | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("inspections")
    .select(`id, number, status, verdict, po_no, do_no, lot_no, grn_no, ref_no, motor_part_no, component_marking,
      quick, quick_result, quick_qty, quick_remark, lot_decision, lot_action, accept_qty, reject_qty, decision_other,
      uai_reason, raise_mdr, qty_received, received_at, stage, sample_size, sample_override_reason, instrument,
      section_notes, submitted_at, approved_at, return_comment, reopen_reason, template_version_id,
      supplier:suppliers(id, code, name, status, category),
      part:parts(id, part_no, name, drawing_no, drawing_rev, regulated),
      inspector:profiles!inspections_inspector_id_fkey(id, full_name),
      approver:profiles!inspections_approver_id_fkey(id, full_name),
      version:template_versions(version, template:templates(name))`)
    .eq("id", id)
    .maybeSingle();
  if (error) throw new Error(`Could not load inspection: ${error.message}`);
  if (!data) return null;
  const i = data as unknown as Row;
  const supplier = one(i.supplier as Row | Row[]);
  const part = one(i.part as Row | Row[]);
  const inspector = one(i.inspector as Row | Row[]);
  const approver = one(i.approver as Row | Row[]);
  const version = one(i.version as Row | Row[]);
  if (!supplier || !part || !inspector) return null;
  const template = version ? one(version.template as Row | Row[]) : null;

  // Quick-check lots have no template version: no checklist items or dimensions.
  const v = (i.template_version_id as number | null) ?? -1;
  const [items, chars, checks, meas, defects, acceptance, atts, mdr] = await Promise.all([
    supabase.from("template_items").select("id, section, position, text").eq("version_id", v).order("position"),
    supabase.from("template_characteristics").select("id, name, nominal, min_value, max_value, unit, defect_class").eq("version_id", v).order("position"),
    supabase.from("inspection_checks").select("item_id, result, comment").eq("inspection_id", id),
    supabase.from("inspection_measurements").select("characteristic_id, readings").eq("inspection_id", id),
    supabase.from("inspection_defects").select("defect_class, found, ac, description").eq("inspection_id", id),
    supabase.from("sampling_acceptance").select("defect_class, ac").eq("plan_source", "KHIND"),
    supabase.from("attachments").select("id, item_id, storage_path, bytes").eq("inspection_id", id).order("id"),
    supabase.from("mdrs").select("id, number, status").eq("inspection_id", id).maybeSingle(),
  ]);
  for (const r of [items, chars, checks, meas, defects, acceptance, atts, mdr]) {
    if (r.error) throw new Error(`Could not load inspection details: ${r.error.message}`);
  }

  const attRows = (atts.data ?? []) as { id: number; item_id: number | null; storage_path: string; bytes: number }[];
  const paths = attRows.map((a) => a.storage_path);
  const signed = paths.length
    ? ((await supabase.storage.from("inspection-photos").createSignedUrls(paths, 3600)).data ?? [])
    : [];
  const urlFor = new Map(signed.map((s) => [s.path, s.signedUrl]));
  const currentAc = new Map(((acceptance.data ?? []) as { defect_class: DefectClass; ac: number }[]).map((a) => [a.defect_class, a.ac]));
  const num = (x: unknown) => (x === null || x === undefined ? null : Number(x));
  const str = (x: unknown) => (x === null || x === undefined ? "" : String(x));
  const defectRows = (defects.data ?? []) as { defect_class: DefectClass; found: number | null; ac: number | null; description: string | null }[];

  return {
    id: i.id as number,
    number: i.number as string,
    status: i.status as InspectionStatus,
    verdict: (i.verdict as "accept" | "reject" | null) ?? null,
    decision: (i.lot_decision as LotDecision | null) ?? null,
    action: (i.lot_action as LotAction | null) ?? null,
    acceptQty: (i.accept_qty as number | null) ?? null,
    rejectQty: (i.reject_qty as number | null) ?? null,
    decisionOther: (i.decision_other as string | null) ?? null,
    uaiReason: (i.uai_reason as string | null) ?? null,
    raiseMdr: Boolean(i.raise_mdr),
    supplier: {
      id: supplier.id as number, code: str(supplier.code), name: str(supplier.name), status: str(supplier.status),
      category: (supplier.category as SupplierCategory | null) ?? null,
    },
    part: {
      id: part.id as number, partNo: str(part.part_no), name: str(part.name),
      drawingNo: (part.drawing_no as string | null) ?? null, drawingRev: (part.drawing_rev as string | null) ?? null,
      regulated: Boolean(part.regulated),
    },
    poNo: str(i.po_no), doNo: str(i.do_no), lotNo: str(i.lot_no),
    grnNo: str(i.grn_no), refNo: str(i.ref_no), motorPartNo: str(i.motor_part_no), componentMarking: str(i.component_marking),
    quick: i.quick
      ? { result: (i.quick_result as "ok" | "ng" | null) ?? null, qty: (i.quick_qty as number | null) ?? null, remark: str(i.quick_remark) }
      : null,
    qtyReceived: i.qty_received as number,
    receivedAt: i.received_at as string,
    stage: i.stage as "normal" | "tightened",
    sampleSize: (i.sample_size as number | null) ?? null,
    sampleOverrideReason: (i.sample_override_reason as string | null) ?? null,
    instrument: str(i.instrument),
    sectionNotes: (i.section_notes ?? {}) as Record<string, string>,
    inspector: { id: str(inspector.id), name: str(inspector.full_name) },
    approver: approver ? { id: str(approver.id), name: str(approver.full_name) } : null,
    submittedAt: (i.submitted_at as string | null) ?? null,
    approvedAt: (i.approved_at as string | null) ?? null,
    returnComment: (i.return_comment as string | null) ?? null,
    reopenReason: (i.reopen_reason as string | null) ?? null,
    templateName: str(template?.name),
    templateVersion: version ? (version.version as number) : null,
    items: (items.data ?? []) as InspectionBundle["items"],
    characteristics: ((chars.data ?? []) as Row[]).map((c) => ({
      id: c.id as number, name: str(c.name), nominal: num(c.nominal), min: num(c.min_value), max: num(c.max_value),
      unit: str(c.unit), defectClass: c.defect_class as DefectClass,
    })),
    checks: Object.fromEntries(
      ((checks.data ?? []) as { item_id: number; result: CheckResult; comment: string | null }[]).map((c) => [
        c.item_id, { result: c.result, comment: c.comment ?? "" },
      ]),
    ),
    readings: Object.fromEntries(
      ((meas.data ?? []) as { characteristic_id: number; readings: unknown[] | null }[]).map((m) => [
        m.characteristic_id, (m.readings ?? []).map(Number),
      ]),
    ),
    defects: ORDER.map((cls) => {
      const d = defectRows.find((x) => x.defect_class === cls);
      return { defectClass: cls, found: d?.found ?? null, ac: d?.ac ?? currentAc.get(cls) ?? 0, description: d?.description ?? "" };
    }),
    attachments: attRows.map((a) => ({ id: a.id, itemId: a.item_id, url: urlFor.get(a.storage_path) ?? null, bytes: a.bytes })),
    mdr: (mdr.data as InspectionBundle["mdr"]) ?? null,
  };
}
