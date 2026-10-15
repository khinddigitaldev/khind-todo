import { describe, expect, it } from "vitest";
import { decisionProblems, type DecisionInput } from "./decision";

const base: DecisionInput = {
  decision: "accept", action: "accept", acceptQty: 100, rejectQty: 0, qtyReceived: 100,
  other: "", uaiReason: "", verdict: "accept",
};

describe("decisionProblems (same rules as approve_inspection)", () => {
  it("accepts a clean ACCEPT / ACCEPT", () => expect(decisionProblems(base)).toEqual([]));
  it("needs a decision and an action", () =>
    expect(decisionProblems({ ...base, decision: null })).toEqual(["Choose a lot decision and an action."]));
  it("only allows actions that fit the decision", () =>
    expect(decisionProblems({ ...base, decision: "reject", action: "accept", acceptQty: 0, rejectQty: 100 }))
      .toEqual(["Action ACCEPT is not allowed with decision REJECT."]));
  it("lets OTHERS use any action but needs a description", () => {
    expect(decisionProblems({ ...base, decision: "others", action: "scrap" })).toEqual(["Please describe the OTHERS decision."]);
    expect(decisionProblems({ ...base, decision: "others", action: "scrap", other: "Hold for engineering" })).toEqual([]);
  });
  it("needs accept + reject qty to equal the lot quantity", () =>
    expect(decisionProblems({ ...base, acceptQty: 60, rejectQty: 30 }))
      .toEqual(["Accept qty + Reject qty must equal the quantity received (100)."]));
  it("refuses negative or missing quantities", () =>
    expect(decisionProblems({ ...base, acceptQty: null })).toEqual(["Accept qty + Reject qty must equal the quantity received (100)."]));
  it("blocks ACCEPT / ACCEPT when the system verdict is Reject", () =>
    expect(decisionProblems({ ...base, verdict: "reject" })).toEqual(["The system verdict is Reject. Use UAI or another action."]));
  it("needs a reason for UAI", () => {
    expect(decisionProblems({ ...base, action: "uai", verdict: "reject" })).toEqual(["UAI needs a reason."]);
    expect(decisionProblems({ ...base, action: "uai", verdict: "reject", uaiReason: "Cosmetic only, customer agreed" })).toEqual([]);
  });
});
