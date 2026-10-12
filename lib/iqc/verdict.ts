import type { DefectClass } from "./types";

// Live verdict for the inspection form. The database computes the same rule
// on submit/approve (inspection_verdict) — that one is authoritative.

export type DefectCount = { defectClass: DefectClass; found: number | null; ac: number };
export type Verdict = "accept" | "reject" | "incomplete";

export function lotVerdict(defects: DefectCount[]): Verdict {
  if (defects.some((d) => d.found !== null && d.found >= d.ac + 1)) return "reject";
  if (defects.some((d) => d.found === null)) return "incomplete";
  return "accept";
}

export function isOutOfTolerance(value: number, min: number | null, max: number | null): boolean {
  return (min !== null && value < min) || (max !== null && value > max);
}

export function measurementResult(readings: number[], min: number | null, max: number | null): "ok" | "ng" | null {
  if (readings.length === 0) return null;
  return readings.some((v) => isOutOfTolerance(v, min, max)) ? "ng" : "ok";
}

export function reviewWarnings(input: { ngItems: number; ngMeasurements: number; totalFound: number }): string[] {
  if (input.totalFound > 0) return [];
  const warnings: string[] = [];
  if (input.ngItems > 0) {
    const s = input.ngItems === 1 ? "1 checklist item is" : `${input.ngItems} checklist items are`;
    warnings.push(`${s} NG but no defects were counted. Review before accepting.`);
  }
  if (input.ngMeasurements > 0) {
    const s = input.ngMeasurements === 1 ? "1 dimension is" : `${input.ngMeasurements} dimensions are`;
    warnings.push(`${s} out of tolerance but no defects were counted. Review before accepting.`);
  }
  return warnings;
}
