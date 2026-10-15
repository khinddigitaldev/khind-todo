import { Badge } from "@/components/ui";
import type { SummaryRow } from "@/lib/iqc/summary";

// "TEST RESULT SUMMARY (auto)" on the Part A cover.
export function SummaryTable({ rows }: { rows: SummaryRow[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[520px] text-sm">
        <thead className="text-left text-zinc-500">
          <tr><th className="p-2">Form</th><th className="p-2">Test</th><th className="p-2">Tested by</th><th className="p-2">Samples</th><th className="p-2">NG</th><th className="p-2">Result</th></tr>
        </thead>
        <tbody>
          {rows.length === 0 && <tr><td colSpan={6} className="p-3 text-center text-zinc-500">No test selected yet.</td></tr>}
          {rows.map((r) => (
            <tr key={r.form + r.test} className="border-t border-zinc-200 dark:border-zinc-800">
              <td className="p-2">{r.form}</td>
              <td className="p-2">{r.test}</td>
              <td className="p-2">{r.testedBy}</td>
              <td className="p-2">{r.samples ?? "—"}</td>
              <td className="p-2">{r.ng ?? "—"}</td>
              <td className="p-2">{r.result ? <Badge tone={r.result === "NG" ? "red" : "green"}>{r.result}</Badge> : "—"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
