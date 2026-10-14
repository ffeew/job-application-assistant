import { runAsyncAction } from "@/lib/async-action";
import { logger } from "@/lib/logger";
import { generationJobPayloadSchema } from "./validators";
import {
  completeGenerationJob,
  failGenerationJob,
  generateJobResult,
  heartbeatGenerationJob,
  type ClaimedGenerationJob,
} from "./service";

export async function runGenerationJob(
  job: ClaimedGenerationJob,
  generate = generateJobResult,
  onHeartbeat?: () => Promise<void>,
) {
  const controller = new AbortController();
  const heartbeat = setInterval(() => {
    runAsyncAction(
      (async () => {
        if (!(await heartbeatGenerationJob(job))) controller.abort();
        await onHeartbeat?.();
      })(),
      () => controller.abort(),
    );
  }, 30000);
  try {
    const payload = generationJobPayloadSchema.parse(job.payload);
    const result = await generate(job.userId, payload, controller.signal);
    await completeGenerationJob(job, result);
  } catch (error) {
    // The stored job keeps only a user-facing message, so the cause is logged here.
    logger.error({ err: error, jobId: job.id }, "Generation job failed");
    await failGenerationJob(job, error);
  } finally {
    clearInterval(heartbeat);
  }
}
