import Link from "next/link";
import type { ReactNode } from "react";
import { Badge, Card } from "@/components/ui";
import type { InspectionBundle } from "@/lib/iqc/load";
import { DISPOSITION_LABELS } from "@/lib/iqc/types";
import { isOutOfTolerance, measurementResult } from "@/lib/iqc/verdict";

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
      <dd>{children || "—"}</dd>
    </div>
  );
}

// Read-only rendering of everything recorded. Also used by the print page.
export function InspectionView({ b }: { b: InspectionBundle }) {
  const sections = [...new Set(b.items.map((i) => i.section))];
  return (
    <div className="flex flex-col gap-4">
      <Card title="Details">
        <dl className="grid gap-3 text-sm sm:grid-cols-3">
          <Item label="Supplier">{b.supplier.code} · {b.supplier.name}</Item>
          <Item label="Part">
            {b.part.partNo} · {b.part.name}{" "}
            {b.part.regulated && <Badge tone="amber">Regulated</Badge>}
          </Item>
          <Item label="Drawing">{[b.part.drawingNo, b.part.drawingRev].filter(Boolean).join(" rev ")}</Item>
          <Item label="PO no.">{b.poNo}</Item>
          <Item label="DO / invoice no.">{b.doNo}</Item>
          <Item label="Lot / batch no.">{b.lotNo}</Item>
          <Item label="Quantity received">{b.qtyReceived}</Item>
          <Item label="Received at">{when(b.receivedAt)}</Item>
          <Item label="Sample size">
            {b.sampleSize} ({b.stage}){b.sampleOverrideReason ? ` · override: ${b.sampleOverrideReason}` : ""}
          </Item>
          <Item label="Instrument(s)">{b.instrument}</Item>
          <Item label="Inspector">{b.inspector.name}</Item>
          <Item label="Submitted at">{when(b.submittedAt)}</Item>
        </dl>
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
        <Card title="Dimensional inspection">
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

      <Card title="Decision">
        <dl className="grid gap-3 text-sm sm:grid-cols-3">
          <Item label="System verdict">
            {b.verdict ? <Badge tone={b.verdict === "reject" ? "red" : "green"}>{b.verdict.toUpperCase()}</Badge> : null}
          </Item>
          <Item label="Disposition">{b.disposition ? DISPOSITION_LABELS[b.disposition] : null}</Item>
          <Item label="Approved by">{b.approver ? `${b.approver.name} · ${when(b.approvedAt)}` : null}</Item>
          {b.concessionReason && <Item label="Concession reason">{b.concessionReason}</Item>}
          {b.reopenReason && <Item label="Reopen reason">{b.reopenReason}</Item>}
          {b.ncr && (
            <Item label="NCR">
              <Link href={`/ncrs/${b.ncr.id}`} className="underline">{b.ncr.number}</Link> ({b.ncr.status})
            </Item>
          )}
        </dl>
      </Card>
    </div>
  );
}
