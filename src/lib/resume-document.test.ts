import { expect, test } from "vitest";
import {
  parseGeneratedResume,
  serializeGeneratedResume,
  documentToResumeContent,
  type GeneratedResumeResult,
} from "./resume-document";
import {
  escapeLatex,
  escapeLatexUrl,
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

test("link targets keep URL characters and bullets never read a leading bracket as a label", () => {
  expect(escapeLatexUrl("https://uni.test/~alex/a_b?x=1&y=2#f%20g")).toBe(
    "https://uni.test/~alex/a\\_b?x=1\\&y=2\\#f\\%20g",
  );
  expect(escapeLatexUrl("https://uni.test/a\\b{c}^d $e")).toBe(
    "https://uni.test/a\\%5Cb\\%7Bc\\%7D\\%5Ed\\%20\\%24e",
  );
  const resume = syntheticResume(1);
  const contact = resume.contacts[1];
  const bullet = resume.sections[0]?.entries[0]?.bullets[0];
  if (!contact || !bullet) throw new Error("Fixture is missing entries");
  contact.url = "https://uni.test/~alex";
  bullet.text = "[Python] Built a parser";
  const latex = generateProfessionalResumeLatex(resume);
  expect(latex).toContain("\\href{https://uni.test/~alex}");
  expect(latex).toContain("\\item{} [Python] Built a parser");
  contact.url = "file:///etc/passwd";
  expect(generateProfessionalResumeLatex(resume)).not.toContain("\\href{file");
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
