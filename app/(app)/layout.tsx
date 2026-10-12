import { Suspense } from "react";
import { Nav } from "./nav";

export default function AppLayout({ children }: LayoutProps<"/">) {
  return (
    <div className="flex min-h-full flex-1 flex-col">
      <header className="border-b border-zinc-200 dark:border-zinc-800 print:hidden">
        <Suspense fallback={<div className="h-14" />}>
          <Nav />
        </Suspense>
      </header>
      <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-6 px-4 py-6">{children}</div>
    </div>
  );
}
