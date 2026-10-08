# Repository Guidelines

## Stack & Architecture Snapshot

- **Framework**: Next.js 16 App Router with React 19.3, React Compiler, and TypeScript 6.
- **Data**: Drizzle ORM targeting PostgreSQL with node-postgres; migrations generated via Drizzle Kit.
- **Auth**: BetterAuth with proxy-backed dashboard session-cookie checks and API session validation (see `src/lib/auth.ts`, `src/proxy.ts`).
- **UI**: Tailwind CSS v4 + shadcn/ui primitives; Lucide icons; Sonner for notifications.
- **State**: Zustand for shared and workflow state; TanStack Query for server state.
- **Forms & Validation**: React Hook Form + Zod resolvers; shared schemas live with API validators.
- **React Compiler & Forms**: Use `useWatch` for reactive form subscriptions. Pass `{ keepFieldsRef: true }` to `reset` when populating mounted inputs so memoized registration props remain valid.
- **AI**: Vercel AI SDK 7 with Groq (`@ai-sdk/groq`) for text generation and Mistral for resume OCR. Use `instructions` for system prompts and `getGroqGenerationOptions` for the configured model's provider options and output budget. See [configuration](README.md#configuration) for model defaults.
- **Documents**: A separate authenticated pdfLaTeX service renders resume PDFs using templates in `src/lib/resume-templates/`. Generation checks the compiled PDF and may revise content up to three times to meet a one- or two-page target.

## Module Organization

- `src/app`
  - Feature folders (e.g., `dashboard/resumes`) colocate page entries with supporting UI components, TanStack Query `queries/` & `mutations/`, and Zustand `store/` directories when needed.
  - API routes live under `src/app/api/<feature>/`: `route.ts` handles HTTP, services hold business logic, and `validators.ts` exports Zod schemas shared by client and server. Resume-generation request schemas also live in `api/profile/validators.ts`.
  - Authentication pages reside in `(auth)/`; dashboard routes are protected via `src/proxy.ts`.
- `src/components`: Shared presentation-only primitives (buttons, inputs, skeletons) built on shadcn/ui.
- `src/lib`: Environment validation, Drizzle setup, BetterAuth server configuration, resume templates, utilities, and validator re-exports. The BetterAuth browser client is in `src/app/utils/authClient.ts`.
- `scripts/`: Migration, generation-worker, runtime-bundling, and container entrypoints.
- `services/latex-compiler/`: Authenticated PDF compiler and its container image.
- `tests/`: PostgreSQL integration tests and the Playwright browser harness; focused unit tests are colocated with their modules.
- `migrations/`: Generated SQL files—commit alongside schema adjustments.
- `public/`, `components.json`, config roots (`drizzle.config.ts`, `tsconfig.json`, etc.) hold assets and tool configuration.

## Development

Use Node.js 24 and the pnpm version pinned in `package.json`; keep `pnpm-lock.yaml` checked in. Follow the [local quickstart](README.md#local-setup), [script reference](README.md#commands), and [testing guide](docs/testing.md). Run the generation worker alongside the development server when testing resume generation.

For schema changes, generate and commit SQL with `pnpm run db:generate`, then apply committed migrations with `pnpm run db:migrate`. Reserve `db:push` for disposable local experiments.

## Quality Requirements

1. Run `pnpm run lint`, `pnpm run typecheck`, and `pnpm run test` after changes; fix all errors and warnings. Type checking generates Next.js route types before running `tsc`.
2. Avoid disabling ESLint rules unless absolutely necessary—explain with comments if you must.
3. Prefer explicit types; **never** reach for `any`. Use `unknown`, generics, or schema-derived types.
4. Keep code paths defensive—handle API errors, loading states, and empty data gracefully.
5. When touching AI features, ensure clear fallbacks if model calls fail.
6. Lint uses TypeScript ESLint's strict type-aware preset, Next.js/React Compiler checks, TanStack Query, and JSX accessibility rules. Warnings fail the gate. TypeScript enables `noUncheckedIndexedAccess`; preserve defensive checks for missing array/dictionary entries.
7. Use `withAsyncHandler` for promise-returning React events and `runAsyncAction` for rejectable background work. Explicit `void` is appropriate for default TanStack Query invalidations/refetches, whose errors are handled by the library. Do not ignore promises that can reject without an error handler.
8. Treat JSON as `unknown` until Zod validation. Client hooks use `parseJsonResponse` and feature transport schemas with string timestamps; server/domain schemas keep `Date`. Use `readApiError` for text/PDF error responses.

## TypeScript & Coding Standards

- Lean on Zod schemas exported from `src/app/api/<feature>/validators` for runtime validation and type inference.
- Forms should use React Hook Form with `zodResolver` (see existing dashboard profile forms for patterns). When a validated form value needs a type assertion, explain why the resolver makes the assertion safe.
- Components in PascalCase, hooks in camelCase, server actions suffixed with `Action`.
- Follow Prettier defaults (2-space indent, semicolons, double quotes). Respect Tailwind naming; prefer `@/` alias imports.
- Keep data fetching in feature Query and mutation hooks rather than calling `fetch` directly in components; invalidate related caches on mutation success.
- Use flexbox with `gap` utilities instead of `space-*`, and skeleton components for loading states.
- Keep comments that explain reasons, constraints, tradeoffs, compatibility, or non-obvious invariants. Remove comments that repeat names, narrate operations, or label obvious sections. Preserve tool directives, required annotations, and license notices.

## Testing Guidance

- Use the [testing guide](docs/testing.md) for suite commands, isolation requirements, and CI behavior. Import test APIs explicitly from `vitest`.
- Add focused `*.test.ts(x)` files when introducing regression-prone logic, such as data transforms, resume tailoring, or PDF generation helpers.
- Sanitize or mock any real candidate data in fixtures.

## AI Feature Notes

- Groq interactions use `env.GROQ_API_KEY` and `env.GROQ_MODEL`; resume fitting also uses `env.GROQ_FALLBACK_MODEL`. Groq and Mistral keys are required by startup validation. Surface provider failures with human-friendly errors and preserve feature fallbacks.
- Keep prompts deterministic—low temperature (≈0.2–0.3) for resume content selection, slightly higher (≈0.6–0.7) for conversational outputs per existing services.
- Validate AI outputs against Zod schemas before using them; provide fallbacks to manual selection when parsing fails.

## Commit & PR Expectations

- Commit messages: short, present tense, <=72 chars (`Add conversation starter loader`).
- Bundle related changes; include generated migrations with the schema update that produced them.
- PR descriptions should call out context, solution, rollout/rollback considerations, manual QA, and screenshots/video for UI changes.
- Before review, confirm `pnpm run lint`, `pnpm run typecheck`, and any new tests all succeed.

## Environment & Secrets

- Follow the [configuration reference](README.md#configuration) and [deployment guide](docs/deployment.md). Compiler settings are required for PDFs and Compose, but optional for other features outside Compose.
- Never commit secrets. Mention new env vars in PRs.
- `src/lib/env.ts` validates app and worker configuration at startup; migration tooling validates only `DATABASE_URL`. Never bake real secrets into container images.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
