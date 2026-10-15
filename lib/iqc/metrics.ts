import type { LotAction, LotDecision } from "./types";

export type LotRow = {
  supplierId: number;
  supplierName: string;
  decision: LotDecision;
  action: LotAction;
  quick: boolean; // quick-check lots count in LAR but not in PPM
  unitsInspected: number;
  defectiveFound: number;
  receivedAt: string;
  approvedAt: string;
};

export type Metrics = {
  lots: number;
  accepted: number;
  rejected: number;
  lar: number | null; // % of lots ACCEPT + ACCEPT; UAI counts as NOT accepted
  ppm: number | null; // defective units found per million units inspected
  medianDecisionHours: number | null; // receipt -> QA decision
};

const HOUR = 3_600_000;

function median(values: number[]): number | null {
  if (values.length === 0) return null;
  const s = [...values].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
}

export function computeMetrics(rows: LotRow[]): Metrics {
  const lots = rows.length;
  const accepted = rows.filter((r) => r.decision === "accept" && r.action === "accept").length;
  const rejected = rows.filter((r) => r.decision === "reject").length;
  const sampled = rows.filter((r) => !r.quick);
  const units = sampled.reduce((sum, r) => sum + r.unitsInspected, 0);
  const defective = sampled.reduce((sum, r) => sum + r.defectiveFound, 0);
  const hours = rows.map((r) => (Date.parse(r.approvedAt) - Date.parse(r.receivedAt)) / HOUR);
  const med = median(hours);
  return {
    lots,
    accepted,
    rejected,
    lar: lots ? Math.round((accepted / lots) * 1000) / 10 : null,
    ppm: units ? Math.round((defective / units) * 1_000_000) : null,
    medianDecisionHours: med === null ? null : Math.round(med * 10) / 10,
  };
}

export function supplierBreakdown(rows: LotRow[]) {
  const groups = new Map<number, LotRow[]>();
  for (const r of rows) groups.set(r.supplierId, [...(groups.get(r.supplierId) ?? []), r]);
  return [...groups.entries()]
    .map(([supplierId, list]) => ({ supplierId, supplierName: list[0].supplierName, ...computeMetrics(list) }))
    .sort((a, b) => b.lots - a.lots || a.supplierName.localeCompare(b.supplierName));
}

export function ncrAgeDays(createdAt: string, closedAt: string | null, now: Date): number {
  const end = closedAt ? Date.parse(closedAt) : now.getTime();
  return Math.floor((end - Date.parse(createdAt)) / (24 * HOUR));
}
