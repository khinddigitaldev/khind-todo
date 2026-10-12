import { describe, expect, it } from "vitest";
import { validateBands, type BandInput } from "./bands";

const b = (lotMin: number, lotMax: number | null, n: number | null = 5, t: number | null = 8): BandInput => ({
  lotMin, lotMax, sampleNormal: n, sampleTightened: t,
});

describe("validateBands", () => {
  it("accepts a continuous table starting at 1 and ending open", () =>
    expect(validateBands([b(1, 15, null, null), b(16, 50), b(51, null)])).toEqual([]));
  it("needs at least one band", () => expect(validateBands([])).toEqual(["Add at least one band."]));
  it("must start at lot size 1", () => expect(validateBands([b(2, null)])).toContain("The first band must start at 1."));
  it("finds gaps", () =>
    expect(validateBands([b(1, 15), b(20, null)])).toContain("Gap: no band covers lot sizes 16 to 19."));
  it("finds overlaps", () =>
    expect(validateBands([b(1, 15), b(10, null)])).toContain("Overlap: lot sizes 10 to 15 are in two bands."));
  it("needs the last band to be open-ended", () =>
    expect(validateBands([b(1, 100)])).toContain("The last band must have no upper limit (leave 'to' empty)."));
  it("needs tightened >= normal", () =>
    expect(validateBands([b(1, null, 10, 8)])).toContain("Band 1: tightened sample (8) must be at least the normal sample (10)."));
});
