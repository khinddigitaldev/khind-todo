import type { CheckResult } from "./types";
import { measurementResult } from "./verdict";

// "Test result summary (auto)" on the Part A cover: one row per test sheet.
// Sub-project 2 adds the 17 QSP-18-1 sheets here.

export type SummaryRow = {
  form: string;
  test: string;
  testedBy: string;
  samples: number | null;
  ng: number | null;
  result: "OK" | "NG" | null;
};

export type SummaryInput = {
  quick: { result: "ok" | "ng" | null; qty: number | null } | null;
  inspectorName: string;
  sampleSize: number | null;
  items: { id: number }[];
  checks: Record<number, { result: CheckResult | null }>;
  characteristics: { id: number; min: number | null; max: number | null }[];
  readings: Record<number, number[]>;
};

export function buildSummary(s: SummaryInput): SummaryRow[] {
  if (s.quick) {
    return [{
      form: "Cover",
      test: "Appearance & Fitting (quick check)",
      testedBy: s.inspectorName,
      samples: s.quick.qty,
      ng: null,
      result: s.quick.result === "ok" ? "OK" : s.quick.result === "ng" ? "NG" : null,
    }];
  }

  const rows: SummaryRow[] = [];
  const answered = s.items.every((i) => s.checks[i.id]?.result);
  const ngItems = s.items.filter((i) => s.checks[i.id]?.result === "ng").length;
  rows.push({
    form: "Checklist",
    test: "General checklist",
    testedBy: s.inspectorName,
    samples: s.sampleSize,
    ng: ngItems,
    result: !answered ? null : ngItems > 0 ? "NG" : "OK",
  });

  if (s.characteristics.length > 0) {
    const results = s.characteristics.map((c) => measurementResult(s.readings[c.id] ?? [], c.min, c.max));
    const ngDims = results.filter((r) => r === "ng").length;
    rows.push({
      form: "F1-2",
      test: "Dimensional inspection",
      testedBy: s.inspectorName,
      samples: Math.max(0, ...s.characteristics.map((c) => (s.readings[c.id] ?? []).length)),
      ng: ngDims,
      result: results.some((r) => r === null) ? null : ngDims > 0 ? "NG" : "OK",
    });
  }
  return rows;
}
