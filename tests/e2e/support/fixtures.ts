import { createHash, randomUUID } from "node:crypto";
import { execFile, spawnSync } from "node:child_process";
import { readFile } from "node:fs/promises";
import { promisify } from "node:util";
import { resolve } from "node:path";
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
  getRuntime,
  runtimeEnvironment,
} from "./runtime";
import { startProcess, type ManagedProcess } from "./process";

const execute = promisify(execFile);
const signupSchema = z.object({ user: z.object({ id: z.string().min(1) }) });
const PASSWORD = "E2E-only-password-1234";
const PROFILE_EMAIL = "alex@example.test";

type Database = ReturnType<typeof drizzle<typeof schema>>;
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
}

interface WorkerFixtures {
  database: Database;
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
