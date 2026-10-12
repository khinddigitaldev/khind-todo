"use client";

import { useState, useTransition } from "react";
import { Notice, buttonClass, inputClass } from "@/components/ui";
import { validateBands } from "@/lib/iqc/bands";
import { DEFECT_CLASSES, type DefectClass } from "@/lib/iqc/types";
import { saveSampling } from "./actions";

export type BandText = { lotMin: string; lotMax: string; sampleNormal: string; sampleTightened: string };

const toBandInput = (b: BandText) => ({
  lotMin: Number(b.lotMin),
  lotMax: b.lotMax.trim() === "" ? null : Number(b.lotMax),
  sampleNormal: b.sampleNormal.trim() === "" ? null : Number(b.sampleNormal),
  sampleTightened: b.sampleTightened.trim() === "" ? null : Number(b.sampleTightened),
});

export function SamplingEditor(props: { bands: BandText[]; acceptance: Record<DefectClass, string>; readOnly: boolean }) {
  const [bands, setBands] = useState(props.bands);
  const [acceptance, setAcceptance] = useState(props.acceptance);
  const [result, setResult] = useState<{ error?: string; ok?: string }>({});
  const [pending, startTransition] = useTransition();
  const problems = validateBands(bands.map(toBandInput));
  const setBand = (i: number, patch: Partial<BandText>) => setBands(bands.map((b, j) => (j === i ? { ...b, ...patch } : b)));

  function save() {
    startTransition(async () => {
      setResult(
        await saveSampling({
          bands: bands.map(toBandInput),
          acceptance: {
            critical: Number(acceptance.critical),
            major: Number(acceptance.major),
            minor: Number(acceptance.minor),
          },
        }),
      );
    });
  }

  const cell = (i: number, key: keyof BandText, label: string) => (
    <input
      aria-label={`Band ${i + 1} ${label}`}
      inputMode="numeric"
      disabled={props.readOnly}
      value={bands[i][key]}
      onChange={(e) => setBand(i, { [key]: e.target.value })}
      className={inputClass}
    />
  );

  return (
    <div className="flex flex-col gap-4">
      <div className="overflow-x-auto rounded-xl border border-zinc-200 dark:border-zinc-800">
        <table className="w-full min-w-[560px] text-sm">
          <thead className="bg-zinc-50 text-left text-zinc-500 dark:bg-zinc-900">
            <tr>
              <th className="p-2">Lot size from</th><th className="p-2">to (empty = no limit)</th>
              <th className="p-2">Sample normal (empty = all)</th><th className="p-2">Sample tightened</th>{!props.readOnly && <th />}
            </tr>
          </thead>
          <tbody>
            {bands.map((_, i) => (
              <tr key={i} className="border-t border-zinc-200 dark:border-zinc-800">
                <td className="p-2">{cell(i, "lotMin", "from")}</td>
                <td className="p-2">{cell(i, "lotMax", "to")}</td>
                <td className="p-2">{cell(i, "sampleNormal", "normal sample")}</td>
                <td className="p-2">{cell(i, "sampleTightened", "tightened sample")}</td>
                {!props.readOnly && (
                  <td className="p-2">
                    <button type="button" onClick={() => setBands(bands.filter((__, j) => j !== i))} className={buttonClass.secondary} aria-label={`Remove band ${i + 1}`}>✕</button>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {!props.readOnly && (
        <button type="button" onClick={() => setBands([...bands, { lotMin: "", lotMax: "", sampleNormal: "", sampleTightened: "" }])} className={`${buttonClass.secondary} self-start`}>
          Add band
        </button>
      )}
      <div className="flex flex-wrap gap-4">
        {DEFECT_CLASSES.map((cls) => (
          <label key={cls} className="flex flex-col gap-1 text-sm font-medium capitalize">
            {cls}: accept up to
            <input
              inputMode="numeric"
              disabled={props.readOnly}
              value={acceptance[cls]}
              onChange={(e) => setAcceptance({ ...acceptance, [cls]: e.target.value })}
              className={`${inputClass} w-24`}
            />
          </label>
        ))}
      </div>
      {problems.length > 0 && (
        <Notice tone="amber">
          <ul className="list-disc pl-5">{problems.map((p) => <li key={p}>{p}</li>)}</ul>
        </Notice>
      )}
      {result.error && <Notice tone="red">{result.error}</Notice>}
      {result.ok && <Notice tone="green">{result.ok}</Notice>}
      {!props.readOnly && (
        <button type="button" onClick={save} disabled={pending || problems.length > 0} className={`${buttonClass.primary} self-start`}>
          {pending ? "Saving…" : "Save sampling table"}
        </button>
      )}
    </div>
  );
}
