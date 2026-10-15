"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { Badge, Card, Field, Notice, buttonClass, inputClass } from "@/components/ui";
import { CHECK_OPTIONS, Segmented } from "@/components/segmented";
import type { InspectionBundle } from "@/lib/iqc/load";
import type { DraftPayload } from "@/lib/iqc/payload";
import { missingForSubmit } from "@/lib/iqc/readiness";
import { buildSummary } from "@/lib/iqc/summary";
import { CATEGORY_LABELS, type CheckResult } from "@/lib/iqc/types";
import { isOutOfTolerance, lotVerdict, measurementResult, reviewWarnings } from "@/lib/iqc/verdict";
import { deleteDraft, saveDraft, submitInspection, type SaveResult } from "../actions";
import { PhotoStrip } from "./photo-strip";
import { SummaryTable } from "./summary-table";

type Check = { result: CheckResult | null; comment: string };
const toLocalInput = (iso: string) => {
  const d = new Date(iso);
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 16);
};
const parseReading = (s: string) => (s.trim() === "" ? null : Number(s.replace(",", ".")));
const parseCount = (s: string) => (/^\d+$/.test(s.trim()) ? Number(s.trim()) : null);
const numbersOf = (vals: string[]) => vals.map(parseReading).filter((v): v is number => v !== null && Number.isFinite(v));
const QUICK_OPTIONS = CHECK_OPTIONS.filter((o) => o.value !== "na") as { value: "ok" | "ng"; label: string; activeClass: string }[];

export function InspectionForm({ b }: { b: InspectionBundle }) {
  const [header, setHeader] = useState(() => ({
    poNo: b.poNo, doNo: b.doNo, lotNo: b.lotNo, grnNo: b.grnNo, refNo: b.refNo, motorPartNo: b.motorPartNo,
    componentMarking: b.componentMarking, qty: String(b.qtyReceived), receivedAt: toLocalInput(b.receivedAt), instrument: b.instrument,
  }));
  const [quick, setQuick] = useState(() =>
    b.quick ? { result: b.quick.result, qty: b.quick.qty === null ? "" : String(b.quick.qty), remark: b.quick.remark } : null,
  );
  const [checks, setChecks] = useState<Record<number, Check>>(() =>
    Object.fromEntries(b.items.map((it) => [it.id, b.checks[it.id] ?? { result: null, comment: "" }])),
  );
  const [readings, setReadings] = useState<Record<number, string[]>>(() =>
    Object.fromEntries(b.characteristics.map((c) => [c.id, (b.readings[c.id] ?? []).map(String)])),
  );
  const [defects, setDefects] = useState(() => b.defects.map((d) => ({ ...d, foundText: d.found === null ? "" : String(d.found) })));
  const [notes, setNotes] = useState<Record<string, string>>(b.sectionNotes);
  const [sampleSize, setSampleSize] = useState<number | null>(b.sampleSize);
  const [saveText, setSaveText] = useState<{ tone: "gray" | "green" | "red"; text: string }>({ tone: "gray", text: "All changes save automatically." });
  const [submitError, setSubmitError] = useState<string>();
  const [pending, startTransition] = useTransition();
  const isQuick = quick !== null;

  // ---- payload sent to the server ------------------------------------------------
  const payload: DraftPayload | null = useMemo(() => {
    const qty = Number(header.qty);
    if (!Number.isInteger(qty) || qty < 1 || !header.receivedAt) return null;
    const quickQty = quick && quick.qty.trim() !== "" ? Number(quick.qty) : null;
    return {
      header: {
        poNo: header.poNo, doNo: header.doNo, lotNo: header.lotNo, qtyReceived: qty,
        receivedAt: new Date(header.receivedAt).toISOString(), instrument: header.instrument,
        grnNo: header.grnNo, refNo: header.refNo, motorPartNo: header.motorPartNo, componentMarking: header.componentMarking,
      },
      checks: Object.entries(checks)
        .filter(([, c]) => c.result !== null)
        .map(([itemId, c]) => ({ itemId: Number(itemId), result: c.result!, comment: c.comment })),
      readings: Object.entries(readings).map(([cid, vals]) => ({ characteristicId: Number(cid), values: numbersOf(vals) })),
      defects: defects.map((d) => ({ defectClass: d.defectClass, found: parseCount(d.foundText), description: d.description })),
      sectionNotes: notes,
      quick: quick
        ? { result: quick.result, qty: quickQty !== null && Number.isInteger(quickQty) && quickQty >= 1 ? quickQty : null, remark: quick.remark }
        : null,
    };
  }, [header, quick, checks, readings, defects, notes]);

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

  async function flush(): Promise<SaveResult | null> {
    if (timer.current) clearTimeout(timer.current);
    return payload ? persist(payload) : null;
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
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only payload changes trigger a save
  }, [payload]);

  // ---- live verdict, warnings, readiness and summary ----------------------------------
  const counts = defects.map((d) => ({ defectClass: d.defectClass, found: parseCount(d.foundText), ac: d.ac }));
  const verdict = isQuick
    ? quick.result === "ok" ? "accept" : quick.result === "ng" ? "reject" : "incomplete"
    : lotVerdict(counts);
  const ngItems = Object.values(checks).filter((c) => c.result === "ng").length;
  const ngMeasurements = b.characteristics.filter((c) => measurementResult(numbersOf(readings[c.id] ?? []), c.min, c.max) === "ng").length;
  const totalFound = counts.reduce((s, d) => s + (d.found ?? 0), 0);
  const warnings = isQuick ? [] : reviewWarnings({ ngItems, ngMeasurements, totalFound });
  const numericReadings = Object.fromEntries(Object.entries(readings).map(([k, v]) => [k, numbersOf(v)]));
  const quickQty = quick && quick.qty.trim() !== "" ? Number(quick.qty) : null;
  const missing = missingForSubmit({
    items: b.items,
    checks,
    characteristics: b.characteristics,
    readings: numericReadings,
    defects: counts,
    sampleSize: sampleSize ?? 0,
    quick: quick ? { result: quick.result, qty: quickQty, remark: quick.remark, lotQty: Number(header.qty) || 0 } : null,
  });
  const summary = buildSummary({
    quick: quick ? { result: quick.result, qty: quickQty } : null,
    inspectorName: b.inspector.name,
    sampleSize,
    items: b.items,
    checks,
    characteristics: b.characteristics,
    readings: numericReadings,
  });

  function submit() {
    setSubmitError(undefined);
    startTransition(async () => {
      const saved = await flush();
      if (saved && !saved.ok) {
        setSubmitError(saved.error);
        return;
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
  const text = (key: keyof typeof header, max: number) => ({
    value: header[key],
    maxLength: max,
    onChange: (e: { target: { value: string } }) => setHeader({ ...header, [key]: e.target.value }),
    className: inputClass,
  });

  return (
    <div className="flex flex-col gap-6 pb-40">
      {b.returnComment && <Notice tone="amber"><b>Returned by QC Supervisor:</b> {b.returnComment}</Notice>}

      <Card title="PART A – LOT DETAILS">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <Field label="Part Number"><input value={b.part.partNo} disabled className={inputClass} /></Field>
          <Field label="Part Name / Description"><input value={b.part.name} disabled className={inputClass} /></Field>
          <Field label="Supplier / Brand / Vendor"><input value={`${b.supplier.code} · ${b.supplier.name}`} disabled className={inputClass} /></Field>
          <Field label="Supplier Category">
            <input value={b.supplier.category ? CATEGORY_LABELS[b.supplier.category] : "— (set on the supplier)"} disabled className={inputClass} />
          </Field>
          <Field label="GRN / Storage List No"><input {...text("grnNo", 40)} /></Field>
          <Field label="PO No"><input {...text("poNo", 40)} /></Field>
          <Field label="DO No"><input {...text("doNo", 40)} /></Field>
          <Field label="Ref No"><input {...text("refNo", 40)} /></Field>
          <Field label="Lot / batch no"><input {...text("lotNo", 40)} /></Field>
          <Field
            label="Quantity In / Lot Qty"
            hint={isQuick ? "Quick check: no sample size" : `Sample size (SS): ${sampleSize ?? "—"}${b.sampleOverrideReason ? " (set by QC Supervisor)" : " (KHIND table)"}`}
          >
            <input value={header.qty} onChange={(e) => setHeader({ ...header, qty: e.target.value })} inputMode="numeric" className={inputClass} />
          </Field>
          <Field label="Date">
            <input type="datetime-local" value={header.receivedAt} onChange={(e) => setHeader({ ...header, receivedAt: e.target.value })} suppressHydrationWarning className={inputClass} />
          </Field>
          <Field label="Motor Part No (if any)"><input {...text("motorPartNo", 40)} /></Field>
        </div>
      </Card>

      <Card title="TESTS PERFORMED">
        <p className="text-sm">
          {isQuick
            ? "Appearance & fitting only (quick check) — no test sheet needed."
            : summary.map((r) => `${r.form} · ${r.test}`).join("   ·   ")}
        </p>
      </Card>

      {quick && (
        <Card title="APPEARANCE & FITTING (QUICK CHECK)">
          <div id="quick" className="grid scroll-mt-24 items-end gap-3 sm:grid-cols-[auto_8rem_1fr]">
            <Segmented name="Quick check result" value={quick.result} options={QUICK_OPTIONS} onChange={(v) => setQuick({ ...quick, result: v })} />
            <Field label="Qty checked">
              <input inputMode="numeric" value={quick.qty} onChange={(e) => setQuick({ ...quick, qty: e.target.value })} className={inputClass} />
            </Field>
            <Field label={quick.result === "ng" ? "Remark (required for NG)" : "Remark"}>
              <input value={quick.remark} maxLength={500} onChange={(e) => setQuick({ ...quick, remark: e.target.value })} className={inputClass} />
            </Field>
          </div>
        </Card>
      )}

      <Card title="COMPONENT MARKING">
        <textarea
          aria-label="Component marking"
          rows={3}
          value={header.componentMarking}
          maxLength={1000}
          onChange={(e) => setHeader({ ...header, componentMarking: e.target.value })}
          className={inputClass}
        />
      </Card>

      {!isQuick && (
        <>
          <Card title="Measuring instrument(s)">
            <input aria-label="Measuring instruments" {...text("instrument", 80)} />
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
                        <>
                          <input
                            aria-label={`Comment for ${item.text}`}
                            placeholder="What is wrong? (required for NG)"
                            value={c.comment}
                            maxLength={500}
                            onChange={(e) => setCheck(item.id, { comment: e.target.value })}
                            className={inputClass}
                          />
                          <PhotoStrip inspectionId={b.id} itemId={item.id} photos={b.attachments.filter((a) => a.itemId === item.id)} canAdd beforeUpload={flush} />
                        </>
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
            <Card title="Dimensional inspection (F1-2)">
              <div className="flex flex-col gap-4">
                {b.characteristics.map((c) => {
                  const vals = readings[c.id] ?? [];
                  const limit = sampleSize ?? 0;
                  const shown = Math.max(vals.length, Math.min(5, limit));
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
                        {shown < limit && (
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

          <Card title={`Defects found in the sample of ${sampleSize ?? "—"}`}>
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
              {verdict === "reject" && (
                <div className="mt-2 flex flex-col gap-2">
                  <span className="text-sm font-medium">Lot photos (rejected lot)</span>
                  <PhotoStrip inspectionId={b.id} itemId={null} photos={b.attachments.filter((a) => a.itemId === null)} canAdd beforeUpload={flush} />
                </div>
              )}
            </div>
          </Card>
        </>
      )}

      <Card title="TEST RESULT SUMMARY (auto)">
        <SummaryTable rows={summary} />
      </Card>

      {/* Sticky footer: verdict, save status, gaps, sign & submit */}
      <div className="fixed inset-x-0 bottom-0 z-10 border-t border-zinc-200 bg-white/95 px-4 py-3 backdrop-blur dark:border-zinc-800 dark:bg-black/90 print:hidden">
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
                {pending ? "Signing…" : "Sign & submit"}
              </button>
            </div>
          </div>
          {warnings.map((w) => <Notice key={w} tone="amber">{w}</Notice>)}
          {missing.length > 0 && (
            <details className="text-sm">
              <summary className="cursor-pointer">{missing.length} thing(s) left before you can sign & submit</summary>
              <ul className="mt-1 max-h-32 list-disc overflow-y-auto pl-5">
                {missing.map((m, k) => <li key={k}><a href={`#${m.anchor}`} className="underline">{m.message}</a></li>)}
              </ul>
            </details>
          )}
          {submitError && <Notice tone="red">{submitError}</Notice>}
          <p className="text-xs text-zinc-500">Sign &amp; submit records you ({b.inspector.name}) as &ldquo;Prepared by (Inspector)&rdquo; with today&apos;s date and time.</p>
        </div>
      </div>
    </div>
  );
}
