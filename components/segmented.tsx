"use client";

type Option<T extends string> = { value: T; label: string; activeClass: string };

export function Segmented<T extends string>({ name, value, options, onChange, disabled }: {
  name: string; value: T | null; options: Option<T>[]; onChange: (v: T) => void; disabled?: boolean;
}) {
  return (
    <div role="radiogroup" aria-label={name} className="inline-flex overflow-hidden rounded-lg border border-zinc-300 dark:border-zinc-700">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          role="radio"
          aria-checked={value === o.value}
          disabled={disabled}
          onClick={() => onChange(o.value)}
          className={`min-h-11 min-w-14 border-l border-zinc-300 px-3 text-sm font-medium first:border-l-0 dark:border-zinc-700 ${
            value === o.value ? o.activeClass : "text-zinc-500"
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export const CHECK_OPTIONS = [
  { value: "ok" as const, label: "OK", activeClass: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100" },
  { value: "ng" as const, label: "NG", activeClass: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-100" },
  { value: "na" as const, label: "N/A", activeClass: "bg-zinc-200 text-zinc-700 dark:bg-zinc-700 dark:text-zinc-100" },
];
