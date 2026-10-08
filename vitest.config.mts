import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
  },
  test: {
    environment: "node",
    include: [
      "src/**/*.test.{ts,tsx}",
      "scripts/**/*.test.ts",
      "services/**/*.test.ts",
      "tests/integration/**/*.test.ts",
    ],
    restoreMocks: true,
    hookTimeout: 30_000,
  },
});
