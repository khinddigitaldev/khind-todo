import type { ReactNode } from "react";

export const inputClass =
  "min-h-11 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-zinc-900 outline-none focus:border-zinc-900 disabled:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:focus:border-zinc-300";

const base = "inline-flex min-h-11 items-center justify-center gap-2 rounded-lg px-4 py-2 font-medium disabled:opacity-50";
export const buttonClass = {
  primary: `${base} bg-zinc-900 text-white hover:bg-zinc-700 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300`,
  secondary: `${base} border border-zinc-300 hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-800`,
  danger: `${base} bg-red-700 text-white hover:bg-red-600`,
};

const tones = {
  gray: "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300",
  blue: "bg-blue-50 text-blue-800 dark:bg-blue-950 dark:text-blue-200",
  amber: "bg-amber-50 text-amber-800 dark:bg-amber-950 dark:text-amber-200",
  green: "bg-green-50 text-green-800 dark:bg-green-950 dark:text-green-200",
  red: "bg-red-50 text-red-800 dark:bg-red-950 dark:text-red-200",
};
export type Tone = keyof typeof tones;

export const STATUS_TONE: Record<string, Tone> = { draft: "gray", submitted: "blue", returned: "amber", approved: "green" };
export const NCR_TONE: Record<string, Tone> = { open: "red", waiting_supplier: "amber", closed: "green" };

export function Badge({ tone, children }: { tone: Tone; children: ReactNode }) {
  return <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${tones[tone]}`}>{children}</span>;
}

export function Notice({ tone, children }: { tone: Tone; children: ReactNode }) {
  return <div role={tone === "red" ? "alert" : "status"} className={`rounded-lg px-3 py-2 text-sm ${tones[tone]}`}>{children}</div>;
}

export function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <label className="flex flex-col gap-1 text-sm font-medium">
      {label}
      {children}
      {hint && <span className="text-xs font-normal text-zinc-500">{hint}</span>}
    </label>
  );
}

export function PageHeader({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <h1 className="text-2xl font-semibold">{title}</h1>
      {children}
    </div>
  );
}

export function Card({ title, children }: { title?: string; children: ReactNode }) {
  return (
    <section className="rounded-xl border border-zinc-200 dark:border-zinc-800">
      {title && <h2 className="border-b border-zinc-200 px-4 py-3 font-semibold dark:border-zinc-800">{title}</h2>}
      <div className="p-4">{children}</div>
    </section>
  );
}
