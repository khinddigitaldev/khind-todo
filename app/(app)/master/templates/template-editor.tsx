"use client";

import { useState, useTransition } from "react";
import { Field, Notice, buttonClass, inputClass } from "@/components/ui";
import type { TemplateVersionPayload } from "@/lib/iqc/payload";
import { DEFECT_CLASSES, type DefectClass } from "@/lib/iqc/types";
import { saveTemplateVersion } from "./actions";

export type EditorItem = { section: string; text: string };
export type EditorChar = { name: string; nominal: string; min: string; max: string; unit: string; defectClass: DefectClass };

const toNum = (s: string) => (s.trim() === "" ? null : Number(s));

export function TemplateEditor(props: { templateId: number | null; name: string; items: EditorItem[]; characteristics: EditorChar[] }) {
  const [name, setName] = useState(props.name);
  const [items, setItems] = useState<EditorItem[]>(props.items.length ? props.items : [{ section: "", text: "" }]);
  const [chars, setChars] = useState<EditorChar[]>(props.characteristics);
  const [error, setError] = useState<string>();
  const [pending, startTransition] = useTransition();

  const setItem = (i: number, patch: Partial<EditorItem>) => setItems(items.map((it, j) => (j === i ? { ...it, ...patch } : it)));
  const moveItem = (i: number, d: -1 | 1) => {
    const j = i + d;
    if (j < 0 || j >= items.length) return;
    const next = [...items];
    [next[i], next[j]] = [next[j], next[i]];
    setItems(next);
  };
  const setChar = (i: number, patch: Partial<EditorChar>) => setChars(chars.map((c, j) => (j === i ? { ...c, ...patch } : c)));

  function save() {
    const payload: TemplateVersionPayload = {
      templateId: props.templateId,
      name,
      items: items.filter((it) => it.text.trim() !== ""),
      characteristics: chars
        .filter((c) => c.name.trim() !== "")
        .map((c) => ({ name: c.name, nominal: toNum(c.nominal), min: toNum(c.min), max: toNum(c.max), unit: c.unit, defectClass: c.defectClass })),
    };
    startTransition(async () => {
      const result = await saveTemplateVersion(payload);
      if (result?.error) setError(result.error);
    });
  }

  return (
    <div className="flex flex-col gap-6">
      {props.templateId === null && (
        <Field label="Template name"><input value={name} onChange={(e) => setName(e.target.value)} className={inputClass} maxLength={80} /></Field>
      )}
      <section className="flex flex-col gap-2">
        <h2 className="font-semibold">Checklist items</h2>
        {items.map((it, i) => (
          <div key={i} className="grid gap-2 sm:grid-cols-[14rem_1fr_auto]">
            <input aria-label="Section" placeholder="Section" value={it.section} onChange={(e) => setItem(i, { section: e.target.value })} className={inputClass} />
            <input aria-label="Check" placeholder="What to check" value={it.text} onChange={(e) => setItem(i, { text: e.target.value })} className={inputClass} />
            <div className="flex gap-1">
              <button type="button" onClick={() => moveItem(i, -1)} className={buttonClass.secondary} aria-label="Move up">↑</button>
              <button type="button" onClick={() => moveItem(i, 1)} className={buttonClass.secondary} aria-label="Move down">↓</button>
              <button type="button" onClick={() => setItems(items.filter((_, j) => j !== i))} className={buttonClass.secondary} aria-label="Remove">✕</button>
            </div>
          </div>
        ))}
        <button type="button" onClick={() => setItems([...items, { section: items.at(-1)?.section ?? "", text: "" }])} className={`${buttonClass.secondary} self-start`}>
          Add item
        </button>
      </section>
      <section className="flex flex-col gap-2">
        <h2 className="font-semibold">Dimensions (optional)</h2>
        {chars.map((c, i) => (
          <div key={i} className="grid grid-cols-2 gap-2 sm:grid-cols-[1fr_6rem_6rem_6rem_5rem_8rem_auto]">
            <input aria-label="Name" placeholder="Name" value={c.name} onChange={(e) => setChar(i, { name: e.target.value })} className={inputClass} />
            <input aria-label="Nominal" placeholder="Nominal" inputMode="decimal" value={c.nominal} onChange={(e) => setChar(i, { nominal: e.target.value })} className={inputClass} />
            <input aria-label="Min" placeholder="Min" inputMode="decimal" value={c.min} onChange={(e) => setChar(i, { min: e.target.value })} className={inputClass} />
            <input aria-label="Max" placeholder="Max" inputMode="decimal" value={c.max} onChange={(e) => setChar(i, { max: e.target.value })} className={inputClass} />
            <input aria-label="Unit" placeholder="Unit" value={c.unit} onChange={(e) => setChar(i, { unit: e.target.value })} className={inputClass} />
            <select aria-label="Defect class" value={c.defectClass} onChange={(e) => setChar(i, { defectClass: e.target.value as DefectClass })} className={inputClass}>
              {DEFECT_CLASSES.map((d) => <option key={d} value={d}>{d}</option>)}
            </select>
            <button type="button" onClick={() => setChars(chars.filter((_, j) => j !== i))} className={buttonClass.secondary} aria-label="Remove">✕</button>
          </div>
        ))}
        <button type="button" onClick={() => setChars([...chars, { name: "", nominal: "", min: "", max: "", unit: "mm", defectClass: "major" }])} className={`${buttonClass.secondary} self-start`}>
          Add dimension
        </button>
      </section>
      {error && <Notice tone="red">{error}</Notice>}
      <button type="button" disabled={pending} onClick={save} className={`${buttonClass.primary} self-start`}>
        {props.templateId === null ? "Create template" : "Save as new version"}
      </button>
    </div>
  );
}
