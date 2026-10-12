"use client";

import { useActionState } from "react";
import { Field, Notice, buttonClass, inputClass } from "@/components/ui";
import { saveSupplier, type FormState } from "../actions";

export type SupplierRow = { id: number; code: string; name: string; status: string; email: string | null; active: boolean };

export function SupplierForm({ supplier }: { supplier?: SupplierRow }) {
  const [state, action, pending] = useActionState<FormState, FormData>(saveSupplier, {});
  return (
    <form action={action} className="grid gap-3 sm:grid-cols-2" key={supplier?.id ?? "new"}>
      {supplier && <input type="hidden" name="id" value={supplier.id} />}
      <Field label="Code"><input name="code" required maxLength={20} defaultValue={supplier?.code} className={inputClass} /></Field>
      <Field label="Name"><input name="name" required maxLength={120} defaultValue={supplier?.name} className={inputClass} /></Field>
      <Field label="Status">
        <select name="status" defaultValue={supplier?.status ?? "approved"} className={inputClass}>
          <option value="approved">Approved</option>
          <option value="probation">Probation</option>
          <option value="blocked">Blocked</option>
        </select>
      </Field>
      <Field label="Contact email"><input name="email" type="email" defaultValue={supplier?.email ?? ""} className={inputClass} /></Field>
      <label className="flex min-h-11 items-center gap-2 text-sm">
        <input type="checkbox" name="active" defaultChecked={supplier?.active ?? true} className="h-5 w-5" /> Active
      </label>
      <div className="flex items-center gap-3 sm:col-span-2">
        <button disabled={pending} className={buttonClass.primary}>{supplier ? "Save supplier" : "Add supplier"}</button>
        {state.error && <Notice tone="red">{state.error}</Notice>}
        {state.ok && <Notice tone="green">{state.ok}</Notice>}
      </div>
    </form>
  );
}
