import { connection } from "next/server";
import { Suspense } from "react";
import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { DB_LIMIT_BYTES, STORAGE_LIMIT_BYTES, backupStatus, usageLevel } from "@/lib/iqc/usage";
import { Card, Notice, PageHeader, buttonClass } from "@/components/ui";

const BAR = { ok: "bg-green-600", warn: "bg-amber-500", danger: "bg-red-600" } as const;
const mb = (bytes: number) => (bytes / 1024 / 1024).toFixed(1);

function Meter({ label, used, limit, extra }: { label: string; used: number; limit: number; extra?: string }) {
  const pct = Math.min(100, (used / limit) * 100);
  return (
    <div className="flex flex-col gap-1">
      <div className="flex justify-between text-sm">
        <b>{label}</b>
        <span>{mb(used)} MB of {mb(limit)} MB · {pct.toFixed(1)}%{extra ? ` · ${extra}` : ""}</span>
      </div>
      <div className="h-3 overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-800">
        <div className={`h-full ${BAR[usageLevel(used, limit)]}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

// Request-time only (the page awaits connection() first).
function lastBackup(at: string | null) {
  return backupStatus(at, new Date());
}

export default function BackupPage() {
  return (
    <>
      <PageHeader title="Backup & usage" />
      <Suspense fallback={<p className="text-zinc-500">Loading…</p>}>
        <Backup />
      </Suspense>
    </>
  );
}

async function Backup() {
  const profile = await requireProfile("admin", "qa");
  await connection();
  const supabase = await createClient();
  const [usage, latest] = await Promise.all([
    supabase.rpc("usage_stats" as never),
    supabase.from("backups").select("at").order("at", { ascending: false }).limit(1).maybeSingle(),
  ]);
  const u = ((usage.data ?? []) as { db_bytes: number; photo_bytes: number; photo_count: number }[])[0];
  const status = lastBackup((latest.data as { at: string } | null)?.at ?? null);

  return (
    <>
      <Card title="Free-plan usage">
        {u ? (
          <div className="flex flex-col gap-4">
            <Meter label="Database" used={Number(u.db_bytes)} limit={DB_LIMIT_BYTES} />
            <Meter label="Photos" used={Number(u.photo_bytes)} limit={STORAGE_LIMIT_BYTES} extra={`${u.photo_count} photos`} />
            <p className="text-xs text-zinc-500">Limits assume Supabase Free (500 MB database, 1 GB storage). Check Supabase → Usage.</p>
          </div>
        ) : (
          <Notice tone="amber">Usage figures are not available{usage.error ? `: ${usage.error.message}` : "."}</Notice>
        )}
      </Card>
      <Card title="Last backup">
        <div className="flex flex-col gap-3">
          <p>{status.days === null ? "Never" : `${status.days} day(s) ago`}</p>
          {status.level === "danger" && <Notice tone="red">No backup in the last 8 days. Export all data and save it to OneDrive.</Notice>}
          {profile.role === "admin" && (
            <div className="flex flex-wrap items-center gap-3">
              <a href="/api/admin/export-all" className={buttonClass.primary}>Export all data (ZIP)</a>
              <span className="text-sm text-zinc-500">After the download finishes, reload this page to see the new backup date.</span>
            </div>
          )}
        </div>
      </Card>
      <Card title="Runbook">
        <ul className="list-disc space-y-1 pl-5 text-sm">
          <li>Every Monday: <b>Export all data</b> → save to OneDrive › QA › IQC backups → delete files older than 12 weeks.</li>
          <li>After a long shutdown (Hari Raya / CNY, more than 7 days): if the app shows errors, open Supabase → project → <b>Restore project</b>, wait about 2 minutes, then reload.</li>
          <li>If photos reach 70%: download old photos from Supabase Storage to OneDrive, then delete them in Storage.</li>
          <li>If the export ever fails because it is too large (Vercel Hobby limit ≈ 4.5 MB), run <code>npx supabase db dump --linked --data-only &gt; backup.sql</code> instead.</li>
        </ul>
      </Card>
    </>
  );
}
