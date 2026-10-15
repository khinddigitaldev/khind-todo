import Link from "next/link";
import type { ReactNode } from "react";
import { Badge, Card } from "@/components/ui";
import type { InspectionBundle } from "@/lib/iqc/load";
import { buildSummary } from "@/lib/iqc/summary";
import { ACTION_LABELS, CATEGORY_LABELS, DECISION_LABELS } from "@/lib/iqc/types";
import { isOutOfTolerance, measurementResult } from "@/lib/iqc/verdict";
import { SummaryTable } from "./summary-table";

const RESULT_TONE = { ok: "green", ng: "red", na: "gray" } as const;
const RESULT_LABEL = { ok: "OK", ng: "NG", na: "N/A" } as const;
const when = (iso: string | null) => (iso ? new Date(iso).toLocaleString("en-MY", { timeZone: "Asia/Kuala_Lumpur" }) : "—");

function Photos({ photos }: { photos: { id: number; url: string | null }[] }) {
  if (!photos.length) return null;
  return (
    <div className="flex flex-wrap gap-2">
      {photos.map((p) =>
        p.url ? (
          <a key={p.id} href={p.url} target="_blank" rel="noreferrer">
            {/* eslint-disable-next-line @next/next/no-img-element -- short-lived signed URL */}
            <img src={p.url} alt="Inspection photo" className="h-20 w-20 rounded-lg object-cover" />
          </a>
        ) : null,
      )}
    </div>
  );
}

function Item({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <dt className="text-xs text-zinc-500">{label}</dt>
      <dd className="whitespace-pre-wrap">{children || "—"}</dd>
    </div>
  );
}

// Read-only Part A (and test details). Also used by the A4 print page.
export function InspectionView({ b }: { b: InspectionBundle }) {
  const sections = [...new Set(b.items.map((i) => i.section))];
  const summary = buildSummary({
    quick: b.quick ? { result: b.quick.result, qty: b.quick.qty } : null,
    inspectorName: b.inspector.name,
    sampleSize: b.sampleSize,
    items: b.items,
    checks: b.checks,
    characteristics: b.characteristics,
    readings: b.readings,
  });

  return (
    <div className="flex flex-col gap-4">
      <Card title="PART A – LOT DETAILS">
        <dl className="grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-3">
          <Item label="Part Number">{b.part.partNo}</Item>
          <Item label="Part Name / Description">
            {b.part.name} {b.part.regulated && <Badge tone="amber">Regulated</Badge>}
          </Item>
          <Item label="Supplier / Brand / Vendor">{b.supplier.code} · {b.supplier.name}</Item>
          <Item label="Supplier Category">{b.supplier.category ? CATEGORY_LABELS[b.supplier.category] : null}</Item>
          <Item label="GRN / Storage List No">{b.grnNo}</Item>
          <Item label="PO No">{b.poNo}</Item>
          <Item label="DO No">{b.doNo}</Item>
          <Item label="Ref No">{b.refNo}</Item>
          <Item label="Lot / batch no">{b.lotNo}</Item>
          <Item label="Quantity In / Lot Qty">{b.qtyReceived}</Item>
          <Item label="Sample Size (SS)">
            {b.quick ? "— (quick check)" : `${b.sampleSize ?? "—"} (${b.stage})${b.sampleOverrideReason ? ` · override: ${b.sampleOverrideReason}` : ""}`}
          </Item>
          <Item label="Date">{when(b.receivedAt)}</Item>
          <Item label="Motor Part No">{b.motorPartNo}</Item>
          <Item label="Drawing">{[b.part.drawingNo, b.part.drawingRev].filter(Boolean).join(" rev ")}</Item>
          {!b.quick && <Item label="Instrument(s)">{b.instrument}</Item>}
        </dl>
      </Card>

      {b.quick && (
        <Card title="APPEARANCE & FITTING (QUICK CHECK)">
          <dl className="grid gap-3 text-sm sm:grid-cols-3">
            <Item label="Result">
              {b.quick.result ? <Badge tone={b.quick.result === "ng" ? "red" : "green"}>{b.quick.result.toUpperCase()}</Badge> : null}
            </Item>
            <Item label="Qty checked">{b.quick.qty ?? null}</Item>
            <Item label="Remark">{b.quick.remark}</Item>
          </dl>
        </Card>
      )}

      <Card title="COMPONENT MARKING">
        <p className="whitespace-pre-wrap text-sm">{b.componentMarking || "—"}</p>
      </Card>

      {sections.map((section) => (
        <Card key={section} title={section}>
          <ul className="flex flex-col divide-y divide-zinc-200 text-sm dark:divide-zinc-800">
            {b.items.filter((i) => i.section === section).map((item) => {
              const c = b.checks[item.id];
              return (
                <li key={item.id} className="flex flex-col gap-1 py-2">
                  <div className="flex items-start justify-between gap-3">
                    <span>{item.text}</span>
                    {c ? <Badge tone={RESULT_TONE[c.result]}>{RESULT_LABEL[c.result]}</Badge> : <Badge tone="gray">—</Badge>}
                  </div>
                  {c?.comment && <span className="text-zinc-500">{c.comment}</span>}
                  <Photos photos={b.attachments.filter((a) => a.itemId === item.id)} />
                </li>
              );
            })}
          </ul>
          {b.sectionNotes[section] && <p className="mt-2 text-sm text-zinc-500">Notes: {b.sectionNotes[section]}</p>}
        </Card>
      ))}

      {b.characteristics.length > 0 && (
        <Card title="Dimensional inspection (F1-2)">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[560px] text-sm">
              <thead className="text-left text-zinc-500">
                <tr><th className="p-2">Characteristic</th><th className="p-2">Nominal</th><th className="p-2">Limits</th><th className="p-2">Readings</th><th className="p-2">Result</th></tr>
              </thead>
              <tbody>
                {b.characteristics.map((c) => {
                  const values = b.readings[c.id] ?? [];
                  const r = measurementResult(values, c.min, c.max);
                  return (
                    <tr key={c.id} className="border-t border-zinc-200 dark:border-zinc-800">
                      <td className="p-2">{c.name} <span className="text-zinc-500">({c.defectClass})</span></td>
                      <td className="p-2">{c.nominal ?? "—"}</td>
                      <td className="p-2">{c.min ?? "—"} – {c.max ?? "—"} {c.unit}</td>
                      <td className="p-2">
                        {values.map((v, k) => (
                          <span key={k} className={`mr-2 ${isOutOfTolerance(v, c.min, c.max) ? "font-semibold text-red-600" : ""}`}>{v}</span>
                        ))}
                      </td>
                      <td className="p-2">{r ? <Badge tone={r === "ng" ? "red" : "green"}>{r.toUpperCase()}</Badge> : "—"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {!b.quick && (
        <Card title="Defects">
          <table className="w-full text-sm">
            <thead className="text-left text-zinc-500">
              <tr><th className="p-2">Class</th><th className="p-2">Found</th><th className="p-2">Ac</th><th className="p-2">Re</th><th className="p-2">Description</th></tr>
            </thead>
            <tbody>
              {b.defects.map((d) => (
                <tr key={d.defectClass} className="border-t border-zinc-200 dark:border-zinc-800">
                  <td className="p-2 capitalize">{d.defectClass}</td>
                  <td className={`p-2 ${d.found !== null && d.found > d.ac ? "font-semibold text-red-600" : ""}`}>{d.found ?? "—"}</td>
                  <td className="p-2">{d.ac}</td>
                  <td className="p-2">{d.ac + 1}</td>
                  <td className="p-2">{d.description || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="mt-3">
            <Photos photos={b.attachments.filter((a) => a.itemId === null)} />
          </div>
        </Card>
      )}

      <Card title="TEST RESULT SUMMARY (auto)">
        <SummaryTable rows={summary} />
      </Card>

      <Card title="LOT DECISION (QC Supervisor)">
        <dl className="grid gap-3 text-sm sm:grid-cols-3">
          <Item label="System verdict">
            {b.verdict ? <Badge tone={b.verdict === "reject" ? "red" : "green"}>{b.verdict.toUpperCase()}</Badge> : null}
          </Item>
          <Item label="Lot Decision">
            {b.decision ? `${DECISION_LABELS[b.decision]}${b.decision === "others" && b.decisionOther ? `: ${b.decisionOther}` : ""}` : null}
          </Item>
          <Item label="Action">{b.action ? ACTION_LABELS[b.action] : null}</Item>
          <Item label="Accept Qty">{b.acceptQty ?? null}</Item>
          <Item label="Reject Qty">{b.rejectQty ?? null}</Item>
          <Item label="MDR">
            {b.mdr ? <><Link href={`/mdrs/${b.mdr.id}`} className="underline">{b.mdr.number}</Link> ({b.mdr.status.replace("_", " ")})</> : b.raiseMdr ? "Raised" : null}
          </Item>
          {b.uaiReason && <Item label="UAI reason">{b.uaiReason}</Item>}
          {b.reopenReason && <Item label="Reopen reason">{b.reopenReason}</Item>}
        </dl>
      </Card>

      <Card title="SIGN-OFF">
        <table className="w-full text-sm">
          <thead className="text-left text-zinc-500">
            <tr><th className="p-2" /><th className="p-2">Prepared by (Inspector)</th><th className="p-2">Verified &amp; Approved by (QC Supervisor)</th></tr>
          </thead>
          <tbody>
            <tr className="border-t border-zinc-200 dark:border-zinc-800">
              <td className="p-2 text-zinc-500">Name</td><td className="p-2">{b.inspector.name}</td><td className="p-2">{b.approver?.name ?? "—"}</td>
            </tr>
            <tr className="border-t border-zinc-200 dark:border-zinc-800">
              <td className="p-2 text-zinc-500">Signature</td>
              <td className="p-2">{b.submittedAt ? "Signed electronically" : "—"}</td>
              <td className="p-2">{b.approvedAt ? "Signed electronically" : "—"}</td>
            </tr>
            <tr className="border-t border-zinc-200 dark:border-zinc-800">
              <td className="p-2 text-zinc-500">Date</td><td className="p-2">{when(b.submittedAt)}</td><td className="p-2">{when(b.approvedAt)}</td>
            </tr>
          </tbody>
        </table>
      </Card>
    </div>
  );
}
