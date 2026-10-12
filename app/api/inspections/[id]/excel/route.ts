import { getProfile } from "@/lib/auth";
import { buildInspectionWorkbook } from "@/lib/iqc/excel";
import { loadInspection } from "@/lib/iqc/load";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const profile = await getProfile();
  if (!profile) return new Response("Sign in first.", { status: 401 });
  if (!profile.active) return new Response("Account deactivated.", { status: 403 });
  const { id } = await params;
  if (!/^\d+$/.test(id)) return new Response("Not found.", { status: 404 });
  const b = await loadInspection(Number(id));
  if (!b) return new Response("Not found.", { status: 404 });
  const buffer = await buildInspectionWorkbook(b).xlsx.writeBuffer();
  return new Response(buffer, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${b.number}.xlsx"`,
      "Cache-Control": "no-store",
    },
  });
}
