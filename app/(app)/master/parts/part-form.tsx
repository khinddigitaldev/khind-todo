"use client";

import { useActionState } from "react";
import { Field, Notice, buttonClass, inputClass } from "@/components/ui";
import { savePart, type FormState } from "../actions";

export type PartRow = {
  id: number; part_no: string; name: string; category: string | null; drawing_no: string | null; drawing_rev: string | null;
  regulated: boolean; template_id: number | null; inspection_type: string; active: boolean;
};

export function PartForm({ part, templates }: { part?: PartRow; templates: { id: number; name: string }[] }) {
  const [state, action, pending] = useActionState<FormState, FormData>(savePart, {});
  return (
    <form action={action} className="grid gap-3 sm:grid-cols-3" key={part?.id ?? "new"}>
      {part && <input type="hidden" name="id" value={part.id} />}
      <Field label="Part number"><input name="partNo" required maxLength={40} defaultValue={part?.part_no} className={inputClass} /></Field>
      <Field label="Name"><input name="name" required maxLength={120} defaultValue={part?.name} className={inputClass} /></Field>
      <Field label="Category"><input name="category" maxLength={60} defaultValue={part?.category ?? ""} className={inputClass} /></Field>
      <Field label="Drawing no."><input name="drawingNo" maxLength={40} defaultValue={part?.drawing_no ?? ""} className={inputClass} /></Field>
      <Field label="Drawing revision"><input name="drawingRev" maxLength={10} defaultValue={part?.drawing_rev ?? ""} className={inputClass} /></Field>
      <Field label="Inspection type">
        <select name="inspectionType" defaultValue={part?.inspection_type ?? "sampling"} className={inputClass}>
          <option value="sampling">Sampling (KHIND table)</option>
          <option value="full">100% inspection</option>
          <option value="none">No inspection</option>
        </select>
      </Field>
      <Field label="Inspection template">
        <select name="templateId" defaultValue={part?.template_id ?? ""} className={inputClass}>
          <option value="">— none —</option>
          {templates.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
        </select>
      </Field>
      <label className="flex min-h-11 items-center gap-2 text-sm">
        <input type="checkbox" name="regulated" defaultChecked={part?.regulated ?? false} className="h-5 w-5" /> Regulated (ST/SIRIM)
      </label>
      <label className="flex min-h-11 items-center gap-2 text-sm">
        <input type="checkbox" name="active" defaultChecked={part?.active ?? true} className="h-5 w-5" /> Active
      </label>
      <div className="flex items-center gap-3 sm:col-span-3">
        <button disabled={pending} className={buttonClass.primary}>{part ? "Save part" : "Add part"}</button>
        {state.error && <Notice tone="red">{state.error}</Notice>}
        {state.ok && <Notice tone="green">{state.ok}</Notice>}
      </div>
    </form>
  );
}
