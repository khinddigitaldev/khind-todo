import { describe, expect, it } from "vitest";
import { resolvePeriod } from "./periods";

const now = new Date("2026-10-12T09:00:00Z"); // 17:00 in Kuala Lumpur

describe("resolvePeriod (Malaysia time, UTC+8)", () => {
  it("defaults to this month", () =>
    expect(resolvePeriod({}, now)).toMatchObject({
      key: "this-month", fromIso: "2026-09-30T16:00:00.000Z", toIso: "2026-10-31T16:00:00.000Z",
      fromDate: "2026-10-01", toDate: "2026-10-31", label: "October 2026",
    }));
  it("handles last month", () =>
    expect(resolvePeriod({ period: "last-month" }, now)).toMatchObject({
      fromIso: "2026-08-31T16:00:00.000Z", toIso: "2026-09-30T16:00:00.000Z", fromDate: "2026-09-01", toDate: "2026-09-30",
    }));
  it("uses the Malaysian date just after midnight", () =>
    expect(resolvePeriod({}, new Date("2026-10-31T17:00:00Z")).label).toBe("November 2026"));
  it("handles the last 90 days", () =>
    expect(resolvePeriod({ period: "90d" }, now)).toMatchObject({ key: "90d", fromDate: "2026-07-15", toDate: "2026-10-12" }));
  it("accepts a valid custom range", () =>
    expect(resolvePeriod({ period: "custom", from: "2026-10-01", to: "2026-10-05" }, now)).toMatchObject({
      fromIso: "2026-09-30T16:00:00.000Z", toIso: "2026-10-05T16:00:00.000Z", label: "2026-10-01 to 2026-10-05",
    }));
  it("falls back to this month for a bad custom range", () =>
    expect(resolvePeriod({ period: "custom", from: "2026-10-09", to: "2026-10-01" }, now).key).toBe("this-month"));
});
