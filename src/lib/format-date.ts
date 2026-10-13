const shortDate = new Intl.DateTimeFormat(undefined, {
  day: "numeric",
  month: "short",
  year: "numeric",
});

/** A compact, locale-aware date such as "2 Oct 2026"; empty for invalid input. */
export function formatShortDate(value: string | Date): string {
  const date = typeof value === "string" ? new Date(value) : value;
  return Number.isNaN(date.getTime()) ? "" : shortDate.format(date);
}

const calendarDay = new Intl.DateTimeFormat(undefined, {
  day: "numeric",
  month: "short",
  year: "numeric",
  timeZone: "UTC",
});

/**
 * Formats a calendar day that is stored at UTC midnight, such as the date an
 * application was sent. Rendering it in the viewer's zone would show the day
 * before anywhere west of Greenwich.
 */
export function formatCalendarDay(value: string | Date): string {
  const date = typeof value === "string" ? new Date(value) : value;
  return Number.isNaN(date.getTime()) ? "" : calendarDay.format(date);
}

/** Today's date in the viewer's zone, as a date input expects it. */
export function localDateInputValue(now = new Date()): string {
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${now.getFullYear()}-${month}-${day}`;
}
