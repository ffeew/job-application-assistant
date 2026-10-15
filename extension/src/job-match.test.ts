import { describe, expect, test } from "vitest";
import { matchApplication } from "./job-match";

const saved = (id: string, jobUrl: string) => ({ id, jobUrl });

describe("matchApplication", () => {
  test("matches whole path segments, ignoring trailing slashes", () => {
    const applications = [saved("a", "https://boards.example.test/acme/12")];
    expect(
      matchApplication("https://boards.example.test/acme/12345", applications),
    ).toBeUndefined();
    expect(
      matchApplication(
        "https://boards.example.test/acme/12/apply",
        applications,
      ),
    ).toBe("a");
    expect(
      matchApplication("https://jobs.example.test/j/ABC/apply/", [
        saved("b", "https://jobs.example.test/j/ABC/"),
      ]),
    ).toBe("b");
  });

  test("a careers home page names no job", () => {
    expect(
      matchApplication("https://careers.example.test/jobs/1", [
        saved("a", "https://careers.example.test"),
      ]),
    ).toBeUndefined();
  });

  test("job ids in the query must agree, but tracking parameters don't count", () => {
    const applications = [
      saved("a", "https://acme.example.test/careers?gh_jid=1"),
      saved("b", "https://acme.example.test/careers?gh_jid=2"),
    ];
    expect(
      matchApplication(
        "https://acme.example.test/careers?gh_jid=2",
        applications,
      ),
    ).toBe("b");
    expect(
      matchApplication("https://jobs.example.test/12?utm_source=email", [
        saved("c", "https://jobs.example.test/12?utm_source=linkedin"),
      ]),
    ).toBe("c");
  });

  test("the closest link wins, and an equal tie between links picks none", () => {
    expect(
      matchApplication("https://jobs.example.test/acme/12/apply", [
        saved("a", "https://jobs.example.test/acme"),
        saved("b", "https://jobs.example.test/acme/12"),
      ]),
    ).toBe("b");
    // The query was dropped, so both postings fit the page equally.
    expect(
      matchApplication("https://acme.example.test/careers", [
        saved("a", "https://acme.example.test/careers?gh_jid=1"),
        saved("b", "https://acme.example.test/careers?gh_jid=2"),
      ]),
    ).toBeUndefined();
    // The same posting saved twice: the newest, listed first, wins.
    expect(
      matchApplication("https://jobs.example.test/12", [
        saved("new", "https://jobs.example.test/12"),
        saved("old", "https://jobs.example.test/12"),
      ]),
    ).toBe("new");
  });
});
