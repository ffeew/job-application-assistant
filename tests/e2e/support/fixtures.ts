import { createHash, randomUUID } from "node:crypto";
import { execFile, spawnSync } from "node:child_process";
import { readFile } from "node:fs/promises";
import { promisify } from "node:util";
import { resolve } from "node:path";
import { setTimeout as delay } from "node:timers/promises";
import {
  test as base,
  expect,
  type APIRequestContext,
  type Download,
} from "@playwright/test";
import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { z } from "zod";
import * as schema from "../../../src/lib/db/schema";
import {
  BASE_URL,
  BUILD_DIRECTORY,
  CLOSED_SIGNUP_URL,
  LOG_DIRECTORY,
  getRuntime,
  runtimeEnvironment,
} from "./runtime";
import { startProcess, waitForHealth, type ManagedProcess } from "./process";
import { startFakeAI, type FakeAI } from "./fake-ai";

const execute = promisify(execFile);
const signupSchema = z.object({ user: z.object({ id: z.string().min(1) }) });
const PASSWORD = "E2E-only-password-1234";
const PROFILE_EMAIL = "alex@example.test";

export type Database = ReturnType<typeof drizzle<typeof schema>>;
type Service = "storage" | "compiler";
export interface Candidate {
  id: string;
  email: string;
  password: string;
  applicationId: string;
  storageState: Awaited<ReturnType<APIRequestContext["storageState"]>>;
}

interface Fixtures {
  authenticated: boolean;
  createCandidate: () => Promise<Candidate>;
  candidate: Candidate;
  worker: { start: () => Promise<void> };
  inspectPDF: (
    download: Download,
  ) => Promise<{ bytes: Buffer; text: string; pageCount: number }>;
  ai: FakeAI;
  outage: { pause: (service: Service) => Promise<void> };
}

interface WorkerFixtures {
  database: Database;
  fakeAI: FakeAI;
  containerGuard: undefined;
  closedSignUpURL: string;
}

function services() {
  const runtime = getRuntime();
  return {
    storage: {
      id: runtime.storageContainerId,
      health: `${runtime.storageUrl}/healthz`,
    },
    compiler: {
      id: runtime.compilerContainerId,
      health: `${runtime.compilerUrl}/health`,
    },
  };
}

async function unpause(service: Service) {
  const { id, health } = services()[service];
  const state = await execute("docker", [
    "inspect",
    "--format",
    "{{.State.Paused}}",
    id,
  ]);
  if (state.stdout.trim() !== "true") return;
  await execute("docker", ["unpause", id]);
  const deadline = Date.now() + 30_000;
  for (;;) {
    try {
      const response = await fetch(health, {
        signal: AbortSignal.timeout(2_000),
      });
      if (response.ok) return;
    } catch {
      // The service can refuse connections for a moment after unpausing.
    }
    if (Date.now() > deadline)
      throw new Error(`The ${service} container did not recover.`);
    await delay(200);
  }
}

export const test = base.extend<Fixtures, WorkerFixtures>({
  authenticated: [true, { option: true }],
  extraHTTPHeaders: async ({ browserName }, provide, testInfo) => {
    const digest = createHash("sha256")
      .update(`${browserName}:${testInfo.testId}:${testInfo.retry}`)
      .digest();
    // Separate synthetic clients keep production BetterAuth rate limits intact.
    await provide({
      "x-forwarded-for": `198.18.${digest[0] ?? 0}.${digest[1] ?? 1}`,
    });
  },
  database: [
    async ({ browserName }, provide) => {
      // Importing app db.ts here would capture development credentials from .env.
      const pool = new Pool({
        connectionString: getRuntime().databaseUrl,
        application_name: `e2e-${browserName}`,
      });
      pool.on("error", (error) =>
        console.error("E2E database connection failed:", error),
      );
      try {
        await provide(drizzle({ client: pool, schema }));
      } finally {
        await pool.end();
      }
    },
    { scope: "worker" },
  ],
  fakeAI: [
    // eslint-disable-next-line no-empty-pattern -- Playwright reads fixture dependencies from this pattern, and this fixture has none.
    async ({}, provide) => {
      const server = await startFakeAI();
      try {
        await provide(server.fake);
      } finally {
        await server.close();
      }
    },
    { scope: "worker", auto: true },
  ],
  containerGuard: [
    // eslint-disable-next-line no-empty-pattern -- Playwright reads fixture dependencies from this pattern, and this fixture has none.
    async ({}, provide) => {
      // A worker that died mid-outage cannot unpause; its successor does.
      await unpause("storage");
      await unpause("compiler");
      await provide(undefined);
      await unpause("storage");
      await unpause("compiler");
    },
    { scope: "worker", auto: true },
  ],
  ai: [
    async ({ fakeAI }, provide, testInfo) => {
      fakeAI.reset();
      await provide(fakeAI);
      // Unused replies matter only when the test otherwise passed; after a
      // failure they are a consequence, not a cause.
      const problems = fakeAI.problems();
      if (testInfo.status === "passed" && problems.length)
        throw new Error(problems.join("\n"));
    },
    { auto: true },
  ],
  // eslint-disable-next-line no-empty-pattern -- Playwright reads fixture dependencies from this pattern, and this fixture has none.
  outage: async ({}, provide) => {
    const paused = new Set<Service>();
    try {
      await provide({
        async pause(service) {
          paused.add(service);
          await execute("docker", ["pause", services()[service].id]);
        },
      });
    } finally {
      // Fixture teardown still runs after a test timeout; a finally block in
      // the test body might not.
      for (const service of paused) await unpause(service);
    }
  },
  closedSignUpURL: [
    // eslint-disable-next-line no-empty-pattern -- Playwright reads fixture dependencies from this pattern, and this fixture has none.
    async ({}, provide) => {
      const application = await startProcess(
        process.execPath,
        [
          "--import",
          resolve(`${BUILD_DIRECTORY}/block-external-fetch.mjs`),
          `${BUILD_DIRECTORY}/standalone/server.js`,
        ],
        {
          ...runtimeEnvironment(getRuntime()),
          DISABLE_SIGNUP: "true",
          // Keeps the sign-in redirect and Better Auth's trusted origin on this app.
          BETTER_AUTH_URL: CLOSED_SIGNUP_URL,
          PORT: new URL(CLOSED_SIGNUP_URL).port,
        },
        `${LOG_DIRECTORY}/application-closed-sign-up.log`,
      );
      try {
        await waitForHealth(`${CLOSED_SIGNUP_URL}/api/health`, application);
        await provide(CLOSED_SIGNUP_URL);
      } finally {
        await application.stop();
      }
    },
    // Above waitForHealth's 90 s and stop's 10 s, so a slow start still
    // reaches finally instead of leaving the detached server running.
    { scope: "worker", timeout: 120_000 },
  ],
  createCandidate: async (
    { playwright, database, extraHTTPHeaders },
    provide,
  ) => {
    const accounts: string[] = [];
    try {
      await provide(async () => {
        const email = `candidate-${randomUUID()}@example.test`;
        const request = await playwright.request.newContext({
          baseURL: BASE_URL,
          extraHTTPHeaders,
        });
        try {
          const response = await request.post("/api/auth/sign-up/email", {
            headers: { Origin: BASE_URL },
            data: { name: "Alex Example", email, password: PASSWORD },
          });
          expect(
            response.status(),
            "Fixture signup should establish a real BetterAuth session",
          ).toBe(200);
          const raw: unknown = await response.json();
          const { user } = signupSchema.parse(raw);
          accounts.push(user.id);
          await database.insert(schema.userProfiles).values({
            userId: user.id,
            firstName: "Alex",
            lastName: "Example",
            email: PROFILE_EMAIL,
            city: "Singapore",
            professionalSummary:
              "Software engineer building reliable applications.",
          });
          await database.insert(schema.workExperiences).values({
            userId: user.id,
            jobTitle: "Software Engineer",
            company: "Example Co",
            startDate: "2024-01",
            isCurrent: true,
            technologies: "TypeScript",
            description:
              "Built reliable application workflows.\nReduced processing time by 20%.",
          });
          await database.insert(schema.education).values({
            userId: user.id,
            degree: "BSc Computer Science",
            institution: "Example University",
            startDate: "2020-01",
            endDate: "2023-12",
          });
          await database.insert(schema.skills).values({
            userId: user.id,
            name: "TypeScript",
            category: "technical",
          });
          const [application] = await database
            .insert(schema.jobApplications)
            .values({
              userId: user.id,
              company: "Example Industries",
              position: "Software Engineer",
              jobDescription:
                "Build reliable web applications using TypeScript.",
              status: "applied",
            })
            .returning();
          if (!application)
            throw new Error("Could not seed the fixture application.");
          return {
            id: user.id,
            email,
            password: PASSWORD,
            applicationId: application.id,
            storageState: await request.storageState(),
          };
        } finally {
          await request.dispose();
        }
      });
    } finally {
      for (const id of accounts)
        await database.delete(schema.user).where(eq(schema.user.id, id));
    }
  },
  candidate: async ({ createCandidate }, provide) => {
    await provide(await createCandidate());
  },
  storageState: async ({ candidate, authenticated }, provide) => {
    await provide(
      authenticated ? candidate.storageState : { cookies: [], origins: [] },
    );
  },
  worker: async ({ candidate }, provide, testInfo) => {
    let managed: ManagedProcess | undefined;
    const logPath = testInfo.outputPath("worker.log");
    try {
      await provide({
        async start() {
          if (managed)
            throw new Error("The generation worker is already running.");
          managed = await startProcess(
            process.execPath,
            [
              "--import",
              resolve(`${BUILD_DIRECTORY}/block-external-fetch.mjs`),
              "build/generation-worker.mjs",
            ],
            runtimeEnvironment(getRuntime()),
            logPath,
          );
        },
      });
    } finally {
      // The candidate dependency guarantees shutdown before cascading fixture deletion.
      await managed?.stop();
      if (managed)
        await testInfo.attach(`worker-${candidate.id}`, {
          path: logPath,
          contentType: "text/plain",
        });
    }
  },
  inspectPDF: async ({ candidate }, provide, testInfo) => {
    await provide(async (download) => {
      expect(await download.failure()).toBeNull();
      const path = testInfo.outputPath(`${randomUUID()}.pdf`);
      await download.saveAs(path);
      await testInfo.attach(`pdf-${candidate.id}`, {
        path,
        contentType: "application/pdf",
      });
      const bytes = await readFile(path);
      expect(bytes.subarray(0, 5).toString()).toBe("%PDF-");
      const container = getRuntime().compilerContainerId;
      const remotePath = `/tmp/e2e-${randomUUID()}.pdf`;
      // Docker archive copying cannot reliably address a mounted tmpfs. Stream
      // into the running container instead, without a shell or PDF in arguments.
      const copied = spawnSync(
        "docker",
        ["exec", "--user", "0", "-i", container, "tee", remotePath],
        { input: bytes, stdio: ["pipe", "ignore", "pipe"], timeout: 10_000 },
      );
      if (copied.error) throw copied.error;
      if (copied.status !== 0)
        throw new Error(
          "Could not stream the downloaded PDF into the compiler container.",
        );
      try {
        const info = await execute("docker", [
          "exec",
          "--user",
          "0",
          container,
          "pdfinfo",
          remotePath,
        ]);
        const text = await execute("docker", [
          "exec",
          "--user",
          "0",
          container,
          "pdftotext",
          remotePath,
          "-",
        ]);
        const pageCount = Number(info.stdout.match(/^Pages:\s+(\d+)/m)?.[1]);
        expect(pageCount).toBe(1);
        expect(text.stdout).toContain("Alex Example");
        expect(text.stdout).toContain("Example Co");
        expect(text.stdout).toContain("TypeScript");
        return { bytes, text: text.stdout, pageCount };
      } finally {
        await execute("docker", [
          "exec",
          "--user",
          "0",
          container,
          "rm",
          "-f",
          remotePath,
        ]);
      }
    });
  },
});

export { expect };
