export const MONTH_PATTERN = /^\d{4}-(0[1-9]|1[0-2])$/;

const MONTH_NAMES =
  /\b(jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|june?|july?|aug(?:ust)?|sep(?:t(?:ember)?)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)\b/i;
const MONTH_PREFIXES = [
  "jan", "feb", "mar", "apr", "may", "jun",
  "jul", "aug", "sep", "oct", "nov", "dec",
];

function toMonth(year: string | undefined, month: number): string | null {
  if (!year || !Number.isInteger(month) || month < 1 || month > 12) return null;
  return `${year}-${String(month).padStart(2, "0")}`;
}

/**
 * Reads a `YYYY-MM` month from the date formats resumes use. The runtime's date
 * parser is avoided on purpose: it reads "Jan 2020" as local midnight, which is
 * still December in UTC for any host east of Greenwich.
 */
export function normalizeMonth(value: string | null | undefined): string | null {
  const text = value?.trim();
  if (!text || /present|current|ongoing/i.test(text)) return null;

  // 2020-03, 2020/03 and full ISO dates such as 2020-03-15.
  const yearFirst = /^(\d{4})[-/.](\d{1,2})(?:[-/.T]|$)/.exec(text);
  if (yearFirst) return toMonth(yearFirst[1], Number(yearFirst[2]));

  // 03/2020.
  const monthFirst = /^(\d{1,2})[-/.](\d{4})$/.exec(text);
  if (monthFirst) return toMonth(monthFirst[2], Number(monthFirst[1]));

  // 03/15/2020. When both leading parts could be a month the US order is assumed.
  const numeric = /^(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})$/.exec(text);
  if (numeric) {
    const first = Number(numeric[1]);
    const second = Number(numeric[2]);
    return toMonth(numeric[3], first > 12 ? second : first);
  }

  // Jan 2020, September 2019, 15 March 2021, Mar. 3, 2021.
  const name = MONTH_NAMES.exec(text)?.[1];
  const year = /\b(\d{4})\b/.exec(text)?.[1];
  if (name && year) {
    return toMonth(year, MONTH_PREFIXES.indexOf(name.slice(0, 3).toLowerCase()) + 1);
  }

  return /^\d{4}$/.test(text) ? `${text}-01` : null;
}
