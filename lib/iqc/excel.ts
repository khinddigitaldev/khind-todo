import ExcelJS from "exceljs";
import type { InspectionBundle } from "./load";
import { DISPOSITION_LABELS } from "./types";
import { measurementResult } from "./verdict";

const RESULT = { ok: "OK", ng: "NG", na: "N/A" } as const;
const when = (iso: string | null) => (iso ? new Date(iso).toLocaleString("en-MY", { timeZone: "Asia/Kuala_Lumpur" }) : "");

// Same four sheets as the old HTML checklist's "Save to Excel".
export function buildInspectionWorkbook(b: InspectionBundle): ExcelJS.Workbook {
  const wb = new ExcelJS.Workbook();
  wb.creator = "KHIND IQC";

  const s = wb.addWorksheet("Summary");
  s.columns = [{ width: 32 }, { width: 50 }];
  s.addRows([
    ["Incoming Quality Inspection", ""],
    ["Inspection no.", b.number],
    ["Status", b.status],
    ["Supplier", `${b.supplier.code} · ${b.supplier.name}`],
    ["Part", `${b.part.partNo} · ${b.part.name}`],
    ["Drawing", [b.part.drawingNo, b.part.drawingRev].filter(Boolean).join(" rev ")],
    ["PO no.", b.poNo],
    ["DO / invoice no.", b.doNo],
    ["Lot / batch no.", b.lotNo],
    ["Quantity received", b.qtyReceived],
    ["Received at", when(b.receivedAt)],
    ["Sample size", b.sampleSize],
    ["Sample override reason", b.sampleOverrideReason ?? ""],
    ["Stage", b.stage],
    ["Template", `${b.templateName} v${b.templateVersion}`],
    ["Instrument(s)", b.instrument],
    ["Inspector", b.inspector.name],
    ["Submitted at", when(b.submittedAt)],
    ["System verdict", b.verdict ?? ""],
    ["Disposition", b.disposition ? DISPOSITION_LABELS[b.disposition] : ""],
    ["Concession reason", b.concessionReason ?? ""],
    ["Approved by", b.approver?.name ?? ""],
    ["Approved at", when(b.approvedAt)],
    ["NCR", b.ncr?.number ?? ""],
  ]);
  s.getRow(1).font = { bold: true, size: 14 };

  const c = wb.addWorksheet("Checklist");
  c.columns = [{ header: "Section", width: 30 }, { header: "Check", width: 70 }, { header: "Result", width: 10 }, { header: "Comment", width: 40 }];
  for (const item of b.items) {
    const check = b.checks[item.id];
    c.addRow([item.section, item.text, check ? RESULT[check.result] : "", check?.comment ?? ""]);
  }
  for (const [section, note] of Object.entries(b.sectionNotes)) if (note) c.addRow([section, "Section notes", "", note]);

  const d = wb.addWorksheet("Dimensional");
  d.columns = [
    { header: "Characteristic", width: 30 }, { header: "Nominal", width: 10 }, { header: "Min", width: 10 },
    { header: "Max", width: 10 }, { header: "Unit", width: 8 }, { header: "Readings", width: 40 }, { header: "Result", width: 10 },
  ];
  for (const ch of b.characteristics) {
    const values = b.readings[ch.id] ?? [];
    const r = measurementResult(values, ch.min, ch.max);
    d.addRow([ch.name, ch.nominal, ch.min, ch.max, ch.unit, values.join(", "), r ? r.toUpperCase() : ""]);
  }

  const x = wb.addWorksheet("Defects");
  x.columns = [{ header: "Class", width: 12 }, { header: "Found", width: 8 }, { header: "Ac", width: 6 }, { header: "Re", width: 6 }, { header: "Description", width: 60 }];
  for (const df of b.defects) x.addRow([df.defectClass, df.found ?? "", df.ac, df.ac + 1, df.description]);

  for (const ws of [c, d, x]) ws.getRow(1).font = { bold: true };
  return wb;
}
