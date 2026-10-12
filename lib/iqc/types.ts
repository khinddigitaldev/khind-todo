export type Role = "inspector" | "qa" | "purchasing" | "management" | "admin";
export const ROLE_LABELS: Record<Role, string> = {
  inspector: "Inspector",
  qa: "QA approver",
  purchasing: "Purchasing",
  management: "Management",
  admin: "Admin",
};

export type DefectClass = "critical" | "major" | "minor";
export const DEFECT_CLASSES: readonly DefectClass[] = ["critical", "major", "minor"];

export type CheckResult = "ok" | "ng" | "na";
export type InspectionStatus = "draft" | "submitted" | "returned" | "approved";
export type NcrStatus = "open" | "waiting_supplier" | "closed";

export type Disposition = "accept" | "concession" | "sort" | "reject";
export const DISPOSITION_LABELS: Record<Disposition, string> = {
  accept: "Accept",
  concession: "Accept with concession",
  sort: "Sort / rework",
  reject: "Reject (return to vendor)",
};
