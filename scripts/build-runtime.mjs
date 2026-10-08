import { build } from "esbuild";

// Resolve project aliases before externalizing packages needed at runtime.
await build({
  entryPoints: {
    migrate: "scripts/migrate.mts",
    "generation-worker": "scripts/generation-worker.mts",
    "latex-compiler": "services/latex-compiler/index.ts",
  },
  bundle: true,
  platform: "node",
  target: "node24",
  format: "esm",
  packages: "external",
  tsconfig: "tsconfig.json",
  outdir: "build",
  outExtension: { ".js": ".mjs" },
});
