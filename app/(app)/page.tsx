import { Suspense } from "react";
import { Notice, PageHeader } from "@/components/ui";

export default function DashboardPage({ searchParams }: PageProps<"/">) {
  return (
    <>
      <PageHeader title="Dashboard" />
      <Suspense>
        <Denied searchParams={searchParams} />
      </Suspense>
      <p className="text-zinc-500">Dashboard numbers arrive in Task 19.</p>
    </>
  );
}

async function Denied({ searchParams }: { searchParams: PageProps<"/">["searchParams"] }) {
  const { denied } = await searchParams;
  return denied ? <Notice tone="amber">You don&apos;t have access to that page.</Notice> : null;
}
