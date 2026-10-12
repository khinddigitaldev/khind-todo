import { Suspense } from "react";
import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { Notice, PageHeader } from "@/components/ui";
import type { DefectClass } from "@/lib/iqc/types";
import { SamplingEditor } from "./sampling-editor";

export default function SamplingPage() {
  return (
    <>
      <PageHeader title="Sampling table" />
      <Notice tone="amber">
        Example values — QA must set KHIND&apos;s real sampling table before any real use (PRD Q1). Rule: c = 0 means any
        defect found rejects the lot.
      </Notice>
      <Suspense fallback={<p className="text-zinc-500">Loading sampling table…</p>}>
        <Sampling />
      </Suspense>
    </>
  );
}

const str = (v: number | null) => (v === null ? "" : String(v));

async function Sampling() {
  const profile = await requireProfile();
  const supabase = await createClient();
  const [bands, acceptance] = await Promise.all([
    supabase.from("sampling_bands").select("lot_min, lot_max, sample_normal, sample_tightened").eq("active", true).eq("plan_source", "KHIND").order("lot_min"),
    supabase.from("sampling_acceptance").select("defect_class, ac").eq("plan_source", "KHIND"),
  ]);
  if (bands.error) throw new Error(`Could not load the sampling table: ${bands.error.message}`);
  const ac: Record<DefectClass, string> = { critical: "0", major: "0", minor: "0" };
  for (const a of (acceptance.data ?? []) as { defect_class: DefectClass; ac: number }[]) ac[a.defect_class] = String(a.ac);

  return (
    <SamplingEditor
      readOnly={profile.role !== "qa"}
      acceptance={ac}
      bands={((bands.data ?? []) as { lot_min: number; lot_max: number | null; sample_normal: number | null; sample_tightened: number | null }[]).map((b) => ({
        lotMin: String(b.lot_min),
        lotMax: str(b.lot_max),
        sampleNormal: str(b.sample_normal),
        sampleTightened: str(b.sample_tightened),
      }))}
    />
  );
}
