// Compose supplies individual PostgreSQL fields so passwords are URL-encoded safely.
if (process.env.PGHOST) {
  const url = new URL(`postgresql://${process.env.PGHOST}:5432`);
  url.username = encodeURIComponent(process.env.PGUSER ?? "job_assistant");
  url.password = encodeURIComponent(process.env.PGPASSWORD ?? "");
  url.pathname = `/${encodeURIComponent(process.env.PGDATABASE ?? "job_assistant")}`;
  process.env.DATABASE_URL = url.toString();
}
const target = process.argv[2];
if (!["server.js", "migrate.mjs", "generation-worker.mjs"].includes(target)) {
  throw new Error("Unknown container entrypoint.");
}
await import(`../${target}`);
