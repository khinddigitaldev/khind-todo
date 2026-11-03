"use server";

import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { parseNewPassword } from "@/lib/validation";

export type PasswordState = { error?: string; done?: boolean };

export async function changePassword(_prev: PasswordState, formData: FormData): Promise<PasswordState> {
  await requireProfile();
  const parsed = parseNewPassword(formData.get("password"), formData.get("confirm"));
  if (!parsed.ok) return { error: parsed.error };
  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password: parsed.value });
  if (error) return { error: error.message };
  return { done: true };
}
