import { describe, expect, it } from "vitest";
import { buildSummary, type SummaryInput } from "./summary";

const base: SummaryInput = {
  quick: null,
  inspectorName: "Ali (Inspector demo)",
  sampleSize: 15,
  items: [{ id: 1 }, { id: 2 }],
  checks: { 1: { result: "ok" }, 2: { result: "na" } },
  characteristics: [{ id: 10, min: 7.98, max: 8.02 }],
  readings: { 10: [8.0, 8.01] },
};

describe("buildSummary", () => {
  it("lists the checklist and dimensional sheets with results", () =>
    expect(buildSummary(base)).toEqual([
      { form: "Checklist", test: "General checklist", testedBy: "Ali (Inspector demo)", samples: 15, ng: 0, result: "OK" },
      { form: "F1-2", test: "Dimensional inspection", testedBy: "Ali (Inspector demo)", samples: 2, ng: 0, result: "OK" },
    ]));
  it("counts NG items and NG dimensions", () => {
    const rows = buildSummary({ ...base, checks: { 1: { result: "ng" }, 2: { result: "ok" } }, readings: { 10: [8.05] } });
    expect(rows.map((r) => [r.ng, r.result])).toEqual([[1, "NG"], [1, "NG"]]);
  });
  it("shows no result while something is unanswered", () => {
    const rows = buildSummary({ ...base, checks: { 1: { result: "ok" } }, readings: {} });
    expect(rows.map((r) => r.result)).toEqual([null, null]);
  });
  it("leaves out the dimensional row when the template has no dimensions", () =>
    expect(buildSummary({ ...base, characteristics: [], readings: {} }).map((r) => r.form)).toEqual(["Checklist"]));
  it("shows only the quick check for quick lots", () =>
    expect(buildSummary({ ...base, quick: { result: "ng", qty: 40 } })).toEqual([
      { form: "Cover", test: "Appearance & Fitting (quick check)", testedBy: "Ali (Inspector demo)", samples: 40, ng: null, result: "NG" },
    ]));
});
