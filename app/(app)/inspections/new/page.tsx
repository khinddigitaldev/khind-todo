import { Suspense } from "react";
import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { Card, PageHeader } from "@/components/ui";
import { NewInspectionForm } from "./new-form";

export default function NewInspectionPage() {
  return (
    <>
      <PageHeader title="New inspection" />
      <Suspense fallback={<p className="text-zinc-500">Loading…</p>}>
        <Form />
      </Suspense>
    </>
  );
}

async function Form() {
  await requireProfile("inspector", "qa");
  const supabase = await createClient();
  const [suppliers, parts] = await Promise.all([
    supabase.from("suppliers").select("id, code, name, status").eq("active", true).order("code"),
    supabase.from("parts").select("id, part_no, name").eq("active", true).neq("inspection_type", "none").order("part_no"),
  ]);
  if (suppliers.error || parts.error) throw new Error("Could not load suppliers or parts.");
  return (
    <Card>
      <p className="mb-4 text-sm text-zinc-500">The sample size is worked out from the quantity using the KHIND sampling table.</p>
      <NewInspectionForm
        suppliers={(suppliers.data ?? []) as { id: number; code: string; name: string; status: string }[]}
        parts={(parts.data ?? []) as { id: number; part_no: string; name: string }[]}
      />
    </Card>
  );
}
