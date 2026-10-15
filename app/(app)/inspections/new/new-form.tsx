"use client";

import { useActionState, useState } from "react";
import { Field, Notice, buttonClass, inputClass } from "@/components/ui";
import { createInspection } from "../actions";
import type { FormState } from "../../master/actions";

type Supplier = { id: number; code: string; name: string; status: string };
type Part = { id: number; part_no: string; name: string };

function localNow() {
  const d = new Date();
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 16);
}

export function NewInspectionForm({ suppliers, parts }: { suppliers: Supplier[]; parts: Part[] }) {
  const [state, formAction, pending] = useActionState<FormState, FormData>(createInspection, {});
  const [supplierId, setSupplierId] = useState("");
  const [defaultNow] = useState(localNow);
  const supplier = suppliers.find((s) => String(s.id) === supplierId);

  return (
    <form
      action={(fd) => {
        // datetime-local has no time zone; send an exact instant to the server.
        const local = String(fd.get("receivedAtLocal") ?? "");
        fd.set("receivedAt", local ? new Date(local).toISOString() : "");
        return formAction(fd);
      }}
      className="grid gap-4 sm:grid-cols-2"
    >
      <Field label="Supplier">
        <select name="supplierId" required value={supplierId} onChange={(e) => setSupplierId(e.target.value)} className={inputClass}>
          <option value="">Choose…</option>
          {suppliers.map((s) => <option key={s.id} value={s.id}>{s.code} · {s.name}</option>)}
        </select>
      </Field>
      <Field label="Part">
        <select name="partId" required className={inputClass} defaultValue="">
          <option value="">Choose…</option>
          {parts.map((p) => <option key={p.id} value={p.id}>{p.part_no} · {p.name}</option>)}
        </select>
      </Field>
      {supplier?.status === "blocked" && (
        <div className="sm:col-span-2"><Notice tone="red">This supplier is BLOCKED. Check with QA before accepting any goods.</Notice></div>
      )}
      {supplier?.status === "probation" && (
        <div className="sm:col-span-2"><Notice tone="amber">This supplier is on probation. Inspect carefully.</Notice></div>
      )}
      <Field label="Quantity received"><input name="qty" type="number" min={1} required inputMode="numeric" className={inputClass} /></Field>
      <Field label="Received at"><input name="receivedAtLocal" type="datetime-local" required defaultValue={defaultNow} suppressHydrationWarning className={inputClass} /></Field>
      <Field label="GRN / Storage List No"><input name="grn" maxLength={40} className={inputClass} /></Field>
      <Field label="PO number"><input name="po" maxLength={40} className={inputClass} /></Field>
      <Field label="DO / invoice number"><input name="do" maxLength={40} className={inputClass} /></Field>
      <Field label="Ref No"><input name="ref" maxLength={40} className={inputClass} /></Field>
      <Field label="Lot / batch number"><input name="lot" maxLength={40} className={inputClass} /></Field>
      <Field label="Motor Part No (if any)"><input name="motor" maxLength={40} className={inputClass} /></Field>
      <div className="flex items-center gap-3 sm:col-span-2">
        <button disabled={pending} className={buttonClass.primary}>{pending ? "Starting…" : "Start inspection"}</button>
        {state.error && <Notice tone="red">{state.error}</Notice>}
      </div>
    </form>
  );
}
