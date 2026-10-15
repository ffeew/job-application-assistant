import { describe, expect, test } from "vitest";
import type { ResumeData } from "@/lib/resume-data";
import {
  buildAutofillPrompt,
  COVER_LETTER_PLACEHOLDER,
  finalizeFills,
  type AutofillContext,
} from "./fills";
import { AUTOFILL_MAX_FIELDS, AUTOFILL_MAX_OPTIONS } from "./limits";
import {
  autofillRequestSchema,
  type AutofillField,
  type AutofillRequest,
} from "./validators";

const field = (
  id: string,
  kind: AutofillField["kind"],
  label: string,
): AutofillField => ({ id, kind, label, required: false });

const request = (fields: AutofillField[]): AutofillRequest => ({
  url: "https://jobs.example.test/apply",
  pageText: "Apply for Platform Engineer",
  fields,
});

const profile = {
  profile: { firstName: "Alex", email: "alex@example.test" },
  workExperiences: [],
  education: [],
  skills: [],
  projects: [],
  certifications: [],
  achievements: [],
  references: [
    { id: 1, name: "Riley Referee", email: "riley@referee.test", phone: "555" },
  ],
} as unknown as ResumeData;

const context = (
  overrides: Partial<AutofillContext> = {},
): AutofillContext => ({
  profile,
  job: null,
  coverLetter: null,
  resumeId: "resume-1",
  ...overrides,
});

describe("buildAutofillPrompt", () => {
  test("leaves references and application bookkeeping out of the prompt", () => {
    const prompt = buildAutofillPrompt(
      request([field("0:0", "text", "Email")]),
      context({
        job: { company: "Acme", position: "Engineer", jobDescription: "Build" },
      }),
    );
    expect(prompt).toContain("alex@example.test");
    expect(prompt).toContain("Company: Acme");
    expect(prompt).not.toContain("riley@referee.test");
    expect(prompt).not.toContain("Riley Referee");
  });
});

describe("finalizeFills", () => {
  test("drops fills for fields that were not sent and invalid checkbox values", () => {
    const result = finalizeFills(
      {
        fills: [
          { fieldId: "0:0", value: "Alex", drafted: false },
          { fieldId: "9:9", value: "injected", drafted: false },
          { fieldId: "0:1", value: "yes please", drafted: false },
        ],
        unanswered: [{ fieldId: "9:8", reason: "unknown" }],
      },
      request([
        field("0:0", "text", "First name"),
        field("0:1", "checkbox", "Remote only"),
      ]),
      context(),
    );
    expect(result.fills).toEqual([
      { fieldId: "0:0", value: "Alex", drafted: false },
    ]);
    expect(result.unanswered).toEqual([
      { fieldId: "0:1", reason: "Needs your answer" },
    ]);
  });

  test("leaves ticking consent and attestation boxes to the applicant", () => {
    const result = finalizeFills(
      {
        fills: [
          { fieldId: "0:0", value: "true", drafted: false },
          { fieldId: "0:1", value: "true", drafted: false },
          { fieldId: "0:2", value: "true", drafted: false },
        ],
        unanswered: [],
      },
      request([
        field("0:0", "checkbox", "I agree to the privacy policy"),
        field("0:1", "checkbox", "I certify that this is accurate"),
        field("0:2", "checkbox", "Open to relocation"),
      ]),
      context(),
    );
    expect(result.fills.map((fill) => fill.fieldId)).toEqual(["0:2"]);
    expect(result.unanswered.map((item) => item.fieldId)).toEqual([
      "0:0",
      "0:1",
    ]);
  });

  test("leaves consent, demographic, salary and work authorization answers to the applicant", () => {
    const refused = [
      field("0:0", "radio", "Do you agree to the privacy policy?"),
      field("0:1", "select", "I acknowledge the statement above"),
      field("0:2", "combobox", "Do you consent to a background check?"),
      field("0:3", "checkbox", "I confirm the above is accurate"),
      field(
        "0:4",
        "checkbox",
        "Applicant Certification › I have read and understand",
      ),
      field("0:5", "checkbox", "I authorize a background check"),
      field("0:6", "checkbox", "I accept the terms"),
      field("0:7", "text", "Desired salary"),
      field("0:8", "radio", "Are you legally eligible to work in Canada?"),
      field("0:9", "radio", "Will you require visa sponsorship?"),
      field("0:10", "checkbox", "Race › Hispanic or Latino"),
    ];
    const kept = [
      field("1:0", "radio", "Do you hold a PMP certification?"),
      field("1:1", "radio", "Would you accept a contract role?"),
      field("1:2", "text", "Confirm email"),
    ];
    const fields = [...refused, ...kept];
    const result = finalizeFills(
      {
        fills: fields.map((item) => ({
          fieldId: item.id,
          // "false" is refused too: it would untick a box the user ticked.
          value: item.kind === "checkbox" ? "false" : "Yes",
          drafted: false,
        })),
        unanswered: [],
      },
      request(fields),
      context(),
    );
    expect(result.fills.map((fill) => fill.fieldId)).toEqual(
      kept.map((item) => item.id),
    );
    expect(result.unanswered.map((item) => item.fieldId)).toEqual(
      refused.map((item) => item.id),
    );
  });

  test("reports required fields the model skipped", () => {
    const result = finalizeFills(
      { fills: [], unanswered: [] },
      request([
        { ...field("0:0", "text", "Last name"), required: true },
        field("0:1", "text", "Site search"),
      ]),
      context(),
    );
    expect(result.unanswered).toEqual([
      { fieldId: "0:0", reason: "Needs your answer" },
    ]);
  });

  test("attaches the resume to one field and leaves cover letter uploads alone", () => {
    const fields = [
      field("0:0", "file", "Attachment"),
      field("0:1", "file", "Resume/CV"),
      field("0:2", "file", "Cover letter"),
    ];
    const output = {
      fills: fields.map((item) => ({
        fieldId: item.id,
        value: "resume",
        drafted: false,
      })),
      unanswered: [],
    };
    const result = finalizeFills(output, request(fields), context());
    expect(result.fills.map((fill) => fill.fieldId)).toEqual(["0:1"]);
    expect(result.unanswered.map((item) => item.fieldId).sort()).toEqual([
      "0:0",
      "0:2",
    ]);

    const noResume = finalizeFills(
      output,
      request(fields),
      context({ resumeId: null }),
    );
    expect(noResume.fills).toEqual([]);
    expect(noResume.resumeId).toBeNull();
  });

  test("puts the saved cover letter in place of the placeholder", () => {
    const output = {
      fills: [
        { fieldId: "0:0", value: COVER_LETTER_PLACEHOLDER, drafted: false },
      ],
      unanswered: [],
    };
    const fields = [field("0:0", "textarea", "Cover letter")];

    const withLetter = finalizeFills(
      output,
      request(fields),
      context({ coverLetter: "Dear team, $& stays literal." }),
    );
    expect(withLetter.fills[0]?.value).toBe("Dear team, $& stays literal.");

    const withoutLetter = finalizeFills(output, request(fields), context());
    expect(withoutLetter.fills).toEqual([]);
    expect(withoutLetter.unanswered).toEqual([
      { fieldId: "0:0", reason: "No saved cover letter for this application" },
    ]);
  });

  test("a filled field is not also reported as unanswered", () => {
    const result = finalizeFills(
      {
        fills: [{ fieldId: "0:0", value: "Alex", drafted: false }],
        unanswered: [{ fieldId: "0:0", reason: "unsure" }],
      },
      request([field("0:0", "text", "First name")]),
      context(),
    );
    expect(result.unanswered).toEqual([]);
  });
});

describe("autofillRequestSchema", () => {
  test("enforces the limits the extension trims to", () => {
    const fields = Array.from({ length: AUTOFILL_MAX_FIELDS + 1 }, (_, index) =>
      field(String(index), "text", "Name"),
    );
    expect(autofillRequestSchema.safeParse(request(fields)).success).toBe(
      false,
    );

    const select = {
      ...field("0", "select", "Country"),
      options: Array.from({ length: AUTOFILL_MAX_OPTIONS + 1 }, String),
    };
    expect(autofillRequestSchema.safeParse(request([select])).success).toBe(
      false,
    );
    expect(
      autofillRequestSchema.safeParse(
        request([{ ...select, options: select.options.slice(1) }]),
      ).success,
    ).toBe(true);
  });
});
