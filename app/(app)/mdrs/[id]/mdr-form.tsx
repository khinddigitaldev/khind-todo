"use client";

import { useActionState } from "react";
import { Field, Notice, buttonClass, inputClass } from "@/components/ui";
import { updateMdr } from "../actions";
import type { FormState } from "../../master/actions";

export function MdrForm({ mdr }: { mdr: { id: number; scar_no: string | null; rma_no: string | null; supplier_response: string | null; status: string } }) {
  const [state, action, pending] = useActionState<FormState, FormData>(updateMdr, {});
  return (
    <form action={action} className="grid gap-3 sm:grid-cols-2">
      <input type="hidden" name="id" value={mdr.id} />
      <Field label="SCAR no."><input name="scarNo" maxLength={40} defaultValue={mdr.scar_no ?? ""} className={inputClass} /></Field>
      <Field label="RMA no."><input name="rmaNo" maxLength={40} defaultValue={mdr.rma_no ?? ""} className={inputClass} /></Field>
      <div className="sm:col-span-2">
        <Field label="Supplier response">
          <textarea name="supplierResponse" rows={4} maxLength={2000} defaultValue={mdr.supplier_response ?? ""} className={inputClass} />
        </Field>
      </div>
      <Field label="Status">
        <select name="status" defaultValue={mdr.status} className={inputClass}>
          <option value="open">Open</option>
          <option value="waiting_supplier">Waiting for supplier</option>
          <option value="closed">Closed</option>
        </select>
      </Field>
      <div className="flex items-end gap-3">
        <button disabled={pending} className={buttonClass.primary}>Save</button>
      </div>
      <div className="sm:col-span-2">
        {state.error && <Notice tone="red">{state.error}</Notice>}
        {state.ok && <Notice tone="green">{state.ok}</Notice>}
      </div>
    </form>
  );
}
