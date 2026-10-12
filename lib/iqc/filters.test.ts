import { describe, expect, it } from "vitest";
import { parseListFilters } from "./filters";

describe("parseListFilters", () => {
  it("keeps valid values", () =>
    expect(parseListFilters({ status: "submitted", supplier: "3", disposition: "reject", from: "2026-10-01", to: "2026-10-31", mine: "1" }))
      .toEqual({ status: "submitted", supplierId: 3, disposition: "reject", from: "2026-10-01", to: "2026-10-31", mine: true }));
  it("drops invalid values instead of failing", () =>
    expect(parseListFilters({ status: "nonsense", supplier: "abc", from: "01/10/2026", disposition: ["accept", "reject"] })).toEqual({}));
  it("ignores empty strings", () => expect(parseListFilters({ status: "", supplier: "" })).toEqual({}));
});
