"use client";

import { useActionState } from "react";
import { Field, Notice, buttonClass, inputClass } from "@/components/ui";
import { requestReset, type ResetState } from "./actions";

export function ForgotForm() {
  const [state, formAction, pending] = useActionState<ResetState, FormData>(requestReset, {});

  // The form stays on screen after sending, so people can resend or fix a typo.
  return (
    <form action={formAction} className="flex flex-col gap-4">
      {state.sent && (
        <Notice tone="green">
          If an account exists for {state.email}, we have sent a reset link. Open it in this same browser. Check your junk folder too.
        </Notice>
      )}
      <Field label="Email">
        <input key={state.email} name="email" type="email" required autoComplete="email" defaultValue={state.email} className={inputClass} />
      </Field>
      {state.error && <Notice tone="red">{state.error}</Notice>}
      <button type="submit" disabled={pending} className={buttonClass.primary}>
        {pending ? "Sending…" : state.sent ? "Send again" : "Send reset link"}
      </button>
    </form>
  );
}
