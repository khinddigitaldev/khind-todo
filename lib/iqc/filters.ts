import type { InspectionStatus, LotDecision } from "./types";

export type ListFilters = {
  status?: InspectionStatus;
  supplierId?: number;
  decision?: LotDecision;
  from?: string;
  to?: string;
  mine?: boolean;
};

const one = (v: string | string[] | undefined) => (typeof v === "string" && v !== "" ? v : undefined);
const DATE = /^\d{4}-\d{2}-\d{2}$/;
const STATUSES = ["draft", "submitted", "returned", "approved"];
const DECISIONS = ["accept", "reject", "others"];

// Bad or missing filter values are ignored, never an error page.
export function parseListFilters(sp: Record<string, string | string[] | undefined>): ListFilters {
  const f: ListFilters = {};
  const status = one(sp.status);
  if (status && STATUSES.includes(status)) f.status = status as InspectionStatus;
  const supplier = one(sp.supplier);
  if (supplier && /^\d+$/.test(supplier)) f.supplierId = Number(supplier);
  const decision = one(sp.decision);
  if (decision && DECISIONS.includes(decision)) f.decision = decision as LotDecision;
  const from = one(sp.from);
  if (from && DATE.test(from)) f.from = from;
  const to = one(sp.to);
  if (to && DATE.test(to)) f.to = to;
  if (one(sp.mine) === "1") f.mine = true;
  return f;
}
