# Repository Guidelines

## Stack & Architecture Snapshot
- **Framework**: Next.js 15 App Router with React 19 and TypeScript 5.
- **Data**: Drizzle ORM targeting Turso (libSQL); migrations generated via Drizzle Kit.
- **Auth**: BetterAuth with middleware-backed session enforcement (see `src/lib/auth.ts`, `middleware.ts`).
- **UI**: Tailwind CSS v4 + shadcn/ui primitives; Lucide icons; Sonner for notifications.
- **Forms & Validation**: React Hook Form + Zod resolvers; shared schemas live with API validators.
- **AI**: Vercel AI SDK with Groq (`@ai-sdk/groq`) powering cover letters, resume tailoring, and conversation starters. Default model is `openai/gpt-oss-120b`; fallback is `moonshotai/kimi-k2-instruct`.
- **Documents**: Puppeteer renders resume PDFs using templates in `src/lib/resume-templates/`.

## Module Organization
- `src/app`
  - Feature folders (e.g., `dashboard/resumes`) colocate page entries with supporting UI components plus TanStack Query `queries/` & `mutations/`.
  - API routes live under `src/app/api/<feature>/` and follow a consistent pattern: `route.ts` for HTTP wiring, `service.ts` for business logic, `validators.ts` (or `validators.ts` in `profile/`) exporting Zod schemas used on client and server.
  - Authentication pages reside in `(auth)/`; dashboard routes are protected via middleware.
- `src/components`: Shared presentation-only primitives (buttons, inputs, skeletons) built on shadcn/ui.
- `src/lib`: Cross-cutting utilities—environment guard (`env.ts`), Drizzle setup (`db/`), BetterAuth client, resume templates, helper utilities, and validator re-exports.
- `migrations/`: Generated SQL files—commit alongside schema adjustments.
- `public/`, `components.json`, config roots (`drizzle.config.ts`, `tsconfig.json`, etc.) hold assets and tool configuration.

## Development Commands
- Install deps: `bun install` (keep `bun.lock` checked in). `npm install` works but Bun is preferred.
- Local dev: `bun run dev` (Turbopack).
- Production build: `bun run build` (runs lint + type checks).
- Serve production build: `bun run start`.
- Quality gates: `bun run lint`, `bun run typecheck` (must be clean before PR or task completion).
- Database utilities: `bun run db:push`, `bun run db:generate`, `bun run db:studio`; use `bunx drizzle-kit push` to deploy schema updates to Turso.

## Quality Requirements
1. Run `bun run lint` and `bun run typecheck` after changes; fix all errors and obvious warnings.
2. Avoid disabling ESLint rules unless absolutely necessary—explain with comments if you must.
3. Prefer explicit types; **never** reach for `any`. Use `unknown`, generics, or schema-derived types.
4. Keep code paths defensive—handle API errors, loading states, and empty data gracefully.
5. When touching AI features, ensure clear fallbacks if `GROQ_API_KEY` or model calls fail.

## TypeScript & Coding Standards
- Lean on Zod schemas exported from `src/app/api/<feature>/validators` for runtime validation and type inference.
- Forms should use React Hook Form with `zodResolver` (see existing dashboard profile forms for patterns). After validation, cast `unknown` to schema-inferred types with a comment (`// Data validated by Zod`).
- Components in PascalCase, hooks in camelCase, server actions suffixed with `Action`.
- Follow Prettier defaults (2-space indent, semicolons, double quotes). Respect Tailwind naming; prefer `@/` alias imports.

## Testing Guidance
- Current gates: `bun run lint`, `bun run typecheck`, plus manual QA documented in PR descriptions.
- Add focused `*.test.ts(x)` files when introducing regressions-prone logic (e.g., data transforms in `src/lib`, resume tailoring flows, PDF generation helpers). Run with `bun test` if you add tests.
- Sanitize or mock any real candidate data in fixtures.

## AI Feature Notes
- All Groq interactions pull configuration from `env.GROQ_API_KEY` and `env.GROQ_MODEL`. Guard routes so they surface human-friendly errors when keys are missing.
- Keep prompts deterministic—low temperature (≈0.2–0.3) for resume content selection, slightly higher (≈0.6–0.7) for conversational outputs per existing services.
- Validate AI outputs against Zod schemas before using them; provide fallbacks to manual selection when parsing fails.

## Commit & PR Expectations
- Commit messages: short, present tense, <=72 chars (`Add conversation starter loader`).
- Bundle related changes; include generated migrations with the schema update that produced them.
- PR descriptions should call out context, solution, rollout/rollback considerations, manual QA, and screenshots/video for UI changes.
- Before review, confirm `bun run lint`, `bun run typecheck`, and any new tests all succeed.

## Environment & Secrets
- Copy `.env.example` ➜ `.env` and populate all required BetterAuth, Turso, and Groq keys (`BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`, `NEXT_PUBLIC_BETTER_AUTH_URL`, `TURSO_CONNECTION_URL`, `TURSO_AUTH_TOKEN`, `GROQ_API_KEY`).
- Never commit secrets. Mention new env vars in PRs.
- `src/lib/env.ts` performs strict validation; missing/invalid values will fail fast on boot—verify locally before pushing.
