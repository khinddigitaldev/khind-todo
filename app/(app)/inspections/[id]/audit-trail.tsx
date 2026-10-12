import { createClient } from "@/lib/supabase/server";
import { describeChange } from "@/lib/iqc/audit-format";
import { Card } from "@/components/ui";

type Entry = { id: number; table_name: string; action: string; changes: Record<string, unknown>; user_id: string | null; at: string };

export async function AuditTrail({ inspectionId }: { inspectionId: number }) {
  const supabase = await createClient();
  const [{ data: log, error }, { data: people }] = await Promise.all([
    supabase.from("audit_log").select("id, table_name, action, changes, user_id, at").eq("inspection_id", inspectionId).order("at"),
    supabase.from("profiles").select("id, full_name"),
  ]);
  if (error) throw new Error(`Could not load history: ${error.message}`);
  const name = new Map(((people ?? []) as { id: string; full_name: string }[]).map((p) => [p.id, p.full_name]));
  return (
    <Card title="History (audit trail)">
      <ol className="flex flex-col gap-2 text-sm">
        {((log ?? []) as Entry[]).map((e) => (
          <li key={e.id} className="border-l-2 border-zinc-300 pl-3 dark:border-zinc-700">
            <span className="text-zinc-500">
              {new Date(e.at).toLocaleString("en-MY", { timeZone: "Asia/Kuala_Lumpur" })} · {name.get(e.user_id ?? "") ?? "system"}
            </span>
            <ul>
              {describeChange(e).map((line, i) => <li key={i}>{line}</li>)}
            </ul>
          </li>
        ))}
      </ol>
      <p className="mt-3 text-xs text-zinc-500">Draft edits are not recorded; everything from submission onwards is.</p>
    </Card>
  );
}
