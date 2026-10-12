import { describe, expect, it } from "vitest";
import { draftSchema, ncrUpdateSchema, newInspectionSchema, samplingSchema, templateVersionSchema } from "./payload";

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

describe("templateVersionSchema", () => {
  const ok = {
    templateId: null, name: "Grille (Demo)",
    items: [{ section: "Visual", text: "No cracks" }],
    characteristics: [{ name: "Width", nominal: 10, min: 9.9, max: 10.1, unit: "mm", defectClass: "major" }],
  };
  it("accepts a valid template", () => expect(templateVersionSchema.safeParse(ok).success).toBe(true));
  it("needs a name for a new template", () =>
    expect(templateVersionSchema.safeParse({ ...ok, name: "" }).success).toBe(false));
  it("needs at least one item", () => expect(templateVersionSchema.safeParse({ ...ok, items: [] }).success).toBe(false));
  it("rejects min greater than max", () =>
    expect(templateVersionSchema.safeParse({ ...ok, characteristics: [{ ...ok.characteristics[0], min: 11 }] }).success).toBe(false));
});

describe("samplingSchema", () => {
  it("accepts bands and acceptance numbers", () =>
    expect(samplingSchema.safeParse({
      bands: [{ lotMin: 1, lotMax: null, sampleNormal: null, sampleTightened: null }],
      acceptance: { critical: 0, major: 0, minor: 1 },
    }).success).toBe(true));
  it("rejects a negative acceptance number", () =>
    expect(samplingSchema.safeParse({
      bands: [{ lotMin: 1, lotMax: null, sampleNormal: 5, sampleTightened: 8 }],
      acceptance: { critical: -1, major: 0, minor: 0 },
    }).success).toBe(false));
});

describe("newInspectionSchema", () => {
  const ok = { supplierId: "1", partId: "2", qty: "120", receivedAt: "2026-10-12T00:30:00.000Z", po: "", do: "", lot: "" };
  it("coerces form strings", () => expect(newInspectionSchema.parse(ok)).toMatchObject({ supplierId: 1, partId: 2, qty: 120 }));
  it("explains a missing supplier", () => {
    const r = newInspectionSchema.safeParse({ ...ok, supplierId: "" });
    expect(r.success).toBe(false);
    if (!r.success) expect(r.error.issues[0].message).toBe("Choose a supplier.");
  });
  it("refuses quantity 0", () => expect(newInspectionSchema.safeParse({ ...ok, qty: "0" }).success).toBe(false));
});

describe("ncrUpdateSchema", () => {
  const ok = { id: "4", scarNo: "SCAR-01", rmaNo: "", supplierResponse: "Will replace", status: "waiting_supplier" };
  it("accepts a valid update and blanks become null", () =>
    expect(ncrUpdateSchema.parse(ok)).toMatchObject({ id: 4, rmaNo: null, status: "waiting_supplier" }));
  it("needs a supplier response before closing", () => {
    const r = ncrUpdateSchema.safeParse({ ...ok, supplierResponse: "", status: "closed" });
    expect(r.success).toBe(false);
    if (!r.success) expect(r.error.issues[0].message).toBe("Record the supplier's response before closing the NCR.");
  });
});
