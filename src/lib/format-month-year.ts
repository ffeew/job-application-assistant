import { MONTH_PATTERN } from "./month";

const monthNames = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

export function formatMonthYear(value: string | null): string {
  if (!value || !MONTH_PATTERN.test(value)) return "";
  const [year, month] = value.split("-");
  if (!year || !month || !/^\d{4}$/.test(year) || !/^\d{2}$/.test(month)) {
    return "";
  }
  const monthName = monthNames[Number(month) - 1];
  return monthName ? `${monthName} ${year}` : "";
}
