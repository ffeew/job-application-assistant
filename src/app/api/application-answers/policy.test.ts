import { describe, expect, test } from "vitest";
import { questionFlag } from "./policy";

describe("questionFlag", () => {
  test.each([
    ["Gender", "Answer this yourself"],
    ["Are you a protected veteran?", "Answer this yourself"],
    [
      "Will you now or in the future require visa sponsorship?",
      "Answer this yourself",
    ],
    ["What are your salary expectations?", "Answer this yourself"],
    ["I certify the above is true", "Read and confirm this yourself"],
    ["I agree to the privacy policy", "Read and confirm this yourself"],
  ])("flags %s", (question, reason) => {
    expect(questionFlag(question)).toBe(reason);
  });

  test.each([
    "Why do you want to work here?",
    "Do you hold a PMP certification?",
    "How many years of Python experience do you have?",
  ])("leaves %s alone", (question) => {
    expect(questionFlag(question)).toBe("");
  });
});
