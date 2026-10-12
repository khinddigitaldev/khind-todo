import { strToU8, zipSync } from "fflate";
import { getProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { toCsv } from "@/lib/iqc/csv";

// Table -> column to page by (stable order).
const TABLES: Record<string, string> = {
  profiles: "id", suppliers: "id", parts: "id", templates: "id", template_versions: "id", template_items: "id",
  template_characteristics: "id", sampling_bands: "id", sampling_acceptance: "defect_class", inspections: "id",
  inspection_checks: "inspection_id", inspection_measurements: "inspection_id", inspection_defects: "inspection_id",
  attachments: "id", ncrs: "id", audit_log: "id", backups: "id",
};
const PAGE = 1000;

export async function GET() {
  const profile = await getProfile();
  if (!profile) return new Response("Sign in first.", { status: 401 });
  if (!profile.active || profile.role !== "admin") return new Response("Admins only.", { status: 403 });

  const supabase = await createClient();
  const files: Record<string, Uint8Array> = {};
  let total = 0;
  for (const [table, orderBy] of Object.entries(TABLES)) {
    const rows: Record<string, unknown>[] = [];
    for (let from = 0; ; from += PAGE) {
      const { data, error } = await supabase
        .from(table as never)
        .select("*")
        .order(orderBy as never)
        .range(from, from + PAGE - 1);
      if (error) return new Response(`Export failed on ${table}: ${error.message}`, { status: 500 });
      const page = (data ?? []) as Record<string, unknown>[];
      rows.push(...page);
      if (page.length < PAGE) break;
    }
    total += rows.length;
    const columns = rows.length ? Object.keys(rows[0]) : [];
    files[`${table}.csv`] = strToU8(toCsv(rows, columns));
  }

  const today = new Date().toISOString().slice(0, 10);
  files["README.txt"] = strToU8(
    [
      `KHIND IQC backup ${today} (${total} rows).`,
      "One CSV per table. Photos are NOT inside this file: they stay in Supabase Storage (bucket inspection-photos);",
      "attachments.csv lists their paths. Keep the latest 12 weekly backups in the QA OneDrive folder.",
    ].join("\r\n"),
  );

  const { error: logError } = await supabase.from("backups").insert({ row_count: total, note: "Export all data" });
  if (logError) return new Response(`Could not record the backup: ${logError.message}`, { status: 500 });

  return new Response(Buffer.from(zipSync(files)), {
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="khind-iqc-backup-${today}.zip"`,
      "Cache-Control": "no-store",
    },
  });
}
