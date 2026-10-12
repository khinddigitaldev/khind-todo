// Supabase Free limits (check Supabase → Usage; update if the plan changes).
export const DB_LIMIT_BYTES = 500 * 1024 * 1024;
export const STORAGE_LIMIT_BYTES = 1024 * 1024 * 1024;

export function usageLevel(used: number, limit: number): "ok" | "warn" | "danger" {
  const ratio = used / limit;
  if (ratio >= 0.85) return "danger";
  if (ratio >= 0.7) return "warn";
  return "ok";
}

export function backupStatus(lastAt: string | null, now: Date): { days: number | null; level: "ok" | "danger" } {
  if (!lastAt) return { days: null, level: "danger" };
  const days = Math.floor((now.getTime() - Date.parse(lastAt)) / 86_400_000);
  return { days, level: days > 8 ? "danger" : "ok" };
}
