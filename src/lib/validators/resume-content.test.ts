import { describe, expect, test } from "vitest";
import { parseManualResumeContent } from "./resume-content";

describe("parseManualResumeContent", () => {
  test("reads a manual resume and fills sections it omits", () => {
    expect(
      parseManualResumeContent(
        JSON.stringify({
          personalInfo: { name: "Alex Example" },
          summary: "Engineer.",
        }),
      ),
    ).toEqual({
      personalInfo: { name: "Alex Example", email: "", phone: "", address: "" },
      summary: "Engineer.",
      experience: "",
      education: "",
      skills: "",
    });
  });

  test.each([
    ["text that is not JSON", "Plain resume text"],
    ["a JSON array", "[]"],
    ["a JSON string", '"resume"'],
    ["null", "null"],
    [
      "a generated snapshot, even one from another schema version",
      JSON.stringify({ schemaVersion: 3, renderer: "latex", document: {} }),
    ],
    ["a legacy HTML resume", JSON.stringify({ html: "<h1>Resume</h1>" })],
    ["fields of the wrong type", JSON.stringify({ summary: 42 })],
  ])("returns null for %s", (_, content) => {
    expect(parseManualResumeContent(content)).toBeNull();
  });
});
