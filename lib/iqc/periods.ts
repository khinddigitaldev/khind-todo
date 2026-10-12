const KL = 8 * 3_600_000; // Malaysia is UTC+8, no daylight saving
const DATE = /^\d{4}-\d{2}-\d{2}$/;
const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

export type Period = {
  key: "this-month" | "last-month" | "90d" | "custom";
  fromIso: string; // UTC instant, inclusive
  toIso: string; // UTC instant, exclusive
  fromDate: string; // Malaysia date, inclusive (for list filters)
  toDate: string; // Malaysia date, inclusive
  label: string;
};

const klMidnight = (y: number, m: number, d: number) => new Date(Date.UTC(y, m, d) - KL);
const klDate = (t: Date) => new Date(t.getTime() + KL).toISOString().slice(0, 10);

function make(key: Period["key"], from: Date, toExclusive: Date, label: string): Period {
  return {
    key,
    fromIso: from.toISOString(),
    toIso: toExclusive.toISOString(),
    fromDate: klDate(from),
    toDate: klDate(new Date(toExclusive.getTime() - 1)),
    label,
  };
}

function monthLabel(y: number, m: number) {
  const d = new Date(Date.UTC(y, m, 1));
  return `${MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
}

export function resolvePeriod(sp: { period?: string; from?: string; to?: string }, now: Date): Period {
  const local = new Date(now.getTime() + KL);
  const y = local.getUTCFullYear();
  const m = local.getUTCMonth();
  const d = local.getUTCDate();

  if (sp.period === "last-month") return make("last-month", klMidnight(y, m - 1, 1), klMidnight(y, m, 1), monthLabel(y, m - 1));
  if (sp.period === "90d") return make("90d", klMidnight(y, m, d - 89), klMidnight(y, m, d + 1), "Last 90 days");
  if (sp.period === "custom" && sp.from && sp.to && DATE.test(sp.from) && DATE.test(sp.to) && sp.from <= sp.to) {
    const [fy, fm, fd] = sp.from.split("-").map(Number);
    const [ty, tm, td] = sp.to.split("-").map(Number);
    return make("custom", klMidnight(fy, fm - 1, fd), klMidnight(ty, tm - 1, td + 1), `${sp.from} to ${sp.to}`);
  }
  return make("this-month", klMidnight(y, m, 1), klMidnight(y, m + 1, 1), monthLabel(y, m));
}
