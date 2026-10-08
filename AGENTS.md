# Repository Guidelines

## Stack & Architecture Snapshot

- **Framework**: Next.js 16 App Router with React 19.3, React Compiler, and TypeScript 6.
- **Data**: Drizzle ORM targeting PostgreSQL with node-postgres; migrations generated via Drizzle Kit.
- **Auth**: BetterAuth with proxy-backed dashboard session-cookie checks and API session validation (see `src/lib/auth.ts`, `src/proxy.ts`).
- **UI**: Tailwind CSS v4 + shadcn/ui primitives; Lucide icons; Sonner for notifications.
- **State**: Zustand for shared and workflow state; TanStack Query for server state.
- **Forms & Validation**: React Hook Form + Zod resolvers; shared schemas live with API validators.
- **React Compiler & Forms**: Use `useWatch` for reactive form subscriptions. Pass `{ keepFieldsRef: true }` to `reset` when populating mounted inputs so memoized registration props remain valid.
- **AI**: Vercel AI SDK 7 with Groq (`@ai-sdk/groq`) powering cover letters, resume tailoring, and conversation starters. Use `instructions` for system prompts. Default model is `qwen/qwen3.8-27b`; resume-fitting fallback is `openai/gpt-oss-120b`. Apply `getGroqGenerationOptions` to each request for Qwen's non-thinking mode and 16,384-token output limit.
- **Documents**: A separate authenticated pdfLaTeX service renders resume PDFs using templates in `src/lib/resume-templates/`. Generation checks the compiled PDF and may revise content up to three times to meet a one- or two-page target.

## Module Organization

- `src/app`
  - Feature folders (e.g., `dashboard/resumes`) colocate page entries with supporting UI components, TanStack Query `queries/` & `mutations/`, and Zustand `store/` directories when needed.
  - API routes live under `src/app/api/<feature>/` and follow a consistent pattern: `route.ts` for HTTP wiring, `service.ts` for business logic, `validators.ts` (or `validators.ts` in `profile/`) exporting Zod schemas used on client and server.
  - Authentication pages reside in `(auth)/`; dashboard routes are protected via `src/proxy.ts`.
- `src/components`: Shared presentation-only primitives (buttons, inputs, skeletons) built on shadcn/ui.
- `src/lib`: Cross-cutting utilities—environment guard (`env.ts`), Drizzle setup (`db/`), BetterAuth client, resume templates, helper utilities, and validator re-exports.
- `migrations/`: Generated SQL files—commit alongside schema adjustments.
- `public/`, `components.json`, config roots (`drizzle.config.ts`, `tsconfig.json`, etc.) hold assets and tool configuration.

## Development Commands

- Install deps: `pnpm install` (keep `pnpm-lock.yaml` checked in). pnpm is pinned in `package.json`.
- Local dev: `pnpm run dev` (Turbopack).
- Production build: `pnpm run build` (runs ESLint, then a Turbopack build with type checks).
- Serve production build: `pnpm run start`.
- Quality gates: `pnpm run lint`, `pnpm run typecheck` (must be clean before PR or task completion).
- Lint fixes: `pnpm run lint:fix`; focused tests: `pnpm run test`. CI runs all three quality gates.
- Type checking generates Next.js route types before running `tsc`; `next-env.d.ts` is generated and ignored.
- Runtime: Node.js 24; CI and Docker use frozen pnpm lockfile installation.
- Local Node.js version manager: fnm. Use `fnm install` and `fnm use` with the committed `.nvmrc`.
- Tests: Vitest on Node.js; import test APIs explicitly from `vitest`.
- Runtime bundles: `pnpm run build:runtime` uses esbuild to generate Node.js ESM entrypoints for Docker and browser tests.
- Database utilities: `pnpm run db:push`, `pnpm run db:generate`, `pnpm run db:studio`; use `pnpm run db:migrate` to apply committed PostgreSQL migrations.

## Quality Requirements

1. Run `pnpm run lint` and `pnpm run typecheck` after changes; fix all errors and obvious warnings.
2. Avoid disabling ESLint rules unless absolutely necessary—explain with comments if you must.
3. Prefer explicit types; **never** reach for `any`. Use `unknown`, generics, or schema-derived types.
4. Keep code paths defensive—handle API errors, loading states, and empty data gracefully.
5. When touching AI features, ensure clear fallbacks if model calls fail.
6. Lint uses TypeScript ESLint's strict type-aware preset, Next.js/React Compiler checks, TanStack Query, and JSX accessibility rules. Warnings fail the gate. TypeScript enables `noUncheckedIndexedAccess`; preserve defensive checks for missing array/dictionary entries.
7. Use `withAsyncHandler` for promise-returning React events and `runAsyncAction` for rejectable background work. Explicit `void` is appropriate for default TanStack Query invalidations/refetches, whose errors are handled by the library. Do not ignore promises that can reject without an error handler.
8. Treat JSON as `unknown` until Zod validation. Client hooks use `parseJsonResponse` and feature transport schemas with string timestamps; server/domain schemas keep `Date`. Use `readApiError` for text/PDF error responses.

## TypeScript & Coding Standards

- Lean on Zod schemas exported from `src/app/api/<feature>/validators` for runtime validation and type inference.
- Forms should use React Hook Form with `zodResolver` (see existing dashboard profile forms for patterns). After validation, cast `unknown` to schema-inferred types with a comment (`// Data validated by Zod`).
- Components in PascalCase, hooks in camelCase, server actions suffixed with `Action`.
- Follow Prettier defaults (2-space indent, semicolons, double quotes). Respect Tailwind naming; prefer `@/` alias imports.
- Keep data fetching in feature Query and mutation hooks rather than calling `fetch` directly in components; invalidate related caches on mutation success.
- Use flexbox with `gap` utilities instead of `space-*`, and skeleton components for loading states.

## Testing Guidance

- Current gates: `pnpm run lint`, `pnpm run typecheck`, `pnpm run test`, plus manual QA documented in PR descriptions.
- Add focused `*.test.ts(x)` files when introducing regressions-prone logic (e.g., data transforms in `src/lib`, resume tailoring flows, PDF generation helpers). Run with `pnpm test` if you add tests.
- Sanitize or mock any real candidate data in fixtures.

## AI Feature Notes

- All Groq interactions pull configuration from `env.GROQ_API_KEY` and `env.GROQ_MODEL`. Guard routes so they surface human-friendly errors when keys are missing.
- Keep prompts deterministic—low temperature (≈0.2–0.3) for resume content selection, slightly higher (≈0.6–0.7) for conversational outputs per existing services.
- Validate AI outputs against Zod schemas before using them; provide fallbacks to manual selection when parsing fails.

## Commit & PR Expectations

- Commit messages: short, present tense, <=72 chars (`Add conversation starter loader`).
- Bundle related changes; include generated migrations with the schema update that produced them.
- PR descriptions should call out context, solution, rollout/rollback considerations, manual QA, and screenshots/video for UI changes.
- Before review, confirm `pnpm run lint`, `pnpm run typecheck`, and any new tests all succeed.

## Self-hosted Deployment

- Compose runs PostgreSQL 18, a one-shot migrator, the standalone Next.js app, a generation worker, and the private LaTeX compiler. Only the app is exposed on host loopback for an existing Cloudflare tunnel.
- Resume generation uses PostgreSQL jobs, leased claims, two-second browser polling, and seven-day result retention. Run `pnpm run worker` alongside local development.
- Migration tooling validates only `DATABASE_URL`; app/worker validate their full runtime configuration. Never bake real secrets into container images.
- Integration tests require `RUN_DB_INTEGRATION=1` and a dedicated database ending in `_test`.

## Environment & Secrets

- Copy `.env.example` ➜ `.env` and populate all required BetterAuth, PostgreSQL, and AI keys (`BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`, `DATABASE_URL`, `POSTGRES_PASSWORD`, `GROQ_API_KEY`, `MISTRAL_API_KEY`, `LATEX_COMPILER_TOKEN`).
- Never commit secrets. Mention new env vars in PRs.
- `src/lib/env.ts` performs strict validation; missing/invalid values will fail fast on boot—verify locally before pushing.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
