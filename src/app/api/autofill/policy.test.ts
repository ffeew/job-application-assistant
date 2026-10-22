import { describe, expect, test } from "vitest";
import { answerRefusal, clickRefusal, labelPurpose } from "./policy";

describe("labelPurpose", () => {
  test("names the steps the assistant may take", () => {
    for (const label of [
      "Next",
      "Next →",
      "Next step",
      "Continue",
      "Save and Continue",
      "Save & Continue",
    ]) {
      expect(labelPurpose(label), label).toBe("next");
    }
    expect(labelPurpose("+ Add")).toBe("add_entry");
    expect(labelPurpose("Add Another")).toBe("add_entry");
    expect(labelPurpose("Save")).toBe("save_entry");
  });

  test("gives submitting, leaving and unnamed buttons no purpose", () => {
    for (const label of [
      "Submit",
      "Submit application",
      "Apply",
      "Apply Manually",
      "Continue to apply",
      "Add and submit",
      "Save and submit",
      "Sign in",
      "Weiter",
      "",
      "→",
    ]) {
      expect(labelPurpose(label), label).toBeNull();
    }
  });
});

describe("clickRefusal", () => {
  test("allows a click only when its name matches its purpose", () => {
    expect(clickRefusal({ purpose: "next", label: "Next" })).toBe("");
    expect(clickRefusal({ purpose: "expand", label: "Education" })).toBe("");
    expect(clickRefusal({ purpose: "add_entry", label: "Next" })).not.toBe("");
    expect(clickRefusal({ purpose: "next", label: "Submit" })).not.toBe("");
    expect(clickRefusal({ purpose: "expand", label: "" })).not.toBe("");
    expect(
      clickRefusal({ purpose: "expand", label: "Delete this entry" }),
    ).not.toBe("");
  });

  test("leaves list answers to applicant-only questions", () => {
    expect(
      clickRefusal({
        purpose: "open_list",
        label: "Gender",
        question: "Gender",
      }),
    ).not.toBe("");
    expect(
      clickRefusal({
        purpose: "choose_option",
        label: "I am a protected veteran",
        question: "Please select",
      }),
    ).not.toBe("");
    expect(
      clickRefusal({
        purpose: "choose_option",
        label: "Bachelor's degree",
        question: "Highest degree",
      }),
    ).toBe("");
  });
});

describe("answerRefusal", () => {
  test("leaves demographic, eligibility and pay questions to the applicant", () => {
    for (const label of [
      "Are you a Singapore Citizen or Permanent Resident?",
      "Are you legally eligible to work in Canada?",
      "Do you have the right to work in the UK?",
      "Do you hold a work permit?",
      "Hispanic or Latino",
      "Sexual orientation",
      "Expected pay",
      "Current CTC",
      "Nationality",
      "Date of birth",
      "Religion",
      "Marital status",
      "NRIC number",
    ]) {
      expect(answerRefusal("text", label), label).toBe("Answer this yourself");
    }
  });

  test("reads section context without treating an employer named Visa as eligibility", () => {
    expect(answerRefusal("select", "Please select", "Veteran Status")).toBe(
      "Answer this yourself",
    );
    // A company named Visa doesn't make its form's text fields off limits.
    expect(answerRefusal("text", "Email", "Visa, Software Engineer")).toBe("");
  });
});
