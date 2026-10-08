"use server";

// Server Actions for the todo list. Each one checks who is signed in first —
// Server Actions can be called directly, not only from our forms.
// Row Level Security in Supabase is the second guard: even a buggy query
// can only touch the signed-in user's own rows.

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient, getCurrentUser } from "@/lib/supabase/server";
import { parseId, parseTitle } from "@/lib/validation";

async function requireUser() {
  const supabase = await createClient();
  const user = await getCurrentUser(supabase);
  if (!user) redirect("/login");
  return supabase;
}

export type AddTodoState = { error?: string };

export async function addTodo(_prev: AddTodoState, formData: FormData): Promise<AddTodoState> {
  const title = parseTitle(formData.get("title"));
  if (!title.ok) return { error: title.error };

  const supabase = await requireUser();
  const { error } = await supabase.from("todos").insert({ title: title.value });
  if (error) return { error: `Could not save: ${error.message}` };

  revalidatePath("/");
  return {};
}

export async function toggleTodo(formData: FormData) {
  const id = parseId(formData.get("id"));
  const isDone = formData.get("is_done") === "true";

  const supabase = await requireUser();
  const { error } = await supabase.from("todos").update({ is_done: isDone }).eq("id", id);
  if (error) throw new Error(`Could not update todo: ${error.message}`);

  revalidatePath("/");
}

export async function deleteTodo(formData: FormData) {
  const id = parseId(formData.get("id"));

  const supabase = await requireUser();
  const { error } = await supabase.from("todos").delete().eq("id", id);
  if (error) throw new Error(`Could not delete todo: ${error.message}`);

  revalidatePath("/");
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  revalidatePath("/", "layout");
  redirect("/login");
}
