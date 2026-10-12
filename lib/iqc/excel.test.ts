import ExcelJS from "exceljs";
import { describe, expect, it } from "vitest";
import { buildInspectionWorkbook } from "./excel";
import type { InspectionBundle } from "./load";

const b: InspectionBundle = {
  id: 1, number: "IQC-2026-0001", status: "approved", verdict: "reject", disposition: "reject",
  supplier: { id: 1, code: "DEMO-S2", name: "Beta Motors (Demo)", status: "approved" },
  part: { id: 2, partNo: "DEMO-P2", name: "Fan motor 45W (Demo)", drawingNo: "DRW-DEMO-002", drawingRev: "C", regulated: false },
  poNo: "PO1", doNo: "DO1", lotNo: "L1", qtyReceived: 120, receivedAt: "2026-10-12T00:30:00Z", stage: "normal",
  sampleSize: 15, sampleOverrideReason: null, instrument: "Caliper C-01", sectionNotes: { Visual: "Daylight lamp" },
  inspector: { id: "u1", name: "Ali (Inspector demo)" }, approver: { id: "u2", name: "Qistina (QA demo)" },
  submittedAt: "2026-10-12T02:00:00Z", approvedAt: "2026-10-12T03:00:00Z",
  returnComment: null, concessionReason: null, reopenReason: null, templateName: "Fan motor (Demo)", templateVersion: 1,
  items: [{ id: 11, section: "Visual", position: 1, text: "No scratches" }],
  characteristics: [{ id: 21, name: "Shaft diameter", nominal: 8, min: 7.98, max: 8.02, unit: "mm", defectClass: "critical" }],
  checks: { 11: { result: "ng", comment: "Scratch" } },
  readings: { 21: [8.0, 8.03] },
  defects: [
    { defectClass: "critical", found: 1, ac: 0, description: "Shaft oversize" },
    { defectClass: "major", found: 0, ac: 0, description: "" },
    { defectClass: "minor", found: 0, ac: 0, description: "" },
  ],
  attachments: [], ncr: { id: 1, number: "NCR-2026-0001", status: "open" },
};

describe("buildInspectionWorkbook", () => {
  it("creates the four sheets with the key values", async () => {
    const buffer = await buildInspectionWorkbook(b).xlsx.writeBuffer();
    const wb = new ExcelJS.Workbook();
    await wb.xlsx.load(buffer);
    expect(wb.worksheets.map((w) => w.name)).toEqual(["Summary", "Checklist", "Dimensional", "Defects"]);
    const values = wb.getWorksheet("Summary")!.getColumn(2).values;
    expect(values).toContain("IQC-2026-0001");
    expect(values).toContain("Reject (return to vendor)");
    expect(wb.getWorksheet("Checklist")!.getRow(2).values).toContain("NG");
    expect(wb.getWorksheet("Dimensional")!.getRow(2).values).toContain("NG");
    expect(wb.getWorksheet("Defects")!.getRow(2).values).toContain("Shaft oversize");
  });
});
