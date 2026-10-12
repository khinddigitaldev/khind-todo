import { describe, expect, it } from "vitest";
import { computeMetrics, ncrAgeDays, supplierBreakdown, type LotRow } from "./metrics";

const row = (over: Partial<LotRow>): LotRow => ({
  supplierId: 1, supplierName: "Alpha (Demo)", disposition: "accept", unitsInspected: 10, defectiveFound: 0,
  receivedAt: "2026-10-01T08:00:00Z", approvedAt: "2026-10-01T12:00:00Z", ...over,
});

describe("computeMetrics", () => {
  it("returns nulls for an empty period", () =>
    expect(computeMetrics([])).toEqual({ lots: 0, accepted: 0, rejected: 0, lar: null, ppm: null, medianDecisionHours: null }));

  it("counts concessions as not accepted, and computes PPM on units inspected", () => {
    const m = computeMetrics([
      row({}),
      row({ disposition: "concession", defectiveFound: 1 }),
      row({ disposition: "reject", defectiveFound: 2 }),
      row({ disposition: "accept", approvedAt: "2026-10-02T08:00:00Z" }),
    ]);
    expect(m.lots).toBe(4);
    expect(m.accepted).toBe(2);
    expect(m.rejected).toBe(1);
    expect(m.lar).toBe(50);
    expect(m.ppm).toBe(75000); // 3 defective / 40 units
    expect(m.medianDecisionHours).toBe(4); // [4, 4, 4, 24] -> median of middle two = 4
  });

  it("rounds LAR to one decimal place", () => {
    const m = computeMetrics([row({}), row({}), row({ disposition: "reject" })]);
    expect(m.lar).toBe(66.7);
  });
});

describe("supplierBreakdown", () => {
  it("groups by supplier, busiest first", () => {
    const out = supplierBreakdown([
      row({ supplierId: 2, supplierName: "Beta (Demo)" }),
      row({}),
      row({ disposition: "reject" }),
    ]);
    expect(out.map((s) => [s.supplierName, s.lots, s.lar])).toEqual([
      ["Alpha (Demo)", 2, 50],
      ["Beta (Demo)", 1, 100],
    ]);
  });
});

describe("ncrAgeDays", () => {
  const now = new Date("2026-10-12T00:00:00Z");
  it("counts open NCRs up to now", () => expect(ncrAgeDays("2026-10-02T00:00:00Z", null, now)).toBe(10));
  it("counts closed NCRs up to the close date", () =>
    expect(ncrAgeDays("2026-10-02T00:00:00Z", "2026-10-05T12:00:00Z", now)).toBe(3));
});
