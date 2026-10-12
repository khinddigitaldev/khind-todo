import Link from "next/link";
import { Suspense } from "react";
import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { Badge, Card, PageHeader, type Tone } from "@/components/ui";
import { SupplierForm, type SupplierRow } from "./supplier-form";

const TONE: Record<string, Tone> = { approved: "green", probation: "amber", blocked: "red" };

export default function SuppliersPage({ searchParams }: PageProps<"/master/suppliers">) {
  return (
    <>
      <PageHeader title="Suppliers" />
      <Suspense fallback={<p className="text-zinc-500">Loading suppliers…</p>}>
        <Suppliers searchParams={searchParams} />
      </Suspense>
    </>
  );
}

async function Suppliers({ searchParams }: { searchParams: PageProps<"/master/suppliers">["searchParams"] }) {
  const profile = await requireProfile();
  const { edit } = await searchParams;
  const supabase = await createClient();
  const { data, error } = await supabase.from("suppliers").select("id, code, name, status, email, active").order("code");
  if (error) throw new Error(`Could not load suppliers: ${error.message}`);
  const rows = (data ?? []) as SupplierRow[];
  const editing = rows.find((s) => String(s.id) === edit);
  const isQa = profile.role === "qa";

  return (
    <>
      {isQa && (
        <Card title={editing ? `Edit ${editing.code}` : "Add a supplier"}>
          <SupplierForm supplier={editing} />
          {editing && <Link href="/master/suppliers" className="mt-3 inline-block text-sm underline">Cancel edit</Link>}
        </Card>
      )}
      <div className="overflow-x-auto rounded-xl border border-zinc-200 dark:border-zinc-800">
        <table className="w-full min-w-[640px] text-sm">
          <thead className="bg-zinc-50 text-left text-zinc-500 dark:bg-zinc-900">
            <tr><th className="p-3">Code</th><th className="p-3">Name</th><th className="p-3">Status</th><th className="p-3">Email</th><th className="p-3">Active</th>{isQa && <th />}</tr>
          </thead>
          <tbody>
            {rows.map((s) => (
              <tr key={s.id} className="border-t border-zinc-200 dark:border-zinc-800">
                <td className="p-3 font-mono">{s.code}</td>
                <td className="p-3">{s.name}</td>
                <td className="p-3"><Badge tone={TONE[s.status] ?? "gray"}>{s.status}</Badge></td>
                <td className="p-3">{s.email ?? "—"}</td>
                <td className="p-3">{s.active ? "Yes" : "No"}</td>
                {isQa && <td className="p-3"><Link href={`/master/suppliers?edit=${s.id}`} className="underline">Edit</Link></td>}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
