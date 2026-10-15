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

describe("missingForSubmit — quick check lots", () => {
  const quickBase: ReadinessInput = { ...base, items: [], checks: {}, characteristics: [], readings: {}, defects: [], sampleSize: 0 };
  it("needs a result and the quantity checked", () =>
    expect(missingForSubmit({ ...quickBase, quick: { result: null, qty: null, remark: "", lotQty: 40 } })).toEqual([
      { anchor: "quick", message: "Choose OK or NG for the quick check" },
      { anchor: "quick", message: "Enter the quantity checked" },
    ]));
  it("caps the quantity at the lot quantity", () =>
    expect(missingForSubmit({ ...quickBase, quick: { result: "ok", qty: 41, remark: "", lotQty: 40 } })).toEqual([
      { anchor: "quick", message: "Quantity checked must be between 1 and the lot quantity (40)" },
    ]));
  it("needs a remark for NG", () =>
    expect(missingForSubmit({ ...quickBase, quick: { result: "ng", qty: 10, remark: " ", lotQty: 40 } })).toEqual([
      { anchor: "quick", message: "Add a remark for the NG quick check" },
    ]));
  it("is complete with OK and a quantity", () =>
    expect(missingForSubmit({ ...quickBase, quick: { result: "ok", qty: 40, remark: "", lotQty: 40 } })).toEqual([]));
});
