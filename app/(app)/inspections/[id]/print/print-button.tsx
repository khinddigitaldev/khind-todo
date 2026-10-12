"use client";

import { buttonClass } from "@/components/ui";

export function PrintButton() {
  return (
    <button type="button" onClick={() => window.print()} className={`${buttonClass.primary} self-start print:hidden`}>
      Print / Save as PDF
    </button>
  );
}
