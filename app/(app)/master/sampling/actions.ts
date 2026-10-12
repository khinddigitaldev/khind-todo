"use server";

import { revalidatePath } from "next/cache";
import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { validateBands } from "@/lib/iqc/bands";
import { samplingSchema } from "@/lib/iqc/payload";
import { DEFECT_CLASSES } from "@/lib/iqc/types";

export async function saveSampling(raw: unknown): Promise<{ error?: string; ok?: string }> {
  await requireProfile("qa");
  const parsed = samplingSchema.safeParse(raw);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Please check the table." };
  const problems = validateBands(parsed.data.bands);
  if (problems.length) return { error: problems.join(" ") };
  const supabase = await createClient();
  const { error } = await supabase.rpc("replace_sampling_bands", { p_bands: parsed.data.bands });
  if (error) return { error: error.message };
  for (const cls of DEFECT_CLASSES) {
    const { error: e } = await supabase
      .from("sampling_acceptance")
      .upsert({ plan_source: "KHIND", defect_class: cls, ac: parsed.data.acceptance[cls] });
    if (e) return { error: e.message };
  }
  revalidatePath("/master/sampling");
  return { ok: "Sampling table saved. New inspections use it straight away." };
}
