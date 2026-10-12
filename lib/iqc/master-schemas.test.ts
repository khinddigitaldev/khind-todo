import { describe, expect, it } from "vitest";
import { firstError, partSchema, supplierSchema } from "./master-schemas";

describe("supplierSchema", () => {
  const ok = { code: "DEMO-S9", name: "Omega (Demo)", status: "approved", email: "", active: true };
  it("accepts a valid supplier and turns empty email into null", () =>
    expect(supplierSchema.parse(ok)).toMatchObject({ code: "DEMO-S9", email: null }));
  it("upper-cases and trims the code", () =>
    expect(supplierSchema.parse({ ...ok, code: " demo-s9 " }).code).toBe("DEMO-S9"));
  it("rejects a bad email with a readable message", () => {
    const r = supplierSchema.safeParse({ ...ok, email: "not-an-email" });
    expect(r.success).toBe(false);
    if (!r.success) expect(firstError(r.error.issues)).toBe("Email: enter a valid email or leave it empty.");
  });
});

describe("partSchema", () => {
  const ok = { partNo: "DEMO-P9", name: "Grille (Demo)", category: "", drawingNo: "", drawingRev: "",
    regulated: false, templateId: "1", inspectionType: "sampling", active: true };
  it("accepts a valid part and parses the template id", () =>
    expect(partSchema.parse(ok)).toMatchObject({ partNo: "DEMO-P9", templateId: 1, category: null }));
  it("requires a template unless the part is not inspected", () => {
    expect(partSchema.safeParse({ ...ok, templateId: "" }).success).toBe(false);
    expect(partSchema.safeParse({ ...ok, templateId: "", inspectionType: "none" }).success).toBe(true);
  });
});
