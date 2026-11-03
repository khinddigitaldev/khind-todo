"use client";

import { useActionState } from "react";
import { Field, Notice, buttonClass, inputClass } from "@/components/ui";
import { changePassword, type PasswordState } from "./actions";

export function PasswordForm() {
  const [state, formAction, pending] = useActionState<PasswordState, FormData>(changePassword, {});

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <Field label="New password" hint="At least 8 characters.">
        <input name="password" type="password" required minLength={8} autoComplete="new-password" className={inputClass} />
      </Field>
      <Field label="Type it again">
        <input name="confirm" type="password" required minLength={8} autoComplete="new-password" className={inputClass} />
      </Field>
      {state.error && <Notice tone="red">{state.error}</Notice>}
      {state.done && <Notice tone="green">Password changed. Use the new one next time you sign in.</Notice>}
      <button type="submit" disabled={pending} className={buttonClass.primary}>
        {pending ? "Saving…" : "Change password"}
      </button>
    </form>
  );
}
