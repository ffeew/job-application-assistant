import { spawnSync } from "node:child_process";
import {
  copyFile,
  mkdir,
  mkdtemp,
  readFile,
  rm,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { expect, test } from "vitest";
import { z } from "zod";

const inheritedSettings = {
  POSTGRES_PASSWORD: "test-inherited-password",
  BETTER_AUTH_SECRET: "test-inherited-auth-secret",
  GROQ_API_KEY: "test-inherited-groq-key",
  LATEX_COMPILER_TOKEN: "test-inherited-compiler-token",
  OCR_SERVICE_TOKEN: "test-inherited-ocr-token",
  OBJECT_STORAGE_SECRET_KEY: "test-inherited-storage-secret",
  BETTER_AUTH_URL: "https://unrelated.example.com",
  POSTGRES_DB: "unrelated-database",
  OBJECT_STORAGE_ACCESS_KEY: "unrelated-storage-key",
  DISABLE_SIGNUP: "true",
  RESEND_API_KEY: "test-inherited-email-key",
};

const invocationSchema = z.object({
  args: z.array(z.string()),
  env: z.record(z.string(), z.string()),
});

async function runCompose(
  action: string,
  environment: Record<string, string | undefined> = {},
  fileState: "valid" | "empty" | "missing" = "valid",
) {
  const directory = await mkdtemp(join(tmpdir(), "jaa-jenkins-"));
  const log = join(directory, "docker.jsonl");
  const credentialFile = join(directory, "credential files", "production.env");
  try {
    await mkdir(join(directory, "scripts"));
    await mkdir(join(directory, "credential files"));
    if (fileState !== "missing") {
      await writeFile(
        credentialFile,
        fileState === "empty"
          ? ""
          : "POSTGRES_PASSWORD='test-file-secret-$literal'\n",
        { mode: 0o600 },
      );
    }
    await copyFile(
      new URL("./jenkins-compose.sh", import.meta.url),
      join(directory, "scripts", "jenkins-compose.sh"),
    );
    await writeFile(
      join(directory, "docker"),
      `#!${process.execPath}
const { appendFileSync } = require("node:fs");
const args = process.argv.slice(2);
appendFileSync(process.env.PROBE_LOG, JSON.stringify({ args, env: process.env }) + "\\n");
if (args.includes(process.env.PROBE_FAILURE)) {
  process.stderr.write("dotenv parser error: test-file-secret-$literal\\n");
  process.exit(17);
}
`,
      { mode: 0o700 },
    );
    const result = spawnSync(
      "sh",
      [join(directory, "scripts", "jenkins-compose.sh"), action],
      {
        encoding: "utf8",
        env: {
          NODE_ENV: "test",
          PATH: `${directory}:${process.env.PATH ?? "/usr/bin:/bin"}`,
          PROBE_LOG: log,
          JAA_ENV_FILE: credentialFile,
          ...environment,
        },
      },
    );
    if (result.error) throw result.error;
    const invocations = (await readFile(log, "utf8").catch(() => ""))
      .split("\n")
      .filter(Boolean)
      .map((line) => invocationSchema.parse(JSON.parse(line) as unknown));
    for (const invocation of invocations) {
      expect(invocation.args.slice(0, 7)).toEqual([
        "compose",
        "--project-name",
        "job-application-assistant",
        "--file",
        "docker-compose.yml",
        "--env-file",
        action === "deploy" ? credentialFile : "/dev/null",
      ]);
    }
    return {
      ...result,
      invocations,
      commands: invocations.map(({ args }) => args.slice(7).join(" ")),
      fileContents:
        fileState === "missing"
          ? undefined
          : await readFile(credentialFile, "utf8"),
    };
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
}

test.each([
  ["validate-build", "config --quiet"],
  ["build", "build --pull"],
])(
  "%s uses synthetic credentials without reading a production file",
  async (action, command) => {
    const result = await runCompose(action, inheritedSettings, "missing");
    expect(result.status).toBe(0);
    expect(result.commands).toEqual([command]);
    const environment = result.invocations[0]?.env;
    expect(environment?.POSTGRES_PASSWORD).toMatch(/^build-only/);
    expect(environment?.BETTER_AUTH_SECRET).toMatch(/^build-only/);
    expect(environment?.GROQ_API_KEY).toBe("build-only");
    expect(environment?.LATEX_COMPILER_TOKEN).toMatch(/^build-only/);
    expect(environment?.OCR_SERVICE_TOKEN).toMatch(/^build-only/);
    expect(environment?.OBJECT_STORAGE_SECRET_KEY).toMatch(/^build-only/);
    expect(environment?.BETTER_AUTH_URL).toBe("http://localhost:3000");
    expect(environment?.RESEND_API_KEY).toBe("");
  },
);

test("unknown operations cannot start services", async () => {
  const result = await runCompose("up");
  expect(result.status).toBe(2);
  expect(result.commands).toEqual([]);
});

test("an absent credential binding stops before any Docker command", async () => {
  const result = await runCompose("deploy", { JAA_ENV_FILE: undefined });
  expect(result.status).not.toBe(0);
  expect(result.commands).toEqual([]);
});

test.each(["empty", "missing"] as const)(
  "a %s credential file stops before any Docker command",
  async (fileState) => {
    const result = await runCompose("deploy", {}, fileState);
    expect(result.status).not.toBe(0);
    expect(result.commands).toEqual([]);
  },
);

test("a parser error stops before downtime without printing the secret line", async () => {
  const result = await runCompose("deploy", { PROBE_FAILURE: "config" });
  expect(result.status).toBe(1);
  expect(result.commands).toEqual(["config --quiet"]);
  expect(result.stderr).toContain("Production Compose validation failed");
  expect(result.stdout + result.stderr).not.toContain("test-file-secret");
});

test("deployment uses the temporary file unchanged and prevents inherited settings overriding it", async () => {
  const result = await runCompose("deploy", {
    ...inheritedSettings,
    COMPOSE_PROJECT_NAME: "unrelated-project",
  });
  expect(result.status).toBe(0);
  expect(result.commands).toEqual([
    "config --quiet",
    "stop app worker",
    "run --rm migrate",
    "up --detach --no-build --wait --wait-timeout 300 --remove-orphans",
    "ps",
  ]);
  for (const { env } of result.invocations) {
    for (const key of Object.keys(inheritedSettings)) {
      expect(env[key]).toBeUndefined();
    }
  }
  expect(result.fileContents).toBe(
    "POSTGRES_PASSWORD='test-file-secret-$literal'\n",
  );
  expect(result.stdout + result.stderr).not.toContain("test-file-secret");
});

test("a migration failure restarts the previous app and worker and reports failure", async () => {
  const result = await runCompose("deploy", { PROBE_FAILURE: "run" });
  expect(result.status).toBe(1);
  expect(result.commands).toEqual([
    "config --quiet",
    "stop app worker",
    "run --rm migrate",
    "start app worker",
    "ps --all",
  ]);
});

test("a health failure reports state without dumping application logs", async () => {
  const result = await runCompose("deploy", { PROBE_FAILURE: "up" });
  expect(result.status).toBe(17);
  expect(result.commands.at(-1)).toBe("ps --all");
  expect(result.commands.some((command) => command.startsWith("logs"))).toBe(
    false,
  );
});