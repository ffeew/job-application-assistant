import "dotenv/config";
import { writeFile } from "node:fs/promises";
import { setTimeout as delay } from "node:timers/promises";
import { pool } from "../src/lib/db/db";
import { logger } from "../src/lib/logger";
import {
  claimGenerationJob,
  cleanupGenerationJobs,
  recoverGenerationJobs,
} from "../src/app/api/resume-generation/jobs/service";
import { runGenerationJob } from "../src/app/api/resume-generation/jobs/worker";

const state = { stopping: false };
let nextCleanup = 0;
process.on("SIGTERM", () => {
  state.stopping = true;
});
process.on("SIGINT", () => {
  state.stopping = true;
});
const heartbeat = () =>
  writeFile("/tmp/generation-worker-heartbeat", String(Date.now()));

try {
  logger.info("Resume generation worker started");
  while (!state.stopping) {
    try {
      await heartbeat();
      await recoverGenerationJobs();
      if (Date.now() >= nextCleanup) {
        await cleanupGenerationJobs();
        nextCleanup = Date.now() + 60 * 60 * 1000;
      }
      const job = await claimGenerationJob();
      if (job) {
        logger.info({ jobId: job.id }, "Processing generation job");
        await runGenerationJob(job, undefined, heartbeat);
        logger.info({ jobId: job.id }, "Finished processing generation job");
      } else {
        await delay(2000);
      }
    } catch (error) {
      logger.error(
        { err: error },
        "Generation worker iteration failed; retrying",
      );
      await delay(2000);
    }
  }
} finally {
  await pool.end();
}
