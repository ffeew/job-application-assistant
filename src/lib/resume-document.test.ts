import { expect, test } from "vitest";
import {
  parseGeneratedResume,
  serializeGeneratedResume,
  documentToResumeContent,
  type GeneratedResumeResult,
} from "./resume-document";
import {
  escapeLatex,
  formatLatex,
  generateProfessionalResumeLatex,
} from "./resume-templates/professional-latex";
import { syntheticResume } from "./resume-fixture.test-helper";
import { resumeRequestKey } from "./resume-preview";

test("escapes TeX input and permits only text emphasis", () => {
  expect(escapeLatex("\\input{secret} & 20% #1_$~^")).toBe(
    "\\textbackslash{}input\\{secret\\} \\& 20\\% \\#1\\_\\$\\textasciitilde{}\\textasciicircum{}",
  );
  expect(formatLatex("**20%** on *Portal* \\write18{bad}")).toContain(
    "\\textbf{20\\%} on \\textit{Portal} \\textbackslash{}write18\\{bad\\}",
  );
  expect(generateProfessionalResumeLatex(syntheticResume())).toContain(
    "left=0.5in,right=0.5in,top=0.43in,bottom=0.35in",
  );
});

test("saved snapshots omit PDF bytes and remain readable by legacy consumers", () => {
  const result: GeneratedResumeResult = {
    schemaVersion: 2,
    renderer: "latex",
    templateVersion: 1,
    document: syntheticResume(),
    aiSelection: null,
    config: { targetPages: 1 },
    generatedAt: "2026-10-04T00:00:00.000Z",
    pdfBase64: "JVBERi0=",
    fit: {
      targetPages: 1,
      pageCount: 1,
      revisions: 0,
      fitsTarget: true,
      changes: [],
      warnings: [],
    },
  };
  const serialized = serializeGeneratedResume(result);
  expect(serialized).not.toContain("pdfBase64");
  const saved = parseGeneratedResume(serialized);
  expect(saved?.document).toEqual(result.document);
  expect(documentToResumeContent(result.document).experience).toContain("20%");
  expect(parseGeneratedResume('{"html":"legacy"}')).toBeNull();
  expect(parseGeneratedResume("bad json")).toBeNull();
});

test("request comparison catches changed options and ignores key order or path-owned ID", () => {
  expect(
    resumeRequestKey({
      title: "Resume",
      applicationId: "a",
      targetPages: 1,
      template: "modern",
    }),
  ).toBe(
    resumeRequestKey({
      template: "professional",
      targetPages: 1,
      title: "Resume",
    }),
  );
  expect(resumeRequestKey({ targetPages: 1 })).not.toBe(
    resumeRequestKey({ targetPages: 2 }),
  );
});
