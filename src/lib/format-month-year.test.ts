import { expect, test } from "vitest";
import { formatMonthYear } from "./format-month-year";

test.each([
  ["2024-01", "Jan 2024"], ["2024-12", "Dec 2024"], [null, ""], ["", ""],
  ["2024", ""], ["2024-00", ""], ["2024-13", ""], ["2024-01-02", ""],
  ["not a date", ""],
])("formats stored month %s defensively", (input, expected) => {
  expect(formatMonthYear(input)).toBe(expected);
});
