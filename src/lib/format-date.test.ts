import { describe, expect, it } from "vitest";
import { formatShortDate } from "./format-date";

describe("formatShortDate", () => {
  it("formats ISO timestamps and Date objects", () => {
    expect(formatShortDate("2026-10-02T09:30:00.000Z")).toMatch(/2026/);
    expect(formatShortDate(new Date(2026, 9, 2))).toMatch(/2026/);
  });

  it("returns an empty string for invalid dates", () => {
    expect(formatShortDate("not a date")).toBe("");
  });
});
