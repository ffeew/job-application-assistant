import { describe, expect, it } from "vitest";
import {
  formatCalendarDay,
  formatShortDate,
  localDateInputValue,
} from "./format-date";

describe("formatShortDate", () => {
  it("formats ISO timestamps and Date objects", () => {
    expect(formatShortDate("2026-10-02T09:30:00.000Z")).toMatch(/2026/);
    expect(formatShortDate(new Date(2026, 9, 2))).toMatch(/2026/);
  });

  it("returns an empty string for invalid dates", () => {
    expect(formatShortDate("not a date")).toBe("");
  });
});

describe("calendar days", () => {
  it("shows a stored day unchanged in every time zone", () => {
    const original = process.env.TZ;
    try {
      for (const zone of ["UTC", "Asia/Singapore", "America/Los_Angeles"]) {
        process.env.TZ = zone;
        expect(formatCalendarDay("2026-10-13T00:00:00.000Z")).toMatch(/13/);
      }
    } finally {
      if (original === undefined) delete process.env.TZ;
      else process.env.TZ = original;
    }
  });

  it("returns an empty string for invalid dates", () => {
    expect(formatCalendarDay("not a date")).toBe("");
  });

  it("reads today's date from the local clock rather than UTC", () => {
    // 07:00 local time; in a zone ahead of UTC this is still the previous day in UTC.
    expect(localDateInputValue(new Date(2026, 9, 14, 7, 0))).toBe("2026-10-14");
    expect(localDateInputValue(new Date(2026, 0, 5, 23, 30))).toBe(
      "2026-01-05",
    );
  });
});
