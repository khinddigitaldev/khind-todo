"use client";

import { useActionState } from "react";
import { Field, Notice, buttonClass, inputClass } from "@/components/ui";
import { signIn, type AuthState } from "./actions";

export function LoginForm() {
  const [state, formAction, pending] = useActionState<AuthState, FormData>(signIn, {});

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <Field label="Email">
        <input
          key={state.email}
          name="email"
          type="email"
          required
          autoComplete="email"
          defaultValue={state.email}
          className={inputClass}
        />
      </Field>
      <Field label="Password">
        <input name="password" type="password" required minLength={6} autoComplete="current-password" className={inputClass} />
      </Field>
      {state.error && <Notice tone="red">{state.error}</Notice>}
      <button type="submit" disabled={pending} className={buttonClass.primary}>
        {pending ? "Signing in…" : "Sign in"}
      </button>
    </form>
  );
}
