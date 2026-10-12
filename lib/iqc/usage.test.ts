import { describe, expect, it } from "vitest";
import { backupStatus, usageLevel } from "./usage";

describe("usageLevel", () => {
  it("is ok below 70%", () => expect(usageLevel(69, 100)).toBe("ok"));
  it("warns from 70%", () => expect(usageLevel(70, 100)).toBe("warn"));
  it("is danger from 85%", () => expect(usageLevel(85, 100)).toBe("danger"));
});

describe("backupStatus", () => {
  const now = new Date("2026-10-12T09:00:00Z");
  it("is danger when there has never been a backup", () =>
    expect(backupStatus(null, now)).toEqual({ days: null, level: "danger" }));
  it("is ok within 8 days", () => expect(backupStatus("2026-10-05T09:00:00Z", now)).toEqual({ days: 7, level: "ok" }));
  it("is danger after 8 days", () =>
    expect(backupStatus("2026-10-03T08:00:00Z", now)).toEqual({ days: 9, level: "danger" }));
});
