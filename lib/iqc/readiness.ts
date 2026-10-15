import type { CheckResult, DefectClass } from "./types";

// Mirrors the checks in submit_inspection so the form can list and link
// every gap before the user presses Submit.

export type ReadinessInput = {
  items: { id: number; text: string }[];
  checks: Record<number, { result: CheckResult | null; comment: string }>;
  characteristics: { id: number; name: string }[];
  readings: Record<number, number[]>;
  defects: { defectClass: DefectClass; found: number | null }[];
  sampleSize: number;
  // Present for quick-check lots: then only the quick check is required.
  quick?: { result: "ok" | "ng" | null; qty: number | null; remark: string; lotQty: number } | null;
};

export type Missing = { anchor: string; message: string };

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

export function missingForSubmit(input: ReadinessInput): Missing[] {
  const missing: Missing[] = [];

  if (input.quick) {
    const q = input.quick;
    if (!q.result) missing.push({ anchor: "quick", message: "Choose OK or NG for the quick check" });
    if (q.qty === null) missing.push({ anchor: "quick", message: "Enter the quantity checked" });
    else if (q.qty < 1 || q.qty > q.lotQty) {
      missing.push({ anchor: "quick", message: `Quantity checked must be between 1 and the lot quantity (${q.lotQty})` });
    }
    if (q.result === "ng" && q.remark.trim() === "") missing.push({ anchor: "quick", message: "Add a remark for the NG quick check" });
    return missing;
  }

  for (const item of input.items) {
    const check = input.checks[item.id];
    if (!check?.result) {
      missing.push({ anchor: `item-${item.id}`, message: `Answer: ${item.text}` });
    } else if (check.result === "ng" && check.comment.trim() === "") {
      missing.push({ anchor: `item-${item.id}`, message: `Add a comment for NG: ${item.text}` });
    }
  }

  for (const c of input.characteristics) {
    const count = input.readings[c.id]?.length ?? 0;
    if (count === 0) {
      missing.push({ anchor: `dim-${c.id}`, message: `Enter at least one reading: ${c.name}` });
    } else if (count > input.sampleSize) {
      missing.push({
        anchor: `dim-${c.id}`,
        message: `${c.name} has ${count} readings but the sample size is ${input.sampleSize}`,
      });
    }
  }

  for (const d of input.defects) {
    if (d.found === null) {
      missing.push({ anchor: `defect-${d.defectClass}`, message: `Enter the number of ${d.defectClass} defects (0 if none)` });
    } else if (d.found > input.sampleSize) {
      missing.push({
        anchor: `defect-${d.defectClass}`,
        message: `${cap(d.defectClass)} defects (${d.found}) cannot be more than the sample size (${input.sampleSize})`,
      });
    }
  }
  return missing;
}
