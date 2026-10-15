"use server";

import { revalidatePath } from "next/cache";
import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { mdrUpdateSchema } from "@/lib/iqc/payload";
import type { FormState } from "../master/actions";

export async function updateMdr(_prev: FormState, fd: FormData): Promise<FormState> {
  await requireProfile("purchasing", "qa");
  const parsed = mdrUpdateSchema.safeParse({
    id: fd.get("id"), scarNo: fd.get("scarNo") ?? "", rmaNo: fd.get("rmaNo") ?? "",
    supplierResponse: fd.get("supplierResponse") ?? "", status: fd.get("status"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Please check the form." };
  const n = parsed.data;
  const supabase = await createClient();
  const { data: current } = await supabase.from("mdrs").select("closed_at").eq("id", n.id).maybeSingle();
  const { data, error } = await supabase
    .from("mdrs")
    .update({
      scar_no: n.scarNo, rma_no: n.rmaNo, supplier_response: n.supplierResponse, status: n.status,
      closed_at: n.status === "closed" ? ((current as { closed_at: string | null } | null)?.closed_at ?? new Date().toISOString()) : null,
    })
    .eq("id", n.id)
    .select("id");
  if (error) return { error: error.message };
  if (!data?.length) return { error: "Not saved: you may not have permission." };
  revalidatePath("/mdrs");
  revalidatePath(`/mdrs/${n.id}`);
  return { ok: "MDR saved." };
}
