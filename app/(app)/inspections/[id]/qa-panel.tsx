"use client";

import { useActionState, useState } from "react";
import { Card, Field, Notice, buttonClass, inputClass } from "@/components/ui";
import { decisionProblems } from "@/lib/iqc/decision";
import type { InspectionBundle } from "@/lib/iqc/load";
import { ACTION_LABELS, ALLOWED_ACTIONS, DECISION_LABELS, type LotAction, type LotDecision } from "@/lib/iqc/types";
import { approve, changeStage, overrideSample, reopen, sendBack } from "../qa-actions";
import type { FormState } from "../../master/actions";

function Result({ state }: { state: FormState }) {
  if (state.error) return <Notice tone="red">{state.error}</Notice>;
  if (state.ok) return <Notice tone="green">{state.ok}</Notice>;
  return null;
}

const toQty = (s: string) => (s.trim() === "" ? null : Number(s));

function DecisionForm({ b }: { b: InspectionBundle }) {
  const [state, action, pending] = useActionState<FormState, FormData>(approve, {});
  const rejected = b.verdict === "reject";
  const [decision, setDecision] = useState<LotDecision>(rejected ? "reject" : "accept");
  const [lotAction, setLotAction] = useState<LotAction>(rejected ? "rts" : "accept");
  const [acceptQty, setAcceptQty] = useState(rejected ? "0" : String(b.qtyReceived));
  const [rejectQty, setRejectQty] = useState(rejected ? String(b.qtyReceived) : "0");
  const [other, setOther] = useState("");
  const [uaiReason, setUaiReason] = useState("");
  const [raiseMdr, setRaiseMdr] = useState(false);

  const problems = decisionProblems({
    decision, action: lotAction, acceptQty: toQty(acceptQty), rejectQty: toQty(rejectQty),
    qtyReceived: b.qtyReceived, other, uaiReason, verdict: b.verdict,
  });
  const chooseDecision = (d: LotDecision) => {
    setDecision(d);
    if (!ALLOWED_ACTIONS[d].includes(lotAction)) setLotAction(ALLOWED_ACTIONS[d][0]);
  };

  return (
    <Card title="LOT DECISION (QC Supervisor)">
      <form action={action} className="flex flex-col gap-4">
        <input type="hidden" name="id" value={b.id} />
        <fieldset className="flex flex-col gap-2">
          <legend className="mb-1 text-sm font-medium">Lot Decision</legend>
          <div className="flex flex-wrap gap-2">
            {(Object.keys(DECISION_LABELS) as LotDecision[]).map((d) => (
              <label key={d} className={`flex min-h-11 items-center gap-2 rounded-lg border px-3 ${decision === d ? "border-zinc-900 dark:border-zinc-100" : "border-zinc-300 dark:border-zinc-700"}`}>
                <input type="radio" name="decision" value={d} checked={decision === d} onChange={() => chooseDecision(d)} className="h-5 w-5" />
                {DECISION_LABELS[d]}{d === "reject" && " → raise MDR"}
              </label>
            ))}
          </div>
          {decision === "others" && (
            <input name="other" aria-label="Describe the OTHERS decision" placeholder="Others: describe the decision" value={other} maxLength={300}
              onChange={(e) => setOther(e.target.value)} className={inputClass} />
          )}
        </fieldset>

        <fieldset className="flex flex-col gap-2">
          <legend className="mb-1 text-sm font-medium">Action</legend>
          <div className="grid gap-2 sm:grid-cols-3">
            {ALLOWED_ACTIONS[decision].map((a) => (
              <label key={a} className={`flex min-h-11 items-center gap-2 rounded-lg border px-3 ${lotAction === a ? "border-zinc-900 dark:border-zinc-100" : "border-zinc-300 dark:border-zinc-700"}`}>
                <input type="radio" name="action" value={a} checked={lotAction === a} onChange={() => setLotAction(a)} className="h-5 w-5" />
                {ACTION_LABELS[a]}
              </label>
            ))}
          </div>
          {lotAction === "uai" && (
            <Field label="UAI reason (required)">
              <textarea name="uaiReason" rows={2} maxLength={500} value={uaiReason} onChange={(e) => setUaiReason(e.target.value)} className={inputClass} />
            </Field>
          )}
        </fieldset>

        <div className="grid gap-3 sm:grid-cols-3">
          <Field label="Accept Qty"><input name="acceptQty" inputMode="numeric" value={acceptQty} onChange={(e) => setAcceptQty(e.target.value)} className={inputClass} /></Field>
          <Field label="Reject Qty"><input name="rejectQty" inputMode="numeric" value={rejectQty} onChange={(e) => setRejectQty(e.target.value)} className={inputClass} /></Field>
          <div className="flex items-end text-sm text-zinc-500">Lot qty: {b.qtyReceived}</div>
        </div>

        {decision !== "reject" && (
          <label className="flex min-h-11 items-center gap-2 text-sm" title="Raise an MDR to inform the supplier even when the lot is accepted">
            <input type="checkbox" name="raiseMdr" checked={raiseMdr} onChange={(e) => setRaiseMdr(e.target.checked)} className="h-5 w-5" />
            Raise MDR (inform the supplier)
          </label>
        )}

        {problems.length > 0 && (
          <Notice tone="amber"><ul className="list-disc pl-5">{problems.map((p) => <li key={p}>{p}</li>)}</ul></Notice>
        )}
        <button disabled={pending || problems.length > 0} className={`${buttonClass.primary} self-start`}>
          {pending ? "Signing…" : "Sign & approve"}
        </button>
        <p className="text-xs text-zinc-500">Sign &amp; approve records you as &ldquo;Verified &amp; Approved by (QC Supervisor)&rdquo; with today&apos;s date and time.</p>
        <Result state={state} />
      </form>
    </Card>
  );
}

export function QaPanel({ b, meId }: { b: InspectionBundle; meId: string }) {
  const [returnState, returnAction, returning] = useActionState<FormState, FormData>(sendBack, {});
  const [reopenState, reopenAction, reopening] = useActionState<FormState, FormData>(reopen, {});
  const [sampleState, sampleAction, sampling] = useActionState<FormState, FormData>(overrideSample, {});
  const [stageState, stageAction, staging] = useActionState<FormState, FormData>(changeStage, {});
  const mine = b.inspector.id === meId;

  return (
    <div className="flex flex-col gap-4 print:hidden">
      {b.status === "submitted" && mine && (
        <Notice tone="gray">You performed this inspection, so another QC Supervisor must decide.</Notice>
      )}

      {b.status === "submitted" && !mine && <DecisionForm b={b} />}

      {b.status === "submitted" && (
        <Card title="Return to the inspector">
          <form action={returnAction} className="flex flex-col gap-3">
            <input type="hidden" name="id" value={b.id} />
            <Field label="What needs fixing?"><textarea name="comment" required maxLength={500} rows={2} className={inputClass} /></Field>
            <button disabled={returning} className={`${buttonClass.secondary} self-start`}>Return to inspector</button>
            <Result state={returnState} />
          </form>
        </Card>
      )}

      {b.status === "approved" && (
        <Card title="Reopen">
          <form action={reopenAction} className="flex flex-col gap-3">
            <input type="hidden" name="id" value={b.id} />
            <Field label="Reason for reopening"><textarea name="reason" required maxLength={500} rows={2} className={inputClass} /></Field>
            <button disabled={reopening} className={`${buttonClass.secondary} self-start`}>Reopen</button>
            <Result state={reopenState} />
          </form>
        </Card>
      )}

      {b.status !== "approved" && !b.quick && (
        <Card title="Sampling (QC Supervisor only)">
          <div className="grid gap-4 sm:grid-cols-2">
            <form action={sampleAction} className="flex flex-col gap-2">
              <input type="hidden" name="id" value={b.id} />
              <Field label={`Override sample size (1–${b.qtyReceived})`}>
                <input name="size" type="number" min={1} max={b.qtyReceived} required defaultValue={b.sampleSize ?? undefined} className={inputClass} />
              </Field>
              <Field label="Reason"><input name="reason" required maxLength={300} className={inputClass} /></Field>
              <button disabled={sampling} className={`${buttonClass.secondary} self-start`}>Override</button>
              <Result state={sampleState} />
            </form>
            {(b.status === "draft" || b.status === "returned") && (
              <form action={stageAction} className="flex flex-col gap-2">
                <input type="hidden" name="id" value={b.id} />
                <Field label="Inspection stage">
                  <select name="stage" defaultValue={b.stage} className={inputClass}>
                    <option value="normal">Normal</option>
                    <option value="tightened">Tightened</option>
                  </select>
                </Field>
                <button disabled={staging} className={`${buttonClass.secondary} self-start`}>Change stage</button>
                <Result state={stageState} />
              </form>
            )}
          </div>
        </Card>
      )}
    </div>
  );
}
