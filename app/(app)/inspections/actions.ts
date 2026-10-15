"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { draftSchema, newInspectionSchema } from "@/lib/iqc/payload";
import { measurementResult } from "@/lib/iqc/verdict";
import { NOT_EDITABLE } from "@/lib/iqc/messages";
import type { FormState } from "../master/actions";

// A "use server" file may only export async functions (types are fine).
export type SaveResult = { ok: true; savedAt: string; sampleSize: number } | { ok: false; error: string };

export async function createInspection(_prev: FormState, fd: FormData): Promise<FormState> {
  await requireProfile("inspector", "qa");
  const parsed = newInspectionSchema.safeParse({
    supplierId: fd.get("supplierId") ?? "", partId: fd.get("partId") ?? "", qty: fd.get("qty") ?? "",
    receivedAt: fd.get("receivedAt") ?? "", po: fd.get("po") ?? "", do: fd.get("do") ?? "", lot: fd.get("lot") ?? "",
    grn: fd.get("grn") ?? "", ref: fd.get("ref") ?? "", motor: fd.get("motor") ?? "",
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Please check the form." };
  const n = parsed.data;
  const supabase = await createClient();
  const { data: id, error } = await supabase.rpc("create_inspection", {
    p_supplier_id: n.supplierId, p_part_id: n.partId, p_qty: n.qty, p_received_at: n.receivedAt,
    p_po: n.po, p_do: n.do, p_lot: n.lot, p_grn: n.grn, p_ref: n.ref, p_motor: n.motor,
  });
  if (error) return { error: error.message };
  revalidatePath("/inspections");
  redirect(`/inspections/${id}`);
}

export async function saveDraft(id: number, raw: unknown): Promise<SaveResult> {
  await requireProfile("inspector", "qa");
  const parsed = draftSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, error: `Some values are invalid (${parsed.error.issues[0]?.path.join(".")}).` };
  const d = parsed.data;
  const supabase = await createClient();

  const { data: updated, error: headerError } = await supabase
    .from("inspections")
    .update({
      po_no: d.header.poNo || null, do_no: d.header.doNo || null, lot_no: d.header.lotNo || null,
      qty_received: d.header.qtyReceived, received_at: d.header.receivedAt,
      instrument: d.header.instrument || null, section_notes: d.sectionNotes,
      grn_no: d.header.grnNo || null, ref_no: d.header.refNo || null, motor_part_no: d.header.motorPartNo || null,
      component_marking: d.header.componentMarking || null,
      ...(d.quick ? { quick_result: d.quick.result, quick_qty: d.quick.qty, quick_remark: d.quick.remark || null } : {}),
    })
    .eq("id", id)
    .select("sample_size, template_version_id")
    .maybeSingle();
  if (headerError) return { ok: false, error: headerError.message };
  if (!updated) return { ok: false, error: NOT_EDITABLE }; // RLS: not the owner, or no longer draft/returned

  if (d.checks.length) {
    const { error } = await supabase.from("inspection_checks").upsert(
      d.checks.map((c) => ({ inspection_id: id, item_id: c.itemId, result: c.result, comment: c.comment || null })),
    );
    if (error) return { ok: false, error: error.message };
  }

  if (d.readings.length && updated.template_version_id !== null) {
    const { data: limits, error: limitsError } = await supabase
      .from("template_characteristics")
      .select("id, min_value, max_value")
      .eq("version_id", updated.template_version_id);
    if (limitsError) return { ok: false, error: limitsError.message };
    const byId = new Map(((limits ?? []) as { id: number; min_value: unknown; max_value: unknown }[]).map((l) => [l.id, l]));
    const rows = d.readings
      .filter((r) => byId.has(r.characteristicId))
      .map((r) => {
        const l = byId.get(r.characteristicId)!;
        const min = l.min_value === null ? null : Number(l.min_value);
        const max = l.max_value === null ? null : Number(l.max_value);
        return { inspection_id: id, characteristic_id: r.characteristicId, readings: r.values, result: measurementResult(r.values, min, max) };
      });
    const { error } = await supabase.from("inspection_measurements").upsert(rows);
    if (error) return { ok: false, error: error.message };
  }

  const defectResults = await Promise.all(
    d.defects.map((x) =>
      supabase
        .from("inspection_defects")
        .update({ found: x.found, description: x.description || null })
        .eq("inspection_id", id)
        .eq("defect_class", x.defectClass),
    ),
  );
  const defectError = defectResults.find((r) => r.error)?.error;
  if (defectError) return { ok: false, error: defectError.message };

  return { ok: true, savedAt: new Date().toISOString(), sampleSize: updated.sample_size as number };
}

export async function submitInspection(id: number): Promise<{ error?: string }> {
  await requireProfile("inspector", "qa");
  const supabase = await createClient();
  const { error } = await supabase.rpc("submit_inspection", { p_id: id });
  if (error) return { error: error.message };
  revalidatePath(`/inspections/${id}`);
  revalidatePath("/inspections");
  redirect(`/inspections/${id}`);
}

export async function deleteDraft(id: number): Promise<{ error?: string }> {
  await requireProfile("inspector", "qa");
  const supabase = await createClient();
  const { data, error } = await supabase.from("inspections").delete().eq("id", id).eq("status", "draft").select("id");
  if (error) return { error: error.message };
  if (!data?.length) return { error: "Only your own drafts can be deleted." };
  revalidatePath("/inspections");
  redirect("/inspections");
}
