"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { Badge, Card, Field, Notice, buttonClass, inputClass } from "@/components/ui";
import { CHECK_OPTIONS, Segmented } from "@/components/segmented";
import type { InspectionBundle } from "@/lib/iqc/load";
import type { DraftPayload } from "@/lib/iqc/payload";
import { missingForSubmit } from "@/lib/iqc/readiness";
import type { CheckResult } from "@/lib/iqc/types";
import { isOutOfTolerance, lotVerdict, measurementResult, reviewWarnings } from "@/lib/iqc/verdict";
import { deleteDraft, saveDraft, submitInspection, type SaveResult } from "../actions";

type Check = { result: CheckResult | null; comment: string };
const toLocalInput = (iso: string) => {
  const d = new Date(iso);
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 16);
};
const parseReading = (s: string) => (s.trim() === "" ? null : Number(s.replace(",", ".")));
const parseCount = (s: string) => (/^\d+$/.test(s.trim()) ? Number(s.trim()) : null);
const numbersOf = (vals: string[]) => vals.map(parseReading).filter((v): v is number => v !== null && Number.isFinite(v));

export function InspectionForm({ b }: { b: InspectionBundle }) {
  const [header, setHeader] = useState(() => ({
    poNo: b.poNo, doNo: b.doNo, lotNo: b.lotNo, qty: String(b.qtyReceived), receivedAt: toLocalInput(b.receivedAt), instrument: b.instrument,
  }));
  const [checks, setChecks] = useState<Record<number, Check>>(() =>
    Object.fromEntries(b.items.map((it) => [it.id, b.checks[it.id] ?? { result: null, comment: "" }])),
  );
  const [readings, setReadings] = useState<Record<number, string[]>>(() =>
    Object.fromEntries(b.characteristics.map((c) => [c.id, (b.readings[c.id] ?? []).map(String)])),
  );
  const [defects, setDefects] = useState(() => b.defects.map((d) => ({ ...d, foundText: d.found === null ? "" : String(d.found) })));
  const [notes, setNotes] = useState<Record<string, string>>(b.sectionNotes);
  const [sampleSize, setSampleSize] = useState(b.sampleSize);
  const [saveText, setSaveText] = useState<{ tone: "gray" | "green" | "red"; text: string }>({ tone: "gray", text: "All changes save automatically." });
  const [submitError, setSubmitError] = useState<string>();
  const [pending, startTransition] = useTransition();

  // ---- payload sent to the server ------------------------------------------------
  const payload: DraftPayload | null = useMemo(() => {
    const qty = Number(header.qty);
    if (!Number.isInteger(qty) || qty < 1 || !header.receivedAt) return null;
    return {
      header: {
        poNo: header.poNo, doNo: header.doNo, lotNo: header.lotNo, qtyReceived: qty,
        receivedAt: new Date(header.receivedAt).toISOString(), instrument: header.instrument,
      },
      checks: Object.entries(checks)
        .filter(([, c]) => c.result !== null)
        .map(([itemId, c]) => ({ itemId: Number(itemId), result: c.result!, comment: c.comment })),
      readings: Object.entries(readings).map(([cid, vals]) => ({ characteristicId: Number(cid), values: numbersOf(vals) })),
      defects: defects.map((d) => ({ defectClass: d.defectClass, found: parseCount(d.foundText), description: d.description })),
      sectionNotes: notes,
    };
  }, [header, checks, readings, defects, notes]);

  // ---- autosave: debounce 2 s, ignore out-of-order replies --------------------------
  const seq = useRef(0);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const first = useRef(true);

  async function persist(p: DraftPayload): Promise<SaveResult> {
    const mine = ++seq.current;
    const r = await saveDraft(b.id, p);
    if (mine !== seq.current) return r; // a newer save is in flight
    if (r.ok) {
      setSampleSize(r.sampleSize);
      setSaveText({ tone: "green", text: `Saved ${new Date(r.savedAt).toLocaleTimeString("en-MY", { hour: "2-digit", minute: "2-digit" })}` });
    } else {
      setSaveText({ tone: "red", text: `Not saved: ${r.error}` });
    }
    return r;
  }

  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    if (!payload) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- status line reflects the invalid draft
      setSaveText({ tone: "red", text: "Not saved: quantity and received date are required." });
      return;
    }
    setSaveText({ tone: "gray", text: "Saving…" });
    timer.current = setTimeout(() => void persist(payload), 2000);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- persist is stable enough; only payload changes trigger a save
  }, [payload]);

  // ---- live verdict, warnings and readiness ----------------------------------------
  const counts = defects.map((d) => ({ defectClass: d.defectClass, found: parseCount(d.foundText), ac: d.ac }));
  const verdict = lotVerdict(counts);
  const ngItems = Object.values(checks).filter((c) => c.result === "ng").length;
  const ngMeasurements = b.characteristics.filter((c) => measurementResult(numbersOf(readings[c.id] ?? []), c.min, c.max) === "ng").length;
  const totalFound = counts.reduce((s, d) => s + (d.found ?? 0), 0);
  const warnings = reviewWarnings({ ngItems, ngMeasurements, totalFound });
  const missing = missingForSubmit({
    items: b.items,
    checks,
    characteristics: b.characteristics,
    readings: Object.fromEntries(Object.entries(readings).map(([k, v]) => [k, numbersOf(v)])),
    defects: counts,
    sampleSize,
  });

  function submit() {
    setSubmitError(undefined);
    startTransition(async () => {
      if (timer.current) clearTimeout(timer.current);
      if (payload) {
        const saved = await persist(payload);
        if (!saved.ok) {
          setSubmitError(saved.error);
          return;
        }
      }
      const r = await submitInspection(b.id);
      if (r?.error) setSubmitError(r.error);
    });
  }

  function removeDraft() {
    if (!confirm("Delete this draft? This cannot be undone.")) return;
    startTransition(async () => {
      const r = await deleteDraft(b.id);
      if (r?.error) setSubmitError(r.error);
    });
  }

  const sections = [...new Set(b.items.map((i) => i.section))];
  const setCheck = (id: number, patch: Partial<Check>) => setChecks((c) => ({ ...c, [id]: { ...c[id], ...patch } }));

  return (
    <div className="flex flex-col gap-6 pb-40">
      {b.returnComment && <Notice tone="amber"><b>Returned by QA:</b> {b.returnComment}</Notice>}

      <Card title="Inspection details">
        <div className="grid gap-3 sm:grid-cols-3">
          <Field label="Quantity received" hint={`Sample size: ${sampleSize}${b.sampleOverrideReason ? " (set by QA)" : " (from the KHIND table)"}`}>
            <input value={header.qty} onChange={(e) => setHeader({ ...header, qty: e.target.value })} inputMode="numeric" className={inputClass} />
          </Field>
          <Field label="Received at">
            <input type="datetime-local" value={header.receivedAt} onChange={(e) => setHeader({ ...header, receivedAt: e.target.value })} suppressHydrationWarning className={inputClass} />
          </Field>
          <Field label="Lot / batch no."><input value={header.lotNo} maxLength={40} onChange={(e) => setHeader({ ...header, lotNo: e.target.value })} className={inputClass} /></Field>
          <Field label="PO no."><input value={header.poNo} maxLength={40} onChange={(e) => setHeader({ ...header, poNo: e.target.value })} className={inputClass} /></Field>
          <Field label="DO / invoice no."><input value={header.doNo} maxLength={40} onChange={(e) => setHeader({ ...header, doNo: e.target.value })} className={inputClass} /></Field>
          <Field label="Measuring instrument(s)"><input value={header.instrument} maxLength={80} onChange={(e) => setHeader({ ...header, instrument: e.target.value })} className={inputClass} /></Field>
        </div>
      </Card>

      {sections.map((section) => (
        <Card key={section} title={section}>
          <div className="flex flex-col divide-y divide-zinc-200 dark:divide-zinc-800">
            {b.items.filter((i) => i.section === section).map((item) => {
              const c = checks[item.id];
              return (
                <div key={item.id} id={`item-${item.id}`} className="flex scroll-mt-24 flex-col gap-2 py-3">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <span className={c.result === "ng" ? "text-red-700 dark:text-red-400" : ""}>{item.text}</span>
                    <Segmented name={item.text} value={c.result} options={CHECK_OPTIONS} onChange={(v) => setCheck(item.id, { result: v })} />
                  </div>
                  {c.result === "ng" && (
                    <input
                      aria-label={`Comment for ${item.text}`}
                      placeholder="What is wrong? (required for NG)"
                      value={c.comment}
                      maxLength={500}
                      onChange={(e) => setCheck(item.id, { comment: e.target.value })}
                      className={inputClass}
                    />
                  )}
                </div>
              );
            })}
          </div>
          <div className="mt-3">
            <Field label="Section notes">
              <input value={notes[section] ?? ""} maxLength={500} onChange={(e) => setNotes({ ...notes, [section]: e.target.value })} className={inputClass} />
            </Field>
          </div>
        </Card>
      ))}

      {b.characteristics.length > 0 && (
        <Card title="Dimensional inspection">
          <div className="flex flex-col gap-4">
            {b.characteristics.map((c) => {
              const vals = readings[c.id] ?? [];
              const shown = Math.max(vals.length, Math.min(5, sampleSize));
              const result = measurementResult(numbersOf(vals), c.min, c.max);
              return (
                <div key={c.id} id={`dim-${c.id}`} className="flex scroll-mt-24 flex-col gap-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <b>{c.name}</b>
                    <span className="text-sm text-zinc-500">
                      nominal {c.nominal ?? "—"} · {c.min ?? "—"} to {c.max ?? "—"} {c.unit} · {c.defectClass}
                    </span>
                    {result && <Badge tone={result === "ng" ? "red" : "green"}>{result.toUpperCase()}</Badge>}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {Array.from({ length: shown }, (_, k) => {
                      const raw = vals[k] ?? "";
                      const v = parseReading(raw);
                      const bad = v !== null && (!Number.isFinite(v) || isOutOfTolerance(v, c.min, c.max));
                      return (
                        <input
                          key={k}
                          aria-label={`${c.name} reading ${k + 1}`}
                          inputMode="decimal"
                          value={raw}
                          onChange={(e) => {
                            const next = [...vals];
                            next[k] = e.target.value;
                            setReadings({ ...readings, [c.id]: next });
                          }}
                          className={`${inputClass} w-24 ${bad ? "border-red-500 bg-red-50 text-red-800 dark:bg-red-950" : ""}`}
                        />
                      );
                    })}
                    {shown < sampleSize && (
                      <button type="button" className={buttonClass.secondary} onClick={() => setReadings({ ...readings, [c.id]: [...vals, ""] })}>
                        + reading
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      )}

      <Card title={`Defects found in the sample of ${sampleSize}`}>
        <div className="flex flex-col gap-3">
          {defects.map((d, i) => (
            <div key={d.defectClass} id={`defect-${d.defectClass}`} className="grid scroll-mt-24 items-end gap-2 sm:grid-cols-[8rem_6rem_1fr]">
              <div className="text-sm"><b className="capitalize">{d.defectClass}</b><br /><span className="text-zinc-500">accept if ≤ {d.ac}</span></div>
              <Field label="Found">
                <input
                  inputMode="numeric"
                  value={d.foundText}
                  onChange={(e) => setDefects(defects.map((x, j) => (j === i ? { ...x, foundText: e.target.value } : x)))}
                  className={inputClass}
                />
              </Field>
              <Field label="Description">
                <input
                  value={d.description}
                  maxLength={500}
                  onChange={(e) => setDefects(defects.map((x, j) => (j === i ? { ...x, description: e.target.value } : x)))}
                  className={inputClass}
                />
              </Field>
            </div>
          ))}
        </div>
      </Card>

      {/* Sticky footer: verdict, save status, gaps, submit */}
      <div className="fixed inset-x-0 bottom-0 z-10 border-t border-zinc-200 bg-white/95 px-4 py-3 backdrop-blur dark:border-zinc-800 dark:bg-black/90">
        <div className="mx-auto flex max-w-6xl flex-col gap-2">
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-sm">System verdict:</span>
            <Badge tone={verdict === "reject" ? "red" : verdict === "accept" ? "green" : "gray"}>
              {verdict === "incomplete" ? "Incomplete" : verdict.toUpperCase()}
            </Badge>
            <span className={`text-sm ${saveText.tone === "red" ? "text-red-600" : saveText.tone === "green" ? "text-green-700" : "text-zinc-500"}`}>
              {saveText.text}
            </span>
            <div className="ml-auto flex gap-2">
              {b.status === "draft" && (
                <button type="button" className={buttonClass.secondary} disabled={pending} onClick={removeDraft}>Delete draft</button>
              )}
              <button type="button" className={buttonClass.primary} disabled={pending || missing.length > 0} onClick={submit}>
                {pending ? "Submitting…" : "Submit for approval"}
              </button>
            </div>
          </div>
          {warnings.map((w) => <Notice key={w} tone="amber">{w}</Notice>)}
          {missing.length > 0 && (
            <details className="text-sm">
              <summary className="cursor-pointer">{missing.length} thing(s) left before you can submit</summary>
              <ul className="mt-1 max-h-32 list-disc overflow-y-auto pl-5">
                {missing.map((m, k) => <li key={k}><a href={`#${m.anchor}`} className="underline">{m.message}</a></li>)}
              </ul>
            </details>
          )}
          {submitError && <Notice tone="red">{submitError}</Notice>}
        </div>
      </div>
    </div>
  );
}
