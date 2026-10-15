import { expect, test } from "vitest";
import { spawnSync } from "node:child_process";
import { copyFile, mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

test("container credentials round-trip reserved characters without changing the password", async () => {
  const directory = await mkdtemp(join(tmpdir(), "jaa-entrypoint-"));
  try {
    await mkdir(join(directory, "scripts"));
    await copyFile(
      new URL("./container-entrypoint.mjs", import.meta.url),
      join(directory, "scripts", "entrypoint.mjs"),
    );
    await writeFile(
      join(directory, "migrate.mjs"),
      "console.log(process.env.DATABASE_URL);",
    );
    const password = "p@ss/%40:#?";
    const username = "demo@%40";
    const output = spawnSync(
      process.execPath,
      [join(directory, "scripts", "entrypoint.mjs"), "migrate.mjs"],
      {
        encoding: "utf8",
        env: {
          NODE_ENV: "test",
          PATH: process.env.PATH,
          PGHOST: "db",
          PGUSER: username,
          PGPASSWORD: password,
          PGDATABASE: "example_test",
        },
      },
    );
    if (output.error) throw output.error;
    expect(output.status).toBe(0);
    const url = new URL(output.stdout.trim());
    expect(url.hostname).toBe("db");
    expect(decodeURIComponent(url.username)).toBe(username);
    expect(decodeURIComponent(url.password)).toBe(password);
    expect(url.pathname).toBe("/example_test");
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});
