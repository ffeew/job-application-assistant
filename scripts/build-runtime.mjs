import { build } from "esbuild";

// Bundle project aliases so Node can run the entrypoints while packages stay external.
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
