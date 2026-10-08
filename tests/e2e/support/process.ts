import { spawn } from "node:child_process";
import { once } from "node:events";
import { mkdir, open } from "node:fs/promises";
import { dirname } from "node:path";
import { setTimeout as delay } from "node:timers/promises";

export async function startProcess(
  command: string,
  args: string[],
  env: Record<string, string | undefined>,
  logPath: string,
) {
  await mkdir(dirname(logPath), { recursive: true });
  const log = await open(logPath, "a");
  const child = spawn(command, args, {
    // Bun augments ProcessEnv with bundler booleans; child env values are strings.
    env: env as unknown as NodeJS.ProcessEnv,
    detached: process.platform !== "win32",
    stdio: ["ignore", log.fd, log.fd],
  });
  const finished = new Promise<void>((resolve) => {
    child.once("exit", () => resolve());
    child.once("error", () => resolve());
  });
  try {
    await once(child, "spawn");
  } finally {
    await log.close();
  }

  function signal(value: NodeJS.Signals) {
    if (child.exitCode !== null || child.signalCode !== null) return;
    if (child.pid && process.platform !== "win32") {
      try {
        process.kill(-child.pid, value);
      } catch (error) {
        if (!(
          error instanceof Error &&
          "code" in error &&
          error.code === "ESRCH"
        ))
          throw error;
      }
    } else child.kill(value);
  }

  return {
    child,
    async wait() {
      await finished;
      if (child.exitCode !== 0) {
        throw new Error(
          `${command} failed (${child.exitCode ?? child.signalCode ?? "unknown"}). See ${logPath}.`,
        );
      }
    },
    async stop() {
      signal("SIGTERM");
      const timer = setTimeout(() => signal("SIGKILL"), 10_000);
      try {
        await finished;
      } finally {
        clearTimeout(timer);
      }
    },
  };
}

export type ManagedProcess = Awaited<ReturnType<typeof startProcess>>;

export async function runProcess(
  command: string,
  args: string[],
  env: Record<string, string | undefined>,
  logPath: string,
  timeout = 15 * 60_000,
) {
  const managed = await startProcess(command, args, env, logPath);
  const state = { timedOut: false };
  const timer = setTimeout(() => {
    state.timedOut = true;
    void managed
      .stop()
      .catch((error: unknown) =>
        console.error("Could not stop timed-out process:", error),
      );
  }, timeout);
  try {
    await managed.wait();
    if (state.timedOut) throw new Error(`${command} timed out. See ${logPath}.`);
  } finally {
    clearTimeout(timer);
    await managed.stop();
  }
}

export async function waitForHealth(url: string, managed: ManagedProcess) {
  const deadline = Date.now() + 90_000;
  while (Date.now() < deadline) {
    if (managed.child.exitCode !== null || managed.child.signalCode !== null) {
      await managed.wait();
      throw new Error(`Server stopped before ${url} became healthy.`);
    }
    try {
      const response = await fetch(url, { signal: AbortSignal.timeout(2000) });
      if (response.ok) return;
    } catch {
      // A new server can refuse connections until its listener is ready.
    }
    await delay(200);
  }
  throw new Error(`Timed out waiting for ${url}.`);
}
