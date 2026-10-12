"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { parseCredentials } from "@/lib/validation";

export type AuthState = { error?: string; email?: string };

export async function signIn(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const email = String(formData.get("email") ?? "");
  const parsed = parseCredentials(formData.get("email"), formData.get("password"));
  if (!parsed.ok) return { error: parsed.error, email };
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.value);
  if (error) return { error: error.message, email };
  revalidatePath("/", "layout");
  redirect("/");
}
