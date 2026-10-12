import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient, getCurrentUser } from "@/lib/supabase/server";
import type { Role } from "@/lib/iqc/types";

export type Profile = { id: string; email: string; fullName: string; role: Role; active: boolean };

// One profile lookup per request, shared by the layout and the page.
export const getProfile = cache(async (): Promise<Profile | null> => {
  const supabase = await createClient();
  const user = await getCurrentUser(supabase);
  if (!user) return null;
  const { data } = await supabase
    .from("profiles")
    .select("id, email, full_name, role, active")
    .eq("id", user.id)
    .maybeSingle();
  // RLS hides every row from a deactivated user, so "no profile" means "not allowed".
  if (!data || !data.active) {
    return { id: user.id, email: user.email, fullName: user.email, role: "inspector", active: false };
  }
  return { id: data.id, email: data.email, fullName: data.full_name, role: data.role, active: true };
});

export async function requireProfile(...roles: Role[]): Promise<Profile> {
  const profile = await getProfile();
  if (!profile) redirect("/login");
  if (!profile.active) redirect("/auth/signout?reason=deactivated");
  if (roles.length > 0 && !roles.includes(profile.role)) redirect("/?denied=1");
  return profile;
}
