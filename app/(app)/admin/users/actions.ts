"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type { FormState } from "../../master/actions";

const schema = z.object({
  id: z.uuid(),
  fullName: z.string().trim().min(1, "Name is required.").max(80),
  role: z.enum(["inspector", "qa", "purchasing", "management", "admin"]),
  active: z.boolean(),
});

export async function updateUser(_prev: FormState, fd: FormData): Promise<FormState> {
  const me = await requireProfile("admin");
  const parsed = schema.safeParse({
    id: fd.get("id"), fullName: fd.get("fullName") ?? "", role: fd.get("role"), active: fd.get("active") === "on",
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Please check the form." };
  if (parsed.data.id === me.id) return { error: "You can't change your own role or deactivate yourself." };
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("profiles")
    .update({ full_name: parsed.data.fullName, role: parsed.data.role, active: parsed.data.active })
    .eq("id", parsed.data.id)
    .select("id");
  if (error) return { error: error.message };
  if (!data?.length) return { error: "Not saved: you may not have permission." };
  revalidatePath("/admin/users");
  return { ok: "Saved." };
}
