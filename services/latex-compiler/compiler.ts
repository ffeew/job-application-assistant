import { spawn } from "node:child_process";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { CompilationResult } from "../../src/lib/resume-document";

export const MAX_TEX_BYTES = 256 * 1024;
export const MAX_PDF_BYTES = 2 * 1024 * 1024;

function run(command: string, args: string[], cwd: string): Promise<string> {
  return new Promise((resolve, reject) => {
    // Pass only compiler settings, never service tokens or application secrets.
    const childEnvironment: NodeJS.ProcessEnv = {
      NODE_ENV: process.env.NODE_ENV,
      PATH: process.env.PATH ?? "/usr/bin:/bin",
      LANG: "C.UTF-8",
      openin_any: "p",
      openout_any: "p",
      TEXMFVAR: cwd,
    };
    const child = spawn(command, args, {
      cwd,
      detached: process.platform !== "win32",
      stdio: ["ignore", "pipe", "pipe"],
      env: childEnvironment,
    });
    let output = "";
    let timedOut = false;
    const stop = () => {
      timedOut = true;
      if (child.pid && process.platform !== "win32") {
        try {
          process.kill(-child.pid, "SIGKILL");
        } catch {
          /* Already exited. */
        }
      } else child.kill("SIGKILL");
    };
    const timer = setTimeout(stop, 15000);
    child.stdout.on("data", (data: Buffer) => {
      output += data.toString();
      if (output.length > 4 * 1024 * 1024) stop();
    });
    child.stderr.on("data", (data: Buffer) => {
      if (output.length < 4 * 1024 * 1024) output += data.toString();
    });
    child.on("error", (error) => {
      clearTimeout(timer);
      reject(error);
    });
    child.on("close", (code) => {
      clearTimeout(timer);
      if (timedOut)
        reject(new Error("LaTeX compilation exceeded its resource limit."));
      else if (code !== 0)
        reject(
          new Error(
            "LaTeX compilation failed. Check for unsupported characters in the selected content.",
          ),
        );
      else resolve(output);
    });
  });
}

export function inspectLatexLog(log: string) {
  if (
    /Missing character:|Unicode character .*not set up|LaTeX Error:/i.test(log)
  ) {
    throw new Error(
      "The selected content contains characters that pdfLaTeX cannot render. Replace the unsupported characters and retry.",
    );
  }
  const overflows = [
    ...log.matchAll(/Overfull \\[hv]box \(([\d.]+)pt too (?:wide|high)\)/g),
  ].map((match) => Number(match[1] ?? 0));
  const overflowPt = Math.max(0, ...overflows);
  return {
    overflowPt,
    warnings:
      overflowPt > 1 ? ["Some content extends beyond the printable area."] : [],
  };
}

export async function compileLatex(tex: string): Promise<CompilationResult> {
  if (!tex.trim() || Buffer.byteLength(tex) > MAX_TEX_BYTES)
    throw new Error("Resume source is empty or too large.");
  const directory = await mkdtemp(join(tmpdir(), "resume-latex-"));
  try {
    await writeFile(join(directory, "resume.tex"), tex, { mode: 0o600 });
    await run(
      "latexmk",
      [
        "-norc",
        "-pdf",
        "-no-shell-escape",
        "-interaction=nonstopmode",
        "-halt-on-error",
        "-file-line-error",
        "resume.tex",
      ],
      directory,
    );
    const log = await readFile(join(directory, "resume.log"), "utf8");
    const diagnostics = inspectLatexLog(log);
    const pdf = await readFile(join(directory, "resume.pdf"));
    if (
      !pdf.subarray(0, 5).equals(Buffer.from("%PDF-")) ||
      pdf.length > MAX_PDF_BYTES
    )
      throw new Error("The generated PDF is invalid or too large.");
    const info = await run("pdfinfo", ["resume.pdf"], directory);
    const pageCount = Number(info.match(/^Pages:\s+(\d+)/m)?.[1]);
    if (!Number.isInteger(pageCount) || pageCount < 1)
      throw new Error("Could not inspect the generated PDF.");
    const extracted = await run("pdftotext", ["resume.pdf", "-"], directory);
    if (!extracted.trim())
      throw new Error("The generated PDF contains no readable text.");
    return { pdfBase64: pdf.toString("base64"), pageCount, ...diagnostics };
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
}
