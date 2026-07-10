import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/** Format a date for display in zh-CN locale */
export function formatDate(
  date: string | Date,
  format: "short" | "full" | "date" = "short"
): string {
  const d = typeof date === "string" ? new Date(date) : date;
  if (format === "full") {
    return d.toLocaleString("zh-CN");
  }
  if (format === "date") {
    return d.toLocaleString("zh-CN", {
      month: "2-digit",
      day: "2-digit",
    });
  }
  return d.toLocaleString("zh-CN", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/** Get the CSS class for a follow-up evaluation badge */
export function getEvaluationColor(evaluation: string): string {
  if (evaluation === "痊愈" || evaluation === "显效") return "text-(--success)";
  if (evaluation === "无效") return "text-(--warn)";
  if (evaluation === "加重") return "text-(--danger)";
  return "";
}

// Re-export for convenience
export { type ClassValue } from "clsx"
