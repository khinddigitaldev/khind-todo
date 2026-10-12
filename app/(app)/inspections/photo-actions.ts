"use server";

import { revalidatePath } from "next/cache";
import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { NOT_EDITABLE } from "@/lib/iqc/messages";
import { photoAllowed } from "@/lib/iqc/photos";
import type { CheckResult, DefectClass } from "@/lib/iqc/types";
import { lotVerdict } from "@/lib/iqc/verdict";

const BUCKET = "inspection-photos";

export async function uploadPhoto(fd: FormData): Promise<{ error?: string }> {
  await requireProfile("inspector", "qa");
  const inspectionId = Number(fd.get("inspectionId"));
  const itemRaw = fd.get("itemId");
  const itemId = itemRaw ? Number(itemRaw) : null;
  const file = fd.get("file");
  if (!(file instanceof File)) return { error: "No photo received." };
  if (!Number.isInteger(inspectionId) || inspectionId < 1 || (itemId !== null && !Number.isInteger(itemId))) {
    return { error: "Invalid request." };
  }

  const supabase = await createClient();
  const [check, defects, acceptance, atts] = await Promise.all([
    itemId
      ? supabase.from("inspection_checks").select("result").eq("inspection_id", inspectionId).eq("item_id", itemId).maybeSingle()
      : Promise.resolve({ data: null, error: null }),
    supabase.from("inspection_defects").select("defect_class, found, ac").eq("inspection_id", inspectionId),
    supabase.from("sampling_acceptance").select("defect_class, ac").eq("plan_source", "KHIND"),
    supabase.from("attachments").select("item_id").eq("inspection_id", inspectionId),
  ]);
  const acNow = new Map(((acceptance.data ?? []) as { defect_class: DefectClass; ac: number }[]).map((a) => [a.defect_class, a.ac]));
  const verdict = lotVerdict(
    ((defects.data ?? []) as { defect_class: DefectClass; found: number | null; ac: number | null }[]).map((d) => ({
      defectClass: d.defect_class, found: d.found, ac: d.ac ?? acNow.get(d.defect_class) ?? 0,
    })),
  );
  const attRows = (atts.data ?? []) as { item_id: number | null }[];
  const reason = photoAllowed({
    itemResult: ((check.data as { result: CheckResult } | null)?.result) ?? null,
    lotVerdict: verdict,
    forItem: itemId !== null,
    countForItem: attRows.filter((a) => a.item_id === itemId).length,
    countTotal: attRows.length,
    bytes: file.size,
    mime: file.type,
  });
  if (reason) return { error: reason };

  const path = `${inspectionId}/${crypto.randomUUID()}.jpg`;
  const { error: uploadError } = await supabase.storage.from(BUCKET).upload(path, file, { contentType: file.type });
  if (uploadError) return { error: /row-level|policy/i.test(uploadError.message) ? NOT_EDITABLE : uploadError.message };
  const { error: insertError } = await supabase
    .from("attachments")
    .insert({ inspection_id: inspectionId, item_id: itemId, storage_path: path, bytes: file.size });
  if (insertError) {
    await supabase.storage.from(BUCKET).remove([path]);
    return { error: insertError.message };
  }
  revalidatePath(`/inspections/${inspectionId}`);
  return {};
}

export async function deletePhoto(attachmentId: number): Promise<{ error?: string }> {
  await requireProfile("inspector", "qa");
  const supabase = await createClient();
  const { data, error } = await supabase.from("attachments").delete().eq("id", attachmentId).select("storage_path, inspection_id");
  if (error) return { error: error.message };
  const rows = (data ?? []) as { storage_path: string; inspection_id: number }[];
  if (!rows.length) return { error: NOT_EDITABLE };
  await supabase.storage.from(BUCKET).remove([rows[0].storage_path]);
  revalidatePath(`/inspections/${rows[0].inspection_id}`);
  return {};
}
