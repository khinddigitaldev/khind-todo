"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { parseCredentials } from "@/lib/validation";

export type AuthState = { error?: string; message?: string; email?: string };

// One action for both buttons: the clicked button sends mode=signin or mode=signup.
export async function authenticate(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const email = String(formData.get("email") ?? "");
  const parsed = parseCredentials(formData.get("email"), formData.get("password"));
  if (!parsed.ok) return { error: parsed.error, email };

  const supabase = await createClient();

  if (formData.get("mode") === "signup") {
    const { data, error } = await supabase.auth.signUp(parsed.value);
    if (error) return { error: error.message, email };
    // If "Confirm email" is switched on in Supabase, there is no session yet.
    if (!data.session) {
      return { message: "Account created. Check your email to confirm it, then sign in.", email };
    }
  } else {
    const { error } = await supabase.auth.signInWithPassword(parsed.value);
    if (error) return { error: error.message, email };
  }

  revalidatePath("/", "layout");
  redirect("/");
}
