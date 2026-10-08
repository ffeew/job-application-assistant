import { expect, test } from "vitest";
import { spawnSync } from "node:child_process";
import { compileLatex, inspectLatexLog, MAX_TEX_BYTES } from "./compiler";
import { createCompilerServer } from "./server";
import { syntheticResume } from "../../src/lib/resume-fixture.test-helper";
import { generateProfessionalResumeLatex } from "../../src/lib/resume-templates/professional-latex";

test("compiler diagnostics detect overflow and missing glyphs", () => {
  expect(
    inspectLatexLog("Overfull \\hbox (12.4pt too wide) in paragraph")
      .overflowPt,
  ).toBe(12.4);
  expect(() =>
    inspectLatexLog("Missing character: There is no x in font!"),
  ).toThrow();
  expect(() => inspectLatexLog("LaTeX Error: Broken input")).toThrow();
});

test("compiler rejects unbounded input before launching TeX", async () => {
  expect(
    await failureMessage(compileLatex("a".repeat(MAX_TEX_BYTES + 1))),
  ).toContain("too large");
});

async function failureMessage(action: Promise<unknown>): Promise<string> {
  try {
    await action;
    return "";
  } catch (error) {
    return error instanceof Error ? error.message : "Unknown failure";
  }
}

test("compiler service authenticates and validates requests", async () => {
  const token = "synthetic-test-token-32-characters-long";
  const server = createCompilerServer(token, () =>
    Promise.resolve({
      pdfBase64: "JVBERi0=",
      pageCount: 1,
      overflowPt: 0,
      warnings: [],
    }),
  );
  await new Promise<void>((resolve) => {
    server.listen(0, "127.0.0.1", resolve);
  });
  try {
    const address = server.address();
    if (!address || typeof address === "string")
      throw new Error("Missing test server port.");
    const url = `http://127.0.0.1:${address.port}`;
    expect((await fetch(`${url}/health`)).status).toBe(200);
    expect((await fetch(`${url}/compile`, { method: "POST" })).status).toBe(
      401,
    );
    const headers = {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    };
    expect(
      (await fetch(`${url}/compile`, { method: "POST", headers, body: "{}" }))
        .status,
    ).toBe(400);
    expect(
      (
        await fetch(`${url}/compile`, {
          method: "POST",
          headers,
          body: JSON.stringify({ tex: "source" }),
        })
      ).status,
    ).toBe(200);
  } finally {
    await new Promise<void>((resolve, reject) => {
      server.close((error) => {
        if (error) reject(error);
        else resolve();
      });
    });
  }
});

const available =
  spawnSync("kpsewhich", ["newtxtext.sty"]).status === 0 &&
  spawnSync("pdfinfo", ["-v"]).status === 0;
function integrationTest(
  name: string,
  action: () => Promise<void>,
  timeout: number,
) {
  if (available) test(name, action, timeout);
  else test.skip(name, action, timeout);
}
integrationTest(
  "real pdfLaTeX compiles synthetic one-page, two-page, and overflowing resumes",
  async () => {
    expect(
      (await compileLatex(generateProfessionalResumeLatex(syntheticResume())))
        .pageCount,
    ).toBe(1);
    expect(
      (
        await compileLatex(
          generateProfessionalResumeLatex(syntheticResume(100)),
        )
      ).pageCount,
    ).toBe(2);
    expect(
      (
        await compileLatex(
          generateProfessionalResumeLatex(syntheticResume(220)),
        )
      ).pageCount,
    ).toBeGreaterThan(2);
  },
  60000,
);

integrationTest(
  "real compiler handles accents, long links, and literal TeX safely",
  async () => {
    const document = syntheticResume();
    document.name = "Alex Éxample";
    document.contacts.push({
      label: "Portfolio",
      text: `https://example.test/${"long-path/".repeat(15)}`,
      url: `https://example.test/${"long-path/".repeat(15)}`,
    });
    const bullet = document.sections[0]?.entries[0]?.bullets[0];
    if (bullet)
      bullet.text += " Literal \\input{/etc/passwd} & 50% _ # { } – ‘text’.";
    const result = await compileLatex(
      generateProfessionalResumeLatex(document),
    );
    expect(result.pageCount).toBe(1);
    expect(result.overflowPt).toBeLessThanOrEqual(1);
  },
  30000,
);

integrationTest(
  "real compiler returns an error for unsupported characters",
  async () => {
    const document = syntheticResume();
    document.name = "Unsupported 🧠";
    expect(
      await failureMessage(
        compileLatex(generateProfessionalResumeLatex(document)),
      ),
    ).toContain("characters");
  },
  30000,
);
