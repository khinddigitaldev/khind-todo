"use server";

import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";

export type ResetState = { error?: string; sent?: boolean; email?: string };

// Emails a password-reset link. The link comes back to /auth/callback, which
// signs the person in and opens the Change password page.
export async function requestReset(_prev: ResetState, formData: FormData): Promise<ResetState> {
  const email = String(formData.get("email") ?? "").trim();
  if (!email.includes("@")) return { error: "Please enter a valid email address.", email };

  const h = await headers();
  const origin = h.get("origin") ?? `https://${h.get("host")}`;
  const supabase = await createClient();
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${origin}/auth/callback?next=/account/password`,
  });
  if (error?.status === 429) return { error: "Too many emails were sent. Please wait a few minutes and try again.", email };
  if (error) return { error: error.message, email };
  // Same answer whether or not the account exists, so the form can't be used to find accounts.
  return { sent: true, email };
}
