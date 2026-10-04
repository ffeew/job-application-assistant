const monthNames = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

/** Format a stored month without assuming split results or array entries exist. */
export function formatMonthYear(value: string | null): string {
  if (!value || !/^\d{4}-(0[1-9]|1[0-2])$/.test(value)) return "";
  const [year, month] = value.split("-");
  if (!year || !month || !/^\d{4}$/.test(year) || !/^\d{2}$/.test(month)) {
    return "";
  }
  const monthName = monthNames[Number(month) - 1];
  return monthName ? `${monthName} ${year}` : "";
}
