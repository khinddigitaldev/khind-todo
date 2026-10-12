import { describe, expect, it } from "vitest";
import { isOutOfTolerance, lotVerdict, measurementResult, reviewWarnings } from "./verdict";

const c0 = (found: number | null, cls: "critical" | "major" | "minor" = "major") => ({ defectClass: cls, found, ac: 0 });

describe("lotVerdict (c = 0 by default)", () => {
  it("accepts when every class has zero defects", () => {
    expect(lotVerdict([c0(0, "critical"), c0(0, "major"), c0(0, "minor")])).toBe("accept");
  });
  it("rejects when any class reaches Re = Ac + 1", () => {
    expect(lotVerdict([c0(0, "critical"), c0(1, "major"), c0(0, "minor")])).toBe("reject");
  });
  it("rejects as soon as one class fails, even if others are still empty", () => {
    expect(lotVerdict([c0(null, "critical"), c0(2, "major"), c0(null, "minor")])).toBe("reject");
  });
  it("is incomplete while a count is missing and nothing rejects yet", () => {
    expect(lotVerdict([c0(0, "critical"), c0(null, "major"), c0(0, "minor")])).toBe("incomplete");
  });
  it("respects a relaxed class (Ac = 1 for minor)", () => {
    expect(lotVerdict([c0(0, "critical"), c0(0, "major"), { defectClass: "minor", found: 1, ac: 1 }])).toBe("accept");
    expect(lotVerdict([c0(0, "critical"), c0(0, "major"), { defectClass: "minor", found: 2, ac: 1 }])).toBe("reject");
  });
});

describe("measurementResult", () => {
  it("is null with no readings", () => expect(measurementResult([], 1, 2)).toBeNull());
  it("is ok when all readings are inside min..max (inclusive)", () =>
    expect(measurementResult([1, 1.5, 2], 1, 2)).toBe("ok"));
  it("is ng when any reading is outside", () => expect(measurementResult([1, 2.01], 1, 2)).toBe("ng"));
  it("treats a missing limit as open", () => {
    expect(measurementResult([999], null, 10)).toBe("ng");
    expect(measurementResult([999], 1, null)).toBe("ok");
  });
});

describe("isOutOfTolerance", () => {
  it("flags values below min and above max only", () => {
    expect(isOutOfTolerance(0.99, 1, 2)).toBe(true);
    expect(isOutOfTolerance(1, 1, 2)).toBe(false);
    expect(isOutOfTolerance(2, 1, 2)).toBe(false);
    expect(isOutOfTolerance(2.0001, 1, 2)).toBe(true);
  });
});

describe("reviewWarnings", () => {
  it("is empty when nothing is wrong", () =>
    expect(reviewWarnings({ ngItems: 0, ngMeasurements: 0, totalFound: 0 })).toEqual([]));
  it("warns when NG items exist but no defects were counted", () =>
    expect(reviewWarnings({ ngItems: 2, ngMeasurements: 0, totalFound: 0 })).toEqual([
      "2 checklist items are NG but no defects were counted. Review before accepting.",
    ]));
  it("warns about out-of-tolerance dimensions with no defects counted", () =>
    expect(reviewWarnings({ ngItems: 0, ngMeasurements: 1, totalFound: 0 })).toEqual([
      "1 dimension is out of tolerance but no defects were counted. Review before accepting.",
    ]));
  it("does not warn once defects are counted", () =>
    expect(reviewWarnings({ ngItems: 1, ngMeasurements: 1, totalFound: 1 })).toEqual([]));
});
