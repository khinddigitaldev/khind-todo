"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { templateVersionSchema } from "@/lib/iqc/payload";

export async function saveTemplateVersion(raw: unknown): Promise<{ error: string }> {
  await requireProfile("qa");
  const parsed = templateVersionSchema.safeParse(raw);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Please check the template." };
  const t = parsed.data;
  const supabase = await createClient();
  const { data: versionId, error } = await supabase.rpc("create_template_version", {
    p_template_id: t.templateId,
    p_name: t.name,
    p_items: t.items,
    p_chars: t.characteristics,
  });
  if (error) return { error: error.code === "23505" ? "A template with that name already exists." : error.message };
  const { data: v } = await supabase.from("template_versions").select("template_id").eq("id", versionId).single();
  revalidatePath("/master/templates");
  redirect(`/master/templates/${v?.template_id ?? ""}`);
}
