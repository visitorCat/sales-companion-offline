import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(value: number, lang: string = "fr"): string {
  const locale = lang === "ar" ? "ar-DZ" : lang === "fr" ? "fr-DZ" : "en-US";
  try {
    return new Intl.NumberFormat(locale, {
      style: "currency",
      currency: "DZD",
      maximumFractionDigits: 0,
    }).format(value);
  } catch {
    return `${Math.round(value)} DZD`;
  }
}

export function formatNumber(value: number, lang: string = "fr"): string {
  const locale = lang === "ar" ? "ar-DZ" : lang === "fr" ? "fr-DZ" : "en-US";
  return new Intl.NumberFormat(locale, { maximumFractionDigits: 1 }).format(value);
}

export function formatCartons(value: number): string {
  const v = Math.round(value * 10) / 10;
  return `${v}`;
}

export function formatDate(iso: string | Date | null, lang: string = "fr"): string {
  if (!iso) return "—";
  const d = typeof iso === "string" ? new Date(iso) : iso;
  if (isNaN(d.getTime())) return "—";
  const locale = lang === "ar" ? "ar-DZ" : lang === "fr" ? "fr-FR" : "en-GB";
  return new Intl.DateTimeFormat(locale, {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(d);
}

export function formatDateTime(iso: string | Date | null, lang: string = "fr"): string {
  if (!iso) return "—";
  const d = typeof iso === "string" ? new Date(iso) : iso;
  if (isNaN(d.getTime())) return "—";
  const locale = lang === "ar" ? "ar-DZ" : lang === "fr" ? "fr-FR" : "en-GB";
  return new Intl.DateTimeFormat(locale, {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(d);
}

export function timeAgo(iso: string | Date | null, lang: string = "fr"): string {
  if (!iso) return "—";
  const d = typeof iso === "string" ? new Date(iso) : iso;
  const diff = Date.now() - d.getTime();
  const mins = Math.round(diff / 60000);
  if (mins < 1) return lang === "ar" ? "الآن" : lang === "fr" ? "maintenant" : "now";
  if (mins < 60) return lang === "ar" ? `قبل ${mins} د` : lang === "fr" ? `il y a ${mins} min` : `${mins}m ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return lang === "ar" ? `قبل ${hrs} س` : lang === "fr" ? `il y a ${hrs} h` : `${hrs}h ago`;
  const days = Math.round(hrs / 24);
  return lang === "ar" ? `قبل ${days} ي` : lang === "fr" ? `il y a ${days} j` : `${days}d ago`;
}

export function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

export function startOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

export function endOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(23, 59, 59, 999);
  return x;
}

export function monthKey(d: Date = new Date()): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export function weekStart(d: Date = new Date()): Date {
  const x = startOfDay(d);
  const day = x.getDay(); // 0 sun
  const diff = (day + 6) % 7; // make monday start
  x.setDate(x.getDate() - diff);
  return x;
}
