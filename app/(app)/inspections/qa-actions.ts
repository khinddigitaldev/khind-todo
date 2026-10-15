"use server";

import { revalidatePath } from "next/cache";
import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type { FormState } from "../master/actions";

// The database functions check roles, states and reasons and return readable
// messages; these actions only pass the form values through.
async function run(id: number, fn: string, args: Record<string, unknown>, ok: string): Promise<FormState> {
  await requireProfile("qa");
  if (!Number.isInteger(id) || id < 1) return { error: "Invalid inspection." };
  const supabase = await createClient();
  const { data, error } = await supabase.rpc(fn as never, args as never);
  if (error) return { error: error.message };
  revalidatePath(`/inspections/${id}`);
  revalidatePath("/approvals");
  return { ok: typeof data === "string" && data ? `${ok} ${data} created.` : ok };
}

const idOf = (fd: FormData) => Number(fd.get("id"));
const str = (fd: FormData, k: string) => String(fd.get(k) ?? "");

const qty = (fd: FormData, k: string) => (str(fd, k).trim() === "" ? null : Number(str(fd, k)));

export async function approve(_p: FormState, fd: FormData): Promise<FormState> {
  return run(idOf(fd), "approve_inspection", {
    p_id: idOf(fd),
    p_decision: str(fd, "decision") || null,
    p_action: str(fd, "action") || null,
    p_accept_qty: qty(fd, "acceptQty"),
    p_reject_qty: qty(fd, "rejectQty"),
    p_other: str(fd, "other") || null,
    p_uai_reason: str(fd, "uaiReason") || null,
    p_raise_mdr: fd.get("raiseMdr") === "on",
  }, "Signed and approved.");
}

export async function sendBack(_p: FormState, fd: FormData): Promise<FormState> {
  return run(idOf(fd), "return_inspection", { p_id: idOf(fd), p_comment: str(fd, "comment") }, "Returned to the inspector.");
}

export async function reopen(_p: FormState, fd: FormData): Promise<FormState> {
  return run(idOf(fd), "reopen_inspection", { p_id: idOf(fd), p_reason: str(fd, "reason") }, "Reopened.");
}

export async function overrideSample(_p: FormState, fd: FormData): Promise<FormState> {
  return run(idOf(fd), "override_sample_size", { p_id: idOf(fd), p_size: Number(fd.get("size")), p_reason: str(fd, "reason") }, "Sample size overridden.");
}

export async function changeStage(_p: FormState, fd: FormData): Promise<FormState> {
  return run(idOf(fd), "set_inspection_stage", { p_id: idOf(fd), p_stage: str(fd, "stage") }, "Stage changed.");
}
