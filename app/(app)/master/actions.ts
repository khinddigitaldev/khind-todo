"use server";

import { revalidatePath } from "next/cache";
import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { firstError, partSchema, supplierSchema } from "@/lib/iqc/master-schemas";

export type FormState = { error?: string; ok?: string };

const DUPLICATE = "23505";

export async function saveSupplier(_prev: FormState, fd: FormData): Promise<FormState> {
  await requireProfile("qa");
  const parsed = supplierSchema.safeParse({
    id: fd.get("id") || undefined,
    code: fd.get("code") ?? "",
    name: fd.get("name") ?? "",
    status: fd.get("status"),
    category: fd.get("category") ?? "",
    email: fd.get("email") ?? "",
    active: fd.get("active") === "on",
  });
  if (!parsed.success) return { error: firstError(parsed.error.issues) };
  const { id, ...row } = parsed.data;
  const supabase = await createClient();
  const { error } = id
    ? await supabase.from("suppliers").update(row).eq("id", id)
    : await supabase.from("suppliers").insert(row);
  if (error) return { error: error.code === DUPLICATE ? "That supplier code already exists." : error.message };
  revalidatePath("/master/suppliers");
  return { ok: id ? "Supplier updated." : "Supplier added." };
}

export async function savePart(_prev: FormState, fd: FormData): Promise<FormState> {
  await requireProfile("qa");
  const parsed = partSchema.safeParse({
    id: fd.get("id") || undefined,
    partNo: fd.get("partNo") ?? "",
    name: fd.get("name") ?? "",
    category: fd.get("category") ?? "",
    drawingNo: fd.get("drawingNo") ?? "",
    drawingRev: fd.get("drawingRev") ?? "",
    regulated: fd.get("regulated") === "on",
    templateId: fd.get("templateId") ?? "",
    inspectionType: fd.get("inspectionType"),
    active: fd.get("active") === "on",
  });
  if (!parsed.success) return { error: firstError(parsed.error.issues) };
  const p = parsed.data;
  const row = {
    part_no: p.partNo, name: p.name, category: p.category, drawing_no: p.drawingNo, drawing_rev: p.drawingRev,
    regulated: p.regulated, template_id: p.templateId, inspection_type: p.inspectionType, active: p.active,
  };
  const supabase = await createClient();
  const { error } = p.id
    ? await supabase.from("parts").update(row).eq("id", p.id)
    : await supabase.from("parts").insert(row);
  if (error) return { error: error.code === DUPLICATE ? "That part number already exists." : error.message };
  revalidatePath("/master/parts");
  return { ok: p.id ? "Part updated." : "Part added." };
}
