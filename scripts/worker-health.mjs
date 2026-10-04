import { readFile } from "node:fs/promises";
try {
  const timestamp = Number(
    await readFile("/tmp/generation-worker-heartbeat", "utf8"),
  );
  process.exit(Date.now() - timestamp < 90000 ? 0 : 1);
} catch {
  process.exit(1);
}
