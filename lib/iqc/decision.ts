import { ALLOWED_ACTIONS, type LotAction, type LotDecision } from "./types";

// Live feedback for the QC Supervisor's lot decision. approve_inspection in
// the database enforces the same rules with the same messages.

export type DecisionInput = {
  decision: LotDecision | null;
  action: LotAction | null;
  acceptQty: number | null;
  rejectQty: number | null;
  qtyReceived: number;
  other: string;
  uaiReason: string;
  verdict: "accept" | "reject" | null;
};

export function decisionProblems(d: DecisionInput): string[] {
  if (!d.decision || !d.action) return ["Choose a lot decision and an action."];
  const problems: string[] = [];
  if (!ALLOWED_ACTIONS[d.decision].includes(d.action)) {
    problems.push(`Action ${d.action.toUpperCase()} is not allowed with decision ${d.decision.toUpperCase()}.`);
  }
  if (d.decision === "others" && d.other.trim() === "") problems.push("Please describe the OTHERS decision.");
  const qtyOk =
    d.acceptQty !== null && d.rejectQty !== null && d.acceptQty >= 0 && d.rejectQty >= 0 && d.acceptQty + d.rejectQty === d.qtyReceived;
  if (!qtyOk) problems.push(`Accept qty + Reject qty must equal the quantity received (${d.qtyReceived}).`);
  if (d.verdict === "reject" && d.decision === "accept" && d.action === "accept") {
    problems.push("The system verdict is Reject. Use UAI or another action.");
  }
  if (d.action === "uai" && d.uaiReason.trim() === "") problems.push("UAI needs a reason.");
  return problems;
}
