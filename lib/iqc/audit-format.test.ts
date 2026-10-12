import { describe, expect, it } from "vitest";
import { describeChange } from "./audit-format";

describe("describeChange", () => {
  it("describes a created inspection", () =>
    expect(describeChange({ table_name: "inspections", action: "insert", changes: { number: "IQC-2026-0001" } })).toEqual(["Inspection IQC-2026-0001 created"]));
  it("lists changed fields as old -> new with friendly names", () =>
    expect(describeChange({ table_name: "inspections", action: "update", changes: { status: ["draft", "submitted"], lot_no: [null, "L1"] } }))
      .toEqual(["Status: draft → submitted", "Lot no.: (empty) → L1"]));
  it("names the table for child rows", () =>
    expect(describeChange({ table_name: "inspection_checks", action: "update", changes: { result: ["ok", "ng"] } }))
      .toEqual(["Checklist: Result: ok → ng"]));
  it("shortens long values", () => {
    const long = "x".repeat(200);
    expect(describeChange({ table_name: "ncrs", action: "update", changes: { supplier_response: [null, long] } })[0].length).toBeLessThan(140);
  });
  it("summarises inserts of child rows", () =>
    expect(describeChange({ table_name: "attachments", action: "insert", changes: { id: 5 } })).toEqual(["Photo added"]));
});
