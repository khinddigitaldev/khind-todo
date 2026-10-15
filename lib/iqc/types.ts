export type Role = "inspector" | "qa" | "purchasing" | "management" | "admin";
export const ROLE_LABELS: Record<Role, string> = {
  inspector: "Inspector",
  qa: "QC Supervisor",
  purchasing: "Purchasing",
  management: "Management",
  admin: "Admin",
};

export type DefectClass = "critical" | "major" | "minor";
export const DEFECT_CLASSES: readonly DefectClass[] = ["critical", "major", "minor"];

export type CheckResult = "ok" | "ng" | "na";
export type InspectionStatus = "draft" | "submitted" | "returned" | "approved";
export type NcrStatus = "open" | "waiting_supplier" | "closed";

export type SupplierCategory = "local" | "import" | "subcont";
export const CATEGORY_LABELS: Record<SupplierCategory, string> = { local: "LOCAL", import: "IMPORT", subcont: "SUBCONT" };

// The KHIND lot decision (Part A): Decision + Action + quantities.
export type LotDecision = "accept" | "reject" | "others";
export type LotAction = "accept" | "uai" | "online_rework" | "offline_rework" | "rts" | "scrap";
export const DECISION_LABELS: Record<LotDecision, string> = { accept: "ACCEPT", reject: "REJECT", others: "OTHERS" };
export const ACTION_LABELS: Record<LotAction, string> = {
  accept: "ACCEPT",
  uai: "UAI (use as is)",
  online_rework: "ONLINE REWORK/SORTING",
  offline_rework: "OFFLINE REWORK/SORTING",
  rts: "RTS (return to supplier)",
  scrap: "SCRAP",
};
export const ALL_ACTIONS: readonly LotAction[] = ["accept", "uai", "online_rework", "offline_rework", "rts", "scrap"];
export const ALLOWED_ACTIONS: Record<LotDecision, readonly LotAction[]> = {
  accept: ["accept", "uai"],
  reject: ["uai", "online_rework", "offline_rework", "rts", "scrap"],
  others: ALL_ACTIONS,
};
