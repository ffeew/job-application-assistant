import { describe, expect, test } from "vitest";
import {
  applyResumeRevision,
  fitResume,
  type ResumeRevision,
} from "./resume-fitting";
import type { CompilationResult } from "./resume-document";
import { syntheticResume } from "./resume-fixture.test-helper";

const compiled = (pageCount: number, overflowPt = 0): CompilationResult => ({
  pdfBase64: "JVBERi0=",
  pageCount,
  overflowPt,
  warnings: [],
});
const revision = (): ResumeRevision => ({
  summary: syntheticResume().summary,
  changes: ["Removed a lower-priority bullet."],
  entries: [
    {
      sourceId: "work:1",
      bullets: [
        {
          sourceId: "work:1:bullet:0",
          text: "Co-led portal development, cutting processing time by 20% for 1 teams.",
        },
      ],
    },
  ],
});

describe("factual revisions", () => {
  test("shortens bullets without changing fixed fields or the source", () => {
    const source = syntheticResume();
    const result = applyResumeRevision(source, revision());
    expect(result.sections[0]?.entries[0]?.heading).toBe(
      source.sections[0]?.entries[0]?.heading ?? "",
    );
    expect(result.sections[0]?.entries[0]?.bullets).toHaveLength(1);
    expect(source.sections[0]?.entries[0]?.bullets).toHaveLength(2);
  });
  test("rejects changed metrics, ownership, fabricated bullets, and missing entries", () => {
    for (const text of [
      "Co-led development with 99% improvement for 1 teams.",
      "Led development, cutting processing time by 20% for 1 teams.",
    ]) {
      const proposed = revision();
      const bullet = proposed.entries[0]?.bullets[0];
      if (bullet) bullet.text = text;
      expect(() => applyResumeRevision(syntheticResume(), proposed)).toThrow();
    }
    const fabricated = revision();
    const bullet = fabricated.entries[0]?.bullets[0];
    if (bullet) bullet.sourceId = "someone-else:1";
    expect(() => applyResumeRevision(syntheticResume(), fabricated)).toThrow();
    expect(() =>
      applyResumeRevision(syntheticResume(), { ...revision(), entries: [] }),
    ).toThrow();
  });
});

describe("compiled feedback loop", () => {
  test("does not call AI when the original fits", async () => {
    let calls = 0;
    const result = await fitResume(syntheticResume(), 1, {
      compile: () => Promise.resolve(compiled(1)),
      revise: () => {
        calls++;
        return Promise.resolve(revision());
      },
    });
    expect(calls).toBe(0);
    expect(result.fit.fitsTarget).toBe(true);
  });
  test("recompiles a revision and returns that document and PDF together", async () => {
    let calls = 0;
    const result = await fitResume(syntheticResume(), 1, {
      compile: () => Promise.resolve(compiled(++calls === 1 ? 2 : 1)),
      revise: () => Promise.resolve(revision()),
    });
    expect(calls).toBe(2);
    expect(result.fit.revisions).toBe(1);
    expect(result.fit.pageCount).toBe(1);
    expect(result.document.sections[0]?.entries[0]?.bullets).toHaveLength(1);
  });
  test("prefers a fitting two-page draft over one page with overflow", async () => {
    let calls = 0;
    const result = await fitResume(syntheticResume(), 2, {
      compile: () =>
        Promise.resolve(++calls === 1 ? compiled(1, 10) : compiled(2)),
      revise: () => Promise.resolve(revision()),
    });
    expect(result.fit.fitsTarget).toBe(true);
    expect(result.fit.pageCount).toBe(2);
  });
  test("caps revisions and retains the best draft when a later draft is worse", async () => {
    let calls = 0;
    const pages = [4, 3, 5, 4];
    const result = await fitResume(syntheticResume(), 1, {
      compile: () => Promise.resolve(compiled(pages[calls++] ?? 6)),
      revise: () => Promise.resolve(revision()),
    });
    expect(calls).toBe(4);
    expect(result.fit.revisions).toBe(3);
    expect(result.fit.pageCount).toBe(3);
    expect(result.fit.fitsTarget).toBe(false);
    expect(result.fit.warnings.join(" ")).toContain("did not meet");
  });
  test("returns the original compiled PDF if AI or revision compilation fails", async () => {
    const result = await fitResume(syntheticResume(), 1, {
      compile: () => Promise.resolve(compiled(2)),
      revise: () => Promise.reject(new Error("AI unavailable")),
    });
    expect(result.document).toEqual(syntheticResume());
    expect(result.fit.warnings.length).toBeGreaterThan(0);
  });
});
