import { randomBytes } from "node:crypto";
import { cp, mkdir, readdir, readFile, rm, writeFile } from "node:fs/promises";
import { createServer } from "node:net";
import { resolve } from "node:path";
import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { Pool } from "pg";
import { build } from "esbuild";
import {
  PostgreSqlContainer,
  type StartedPostgreSqlContainer,
} from "@testcontainers/postgresql";
import {
  GenericContainer,
  Wait,
  type StartedTestContainer,
} from "testcontainers";
import {
  AI_STUB_URL,
  BASE_URL,
  BUILD_DIRECTORY,
  CLOSED_SIGNUP_URL,
  LOG_DIRECTORY,
  runtimeEnvironment,
  type Runtime,
} from "./support/runtime";
import {
  runProcess,
  startProcess,
  waitForHealth,
  type ManagedProcess,
} from "./support/process";

async function checkPortFree(url: string) {
  const { hostname, port } = new URL(url);
  const server = createServer();
  await new Promise<void>((resolvePort, reject) => {
    server.once("error", reject);
    server.listen(Number(port), hostname, () =>
      server.close((error) => (error ? reject(error) : resolvePort())),
    );
  });
}

// The storage image the Compose stack runs, so the browser tests exercise the
// same server and version that is deployed.
async function storageImage() {
  const compose = await readFile("docker-compose.yml", "utf8");
  const image = /^\s*image:\s*(chrislusf\/seaweedfs:\S+)\s*$/m.exec(
    compose,
  )?.[1];
  if (!image)
    throw new Error("docker-compose.yml does not name the SeaweedFS image.");
  return image;
}

export default async function globalSetup() {
  await checkPortFree(BASE_URL);
  // The test worker starts the fake AI provider here.
  await checkPortFree(AI_STUB_URL);
  // Tests that need registration closed start this app themselves.
  await checkPortFree(CLOSED_SIGNUP_URL);
  await rm(LOG_DIRECTORY, { recursive: true, force: true });
  await mkdir(LOG_DIRECTORY, { recursive: true });
  await writeFile(
    `${LOG_DIRECTORY}/setup.log`,
    "Starting isolated E2E stack.\n",
  );
  let postgres: StartedPostgreSqlContainer | undefined;
  let compiler: StartedTestContainer | undefined;
  let storage: StartedTestContainer | undefined;
  let application: ManagedProcess | undefined;

  async function cleanup() {
    const failures: unknown[] = [];
    for (const action of [
      () => application?.stop(),
      async () => {
        for (const [name, container] of [
          ["compiler", compiler],
          ["storage", storage],
          ["postgres", postgres],
        ] as const) {
          if (container) {
            await runProcess(
              "docker",
              ["logs", container.getId()],
              process.env,
              `${LOG_DIRECTORY}/${name}.log`,
              10_000,
            );
          }
        }
      },
      () => compiler?.stop(),
      () => storage?.stop(),
      () => postgres?.stop(),
    ]) {
      try {
        await action();
      } catch (error) {
        failures.push(error);
      }
    }
    if (failures.length)
      throw new AggregateError(
        failures,
        "Could not fully clean up the E2E stack.",
      );
  }

  try {
    postgres = await new PostgreSqlContainer("postgres:18-bookworm")
      .withDatabase("job_assistant_e2e_test")
      .withUsername("e2e")
      .withPassword("e2e-only-password")
      .start();
    const image =
      process.env.E2E_LATEX_IMAGE ?? "job-assistant-e2e-latex:local";
    if (!process.env.E2E_LATEX_IMAGE) {
      await runProcess(
        "docker",
        ["build", "-f", "services/latex-compiler/Dockerfile", "-t", image, "."],
        process.env,
        `${LOG_DIRECTORY}/compiler-build.log`,
      );
    }
    const token = randomBytes(32).toString("hex");
    compiler = await new GenericContainer(image)
      .withEnvironment({ LATEX_COMPILER_TOKEN: token })
      .withExposedPorts(8080)
      .withTmpFs({ "/tmp": "rw,noexec,nosuid,size=128m" })
      .withWaitStrategy(Wait.forHttp("/health", 8080))
      .withStartupTimeout(90_000)
      .start();
    const storageAccessKey = "e2e-only-storage-key";
    const storageSecretKey = randomBytes(32).toString("hex");
    storage = await new GenericContainer(await storageImage())
      .withCommand([
        "mini",
        "-dir=/data",
        "-webdav=false",
        "-admin.ui=false",
        "-s3.port.iceberg=0",
        "-s3.port.lance=0",
      ])
      .withEnvironment({
        AWS_ACCESS_KEY_ID: storageAccessKey,
        AWS_SECRET_ACCESS_KEY: storageSecretKey,
        S3_BUCKET: "job-assistant",
      })
      .withExposedPorts(8333)
      .withWaitStrategy(Wait.forHttp("/healthz", 8333))
      .withStartupTimeout(90_000)
      .start();
    const runtime: Runtime = {
      databaseUrl: postgres.getConnectionUri(),
      compilerUrl: `http://${compiler.getHost()}:${compiler.getMappedPort(8080)}`,
      compilerContainerId: compiler.getId(),
      compilerToken: token,
      storageUrl: `http://${storage.getHost()}:${storage.getMappedPort(8333)}`,
      storageContainerId: storage.getId(),
      storageAccessKey,
      storageSecretKey,
    };
    process.env.E2E_RUNTIME = JSON.stringify(runtime);
    const environment = runtimeEnvironment(runtime);
    const pool = new Pool({ connectionString: runtime.databaseUrl });
    try {
      await migrate(drizzle(pool), { migrationsFolder: "./migrations" });
    } finally {
      await pool.end();
    }
    console.log("E2E containers ready; building the production application.");
    await runProcess(
      "pnpm",
      ["run", "build"],
      environment,
      `${LOG_DIRECTORY}/build.log`,
    );
    // Next copies the developer's .env into the standalone output, where the
    // server would load keys this harness leaves unset, such as OCR.
    for (const file of await readdir(`${BUILD_DIRECTORY}/standalone`)) {
      if (file.startsWith(".env"))
        await rm(`${BUILD_DIRECTORY}/standalone/${file}`);
    }
    await cp("public", `${BUILD_DIRECTORY}/standalone/public`, {
      recursive: true,
    });
    await cp(
      `${BUILD_DIRECTORY}/static`,
      `${BUILD_DIRECTORY}/standalone/${BUILD_DIRECTORY}/static`,
      { recursive: true },
    );
    await runProcess(
      "pnpm",
      ["run", "build:runtime"],
      environment,
      `${LOG_DIRECTORY}/build.log`,
    );
    await build({
      entryPoints: ["tests/e2e/support/block-external-fetch.ts"],
      bundle: true,
      platform: "node",
      target: "node24",
      format: "esm",
      outfile: `${BUILD_DIRECTORY}/block-external-fetch.mjs`,
    });
    application = await startProcess(
      process.execPath,
      [
        "--import",
        resolve(`${BUILD_DIRECTORY}/block-external-fetch.mjs`),
        `${BUILD_DIRECTORY}/standalone/server.js`,
      ],
      environment,
      `${LOG_DIRECTORY}/application.log`,
    );
    await waitForHealth(`${BASE_URL}/api/health`, application);
    console.log(`E2E application ready at ${BASE_URL}.`);
    return cleanup;
  } catch (error) {
    await writeFile(
      `${LOG_DIRECTORY}/setup.log`,
      `${error instanceof Error ? (error.stack ?? error.message) : String(error)}\n`,
      { flag: "a" },
    );
    await cleanup().catch((cleanupError: unknown) =>
      console.error(cleanupError),
    );
    throw error;
  }
}
