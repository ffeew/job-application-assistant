import { expect, test } from "bun:test";
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
    const output = Bun.spawnSync(
      [
        process.execPath,
        join(directory, "scripts", "entrypoint.mjs"),
        "migrate.mjs",
      ],
      {
        stdout: "pipe",
        stderr: "pipe",
        env: {
          PATH: process.env.PATH,
          PGHOST: "db",
          PGUSER: username,
          PGPASSWORD: password,
          PGDATABASE: "example_test",
        },
      },
    );
    expect(output.exitCode).toBe(0);
    const url = new URL(new TextDecoder().decode(output.stdout).trim());
    expect(url.hostname).toBe("db");
    expect(decodeURIComponent(url.username)).toBe(username);
    expect(decodeURIComponent(url.password)).toBe(password);
    expect(url.pathname).toBe("/example_test");
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});
