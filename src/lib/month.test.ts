import { describe, expect, test } from "vitest";
import { normalizeMonth } from "./month";

describe("normalizeMonth", () => {
  test.each([
    ["2020-03", "2020-03"],
    ["2020-3", "2020-03"],
    ["2020/03", "2020-03"],
    ["2020-03-15", "2020-03"],
    ["2020-03-15T00:00:00Z", "2020-03"],
    ["03/2020", "2020-03"],
    ["3/2020", "2020-03"],
    ["03/15/2020", "2020-03"],
    ["15/03/2020", "2020-03"],
    ["Jan 2020", "2020-01"],
    ["January 2020", "2020-01"],
    ["Sept 2019", "2019-09"],
    ["Sep. 2019", "2019-09"],
    ["15 March 2021", "2021-03"],
    ["Mar 3, 2021", "2021-03"],
    ["DECEMBER 2018", "2018-12"],
    ["2017", "2017-01"],
    ["  May 2016  ", "2016-05"],
  ])("reads %s as %s", (input, expected) => {
    expect(normalizeMonth(input)).toBe(expected);
  });

  test.each([
    null,
    undefined,
    "",
    "   ",
    "Present",
    "current",
    "Ongoing",
    "2020-13",
    "13/2020",
    "Summer 2020",
    "soon",
    "March",
  ])("returns null for %s", (input) => {
    expect(normalizeMonth(input)).toBeNull();
  });

  // The previous implementation went through Date and lost a month east of UTC.
  test("does not depend on the host time zone", () => {
    const original = process.env.TZ;
    try {
      for (const zone of ["UTC", "Asia/Singapore", "America/Los_Angeles"]) {
        process.env.TZ = zone;
        expect(normalizeMonth("Jan 2020")).toBe("2020-01");
        expect(normalizeMonth("Dec 2020")).toBe("2020-12");
      }
    } finally {
      if (original === undefined) delete process.env.TZ;
      else process.env.TZ = original;
    }
  });
});
