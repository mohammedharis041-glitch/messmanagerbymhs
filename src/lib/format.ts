export function formatCurrency(amount: number, currency = "AED") {
  const value = Number.isFinite(amount) ? amount : 0;
  try {
    return new Intl.NumberFormat("en-AE", {
      style: "currency",
      currency,
      maximumFractionDigits: 2,
      minimumFractionDigits: value % 1 === 0 ? 0 : 2,
    }).format(value);
  } catch {
    return `${currency} ${value.toFixed(2)}`;
  }
}

export function formatDate(value: string | Date) {
  const date = typeof value === "string" ? new Date(value) : value;
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
}

export function monthLabel(date: Date) {
  return new Intl.DateTimeFormat("en-GB", { month: "long", year: "numeric" }).format(date);
}

export function toISODate(date: Date) {
  const y = date.getFullYear();
  const m = `${date.getMonth() + 1}`.padStart(2, "0");
  const d = `${date.getDate()}`.padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function monthRange(reference = new Date()) {
  const start = new Date(reference.getFullYear(), reference.getMonth(), 1);
  const end = new Date(reference.getFullYear(), reference.getMonth() + 1, 0);
  return { start: toISODate(start), end: toISODate(end) };
}

export type PeriodKey = "today" | "yesterday" | "week" | "month" | "year" | "all";

export function periodRange(period: PeriodKey): { start: string; end: string } | null {
  const now = new Date();
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  switch (period) {
    case "today":
      return { start: toISODate(startOfDay), end: toISODate(startOfDay) };
    case "yesterday": {
      const y = new Date(startOfDay);
      y.setDate(y.getDate() - 1);
      return { start: toISODate(y), end: toISODate(y) };
    }
    case "week": {
      const s = new Date(startOfDay);
      s.setDate(s.getDate() - 6);
      return { start: toISODate(s), end: toISODate(startOfDay) };
    }
    case "month":
      return monthRange(now);
    case "year":
      return {
        start: toISODate(new Date(now.getFullYear(), 0, 1)),
        end: toISODate(new Date(now.getFullYear(), 11, 31)),
      };
    default:
      return null;
  }
}

export function initials(name?: string | null, fallback = "?") {
  if (!name) return fallback;
  const parts = name.trim().split(/\s+/).slice(0, 2);
  return parts.map((p) => p[0]?.toUpperCase() ?? "").join("") || fallback;
}
