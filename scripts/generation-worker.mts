import "dotenv/config";
import { writeFile } from "node:fs/promises";
import { setTimeout as delay } from "node:timers/promises";
import { pool } from "../src/lib/db/db";
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
  console.log("Resume generation worker started.");
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
        console.log(`Processing generation job ${job.id}.`);
        await runGenerationJob(job, undefined, heartbeat);
        console.log(`Finished processing generation job ${job.id}.`);
      } else {
        await delay(2000);
      }
    } catch {
      console.error("Generation worker could not access its queue; retrying.");
      await delay(2000);
    }
  }
} finally {
  await pool.end();
}
