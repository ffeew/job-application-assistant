import { z } from "zod";
import type { CompilationResult, ResumeDocument } from "./resume-document";
import { resumeBulletSchema } from "./resume-document";

export const resumeRevisionSchema = z.object({
  summary: z.string().nullable(),
  entries: z.array(
    z.object({ sourceId: z.string(), bullets: z.array(resumeBulletSchema) }),
  ),
  changes: z.array(z.string()),
});
export type ResumeRevision = z.infer<typeof resumeRevisionSchema>;
const numbers = (text: string) =>
  text
    .replace(/\*/g, "")
    .match(
      /\d[\d,.]*(?:\s*(?:%|GB|MB|TB|ms|seconds?|minutes?|hours?|days?|weeks?|months?|years?|pages?|documents?))?\+?/gi,
    ) ?? [];

export function applyResumeRevision(
  original: ResumeDocument,
  revision: ResumeRevision,
): ResumeDocument {
  const originalEntries = original.sections.flatMap(
    (section) => section.entries,
  );
  const proposed = new Map(
    revision.entries.map((entry) => [entry.sourceId, entry]),
  );
  if (
    proposed.size !== originalEntries.length ||
    proposed.size !== revision.entries.length
  )
    throw new Error("Revision changed selected entries.");
  if (
    (original.summary === null) !== (revision.summary === null) ||
    (original.summary && !revision.summary?.trim())
  )
    throw new Error("Revision removed the selected summary.");
  if (
    revision.summary &&
    JSON.stringify(numbers(revision.summary)) !==
      JSON.stringify(numbers(original.summary ?? ""))
  )
    throw new Error("Revision changed summary metrics.");
  return {
    ...original,
    summary: revision.summary,
    sections: original.sections.map((section) => ({
      ...section,
      entries: section.entries.map((entry) => {
        const changed = proposed.get(entry.sourceId);
        if (
          !changed ||
          (entry.bullets.length > 0 && changed.bullets.length === 0)
        )
          throw new Error("Revision removed a selected entry's content.");
        const ids = new Set<string>();
        for (const bullet of changed.bullets) {
          const source = entry.bullets.find(
            (item) => item.sourceId === bullet.sourceId,
          );
          if (!source || ids.has(bullet.sourceId))
            throw new Error("Revision introduced an unsupported bullet.");
          ids.add(bullet.sourceId);
          if (
            JSON.stringify(numbers(source.text)) !==
            JSON.stringify(numbers(bullet.text))
          )
            throw new Error("Revision changed a source metric or unit.");
          const ownership =
            source.text.match(
              /\b(co-led|co-built|co-architected|contributed|contributor|collaborated|assisted|mentored)\b/gi,
            ) ?? [];
          if (
            ownership.some(
              (word) => !bullet.text.toLowerCase().includes(word.toLowerCase()),
            )
          )
            throw new Error("Revision changed contribution scope.");
        }
        return { ...entry, bullets: changed.bullets };
      }),
    })),
  };
}

interface Candidate {
  document: ResumeDocument;
  compilation: CompilationResult;
  changes: string[];
}
export interface FittingDependencies {
  compile: (
    document: ResumeDocument,
    signal: AbortSignal,
  ) => Promise<CompilationResult>;
  revise: (
    original: ResumeDocument,
    current: ResumeDocument,
    feedback: CompilationResult,
    signal: AbortSignal,
  ) => Promise<ResumeRevision>;
}

export async function fitResume(
  original: ResumeDocument,
  targetPages: 1 | 2,
  dependencies: FittingDependencies,
  signal: AbortSignal = AbortSignal.timeout(180000),
) {
  let best: Candidate = {
    document: original,
    compilation: await dependencies.compile(original, signal),
    changes: [],
  };
  let current = best;
  const warnings: string[] = [];
  let revisions = 0;
  const fits = (candidate: Candidate) =>
    candidate.compilation.pageCount <= targetPages &&
    candidate.compilation.overflowPt <= 1;
  const bulletCount = (candidate: Candidate) =>
    candidate.document.sections
      .flatMap((section) => section.entries)
      .reduce((sum, entry) => sum + entry.bullets.length, 0);
  for (
    let attempt = 0;
    attempt < 3 && !fits(best) && !signal.aborted;
    attempt++
  ) {
    revisions++;
    try {
      const revision = await dependencies.revise(
        original,
        current.document,
        current.compilation,
        signal,
      );
      const document = applyResumeRevision(original, revision);
      const compilation = await dependencies.compile(document, signal);
      current = { document, compilation, changes: revision.changes };
      if (
        (fits(current) && !fits(best)) ||
        (fits(current) === fits(best) &&
          (compilation.pageCount < best.compilation.pageCount ||
            (compilation.pageCount === best.compilation.pageCount &&
              (compilation.overflowPt < best.compilation.overflowPt ||
                (compilation.overflowPt === best.compilation.overflowPt &&
                  bulletCount(current) > bulletCount(best))))))
      )
        best = current;
    } catch {
      warnings.push(
        "An AI revision could not be applied. The last valid draft was retained.",
      );
      break;
    }
  }
  if (!fits(best))
    warnings.push(
      `The draft did not meet the ${targetPages}-page layout target. Select less content or increase the page target and retry.`,
    );
  if (signal.aborted)
    warnings.push(
      "The fitting time limit was reached. The best compiled draft was retained.",
    );
  return {
    ...best,
    fit: {
      targetPages,
      pageCount: best.compilation.pageCount,
      revisions,
      fitsTarget: fits(best),
      changes: best.changes,
      warnings: [...new Set([...warnings, ...best.compilation.warnings])],
    },
  };
}
