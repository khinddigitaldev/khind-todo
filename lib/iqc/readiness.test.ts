import { describe, expect, it } from "vitest";
import { missingForSubmit, type ReadinessInput } from "./readiness";

const base: ReadinessInput = {
  items: [{ id: 1, text: "Labels correct" }, { id: 2, text: "No scratches" }],
  checks: { 1: { result: "ok", comment: "" }, 2: { result: "ok", comment: "" } },
  characteristics: [{ id: 10, name: "Length" }],
  readings: { 10: [10.0] },
  defects: [
    { defectClass: "critical", found: 0 },
    { defectClass: "major", found: 0 },
    { defectClass: "minor", found: 0 },
  ],
  sampleSize: 5,
};

describe("missingForSubmit", () => {
  it("returns nothing for a complete inspection", () => expect(missingForSubmit(base)).toEqual([]));

  it("lists unanswered items with anchors", () => {
    const r = missingForSubmit({ ...base, checks: { 1: { result: "ok", comment: "" } } });
    expect(r).toEqual([{ anchor: "item-2", message: "Answer: No scratches" }]);
  });

  it("requires a comment on NG items (blank spaces don't count)", () => {
    const r = missingForSubmit({ ...base, checks: { ...base.checks, 2: { result: "ng", comment: "  " } } });
    expect(r).toEqual([{ anchor: "item-2", message: "Add a comment for NG: No scratches" }]);
  });

  it("requires at least one reading per dimension", () => {
    expect(missingForSubmit({ ...base, readings: {} })).toEqual([
      { anchor: "dim-10", message: "Enter at least one reading: Length" },
    ]);
  });

  it("refuses more readings than the sample size", () => {
    expect(missingForSubmit({ ...base, readings: { 10: [1, 2, 3, 4, 5, 6] } })).toEqual([
      { anchor: "dim-10", message: "Length has 6 readings but the sample size is 5" },
    ]);
  });

  it("requires every defect count, and caps it at the sample size", () => {
    const r = missingForSubmit({
      ...base,
      defects: [
        { defectClass: "critical", found: null },
        { defectClass: "major", found: 6 },
        { defectClass: "minor", found: 0 },
      ],
    });
    expect(r).toEqual([
      { anchor: "defect-critical", message: "Enter the number of critical defects (0 if none)" },
      { anchor: "defect-major", message: "Major defects (6) cannot be more than the sample size (5)" },
    ]);
  });
});
