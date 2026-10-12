import { describe, expect, it } from "vitest";
import { draftSchema } from "./payload";

const valid = {
  header: { poNo: "PO1", doNo: "", lotNo: "L1", qtyReceived: 120, receivedAt: "2026-10-12T08:30:00.000Z", instrument: "Caliper C-01" },
  checks: [{ itemId: 1, result: "ng", comment: "Scratch" }],
  readings: [{ characteristicId: 10, values: [10.01, 9.99] }],
  defects: [
    { defectClass: "critical", found: 0, description: "" },
    { defectClass: "major", found: null, description: "" },
    { defectClass: "minor", found: 1, description: "Dust" },
  ],
  sectionNotes: { "Visual and cosmetic inspection": "Checked under daylight lamp" },
};

describe("draftSchema", () => {
  it("accepts a valid draft", () => expect(draftSchema.safeParse(valid).success).toBe(true));
  it("rejects quantity 0", () =>
    expect(draftSchema.safeParse({ ...valid, header: { ...valid.header, qtyReceived: 0 } }).success).toBe(false));
  it("rejects non-numeric readings", () =>
    expect(draftSchema.safeParse({ ...valid, readings: [{ characteristicId: 10, values: ["abc"] }] }).success).toBe(false));
  it("rejects an unknown check result", () =>
    expect(draftSchema.safeParse({ ...valid, checks: [{ itemId: 1, result: "maybe", comment: "" }] }).success).toBe(false));
  it("requires exactly three defect classes", () =>
    expect(draftSchema.safeParse({ ...valid, defects: valid.defects.slice(0, 2) }).success).toBe(false));
  it("rejects a negative defect count", () =>
    expect(
      draftSchema.safeParse({ ...valid, defects: [{ ...valid.defects[0], found: -1 }, valid.defects[1], valid.defects[2]] }).success,
    ).toBe(false));
});
