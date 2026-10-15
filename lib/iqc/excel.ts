import ExcelJS from "exceljs";
import type { InspectionBundle } from "./load";
import { ACTION_LABELS, CATEGORY_LABELS, DECISION_LABELS } from "./types";
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
    ["Incoming Inspection Report (IQC) — Part A", ""],
    ["Inspection no.", b.number],
    ["Status", b.status],
    ["Supplier", `${b.supplier.code} · ${b.supplier.name}`],
    ["Supplier category", b.supplier.category ? CATEGORY_LABELS[b.supplier.category] : ""],
    ["Part", `${b.part.partNo} · ${b.part.name}`],
    ["Drawing", [b.part.drawingNo, b.part.drawingRev].filter(Boolean).join(" rev ")],
    ["GRN / Storage List No", b.grnNo],
    ["PO no.", b.poNo],
    ["DO no.", b.doNo],
    ["Ref no.", b.refNo],
    ["Lot / batch no.", b.lotNo],
    ["Motor part no.", b.motorPartNo],
    ["Component marking", b.componentMarking],
    ["Quantity received", b.qtyReceived],
    ["Received at", when(b.receivedAt)],
    ["Sample size", b.sampleSize ?? (b.quick ? "quick check" : "")],
    ["Quick check", b.quick ? `${(b.quick.result ?? "").toUpperCase()} · qty ${b.quick.qty ?? ""} · ${b.quick.remark}` : ""],
    ["Sample override reason", b.sampleOverrideReason ?? ""],
    ["Stage", b.stage],
    ["Template", b.templateVersion ? `${b.templateName} v${b.templateVersion}` : ""],
    ["Instrument(s)", b.instrument],
    ["Prepared by (Inspector)", b.inspector.name],
    ["Signed at", when(b.submittedAt)],
    ["System verdict", b.verdict ?? ""],
    ["Lot decision", b.decision ? DECISION_LABELS[b.decision] : ""],
    ["Others (decision)", b.decisionOther ?? ""],
    ["Action", b.action ? ACTION_LABELS[b.action] : ""],
    ["Accept qty", b.acceptQty ?? ""],
    ["Reject qty", b.rejectQty ?? ""],
    ["UAI reason", b.uaiReason ?? ""],
    ["Verified & approved by (QC Supervisor)", b.approver?.name ?? ""],
    ["Signed at", when(b.approvedAt)],
    ["MDR", b.mdr?.number ?? ""],
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
