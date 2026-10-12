"use client";

import { useActionState, useState } from "react";
import { Card, Field, Notice, buttonClass, inputClass } from "@/components/ui";
import type { InspectionBundle } from "@/lib/iqc/load";
import { DISPOSITION_LABELS, type Disposition } from "@/lib/iqc/types";
import { approve, changeStage, overrideSample, reopen, sendBack } from "../qa-actions";
import type { FormState } from "../../master/actions";

function Result({ state }: { state: FormState }) {
  if (state.error) return <Notice tone="red">{state.error}</Notice>;
  if (state.ok) return <Notice tone="green">{state.ok}</Notice>;
  return null;
}

export function QaPanel({ b, meId }: { b: InspectionBundle; meId: string }) {
  const [approveState, approveAction, approving] = useActionState<FormState, FormData>(approve, {});
  const [returnState, returnAction, returning] = useActionState<FormState, FormData>(sendBack, {});
  const [reopenState, reopenAction, reopening] = useActionState<FormState, FormData>(reopen, {});
  const [sampleState, sampleAction, sampling] = useActionState<FormState, FormData>(overrideSample, {});
  const [stageState, stageAction, staging] = useActionState<FormState, FormData>(changeStage, {});
  const [disposition, setDisposition] = useState<Disposition>(b.verdict === "reject" ? "reject" : "accept");
  const mine = b.inspector.id === meId;

  return (
    <div className="flex flex-col gap-4 print:hidden">
      {b.status === "submitted" && mine && (
        <Notice tone="gray">You performed this inspection, so another QA approver must decide.</Notice>
      )}

      {b.status === "submitted" && !mine && (
        <Card title="Decision">
          <form action={approveAction} className="flex flex-col gap-3">
            <input type="hidden" name="id" value={b.id} />
            <div role="radiogroup" className="grid gap-2 sm:grid-cols-2">
              {(Object.keys(DISPOSITION_LABELS) as Disposition[]).map((d) => {
                const blocked = d === "accept" && b.verdict === "reject";
                return (
                  <label key={d} className={`flex min-h-11 items-center gap-2 rounded-lg border px-3 ${blocked ? "opacity-50" : ""} ${disposition === d ? "border-zinc-900 dark:border-zinc-100" : "border-zinc-300 dark:border-zinc-700"}`}>
                    <input type="radio" name="disposition" value={d} checked={disposition === d} disabled={blocked} onChange={() => setDisposition(d)} className="h-5 w-5" />
                    {DISPOSITION_LABELS[d]}
                  </label>
                );
              })}
            </div>
            {disposition === "concession" && (
              <Field label="Concession reason (required)">
                <textarea name="reason" required maxLength={500} rows={2} className={inputClass} />
              </Field>
            )}
            <button disabled={approving} className={`${buttonClass.primary} self-start`}>Approve</button>
            <Result state={approveState} />
          </form>
        </Card>
      )}

      {b.status === "submitted" && (
        <Card title="Send back to the inspector">
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

      {b.status !== "approved" && (
        <Card title="Sampling (QA only)">
          <div className="grid gap-4 sm:grid-cols-2">
            <form action={sampleAction} className="flex flex-col gap-2">
              <input type="hidden" name="id" value={b.id} />
              <Field label={`Override sample size (1–${b.qtyReceived})`}>
                <input name="size" type="number" min={1} max={b.qtyReceived} required defaultValue={b.sampleSize} className={inputClass} />
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
