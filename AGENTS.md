# Repository Guidelines

## Project Structure & Module Organization
- `src/app`: Next.js App Router entry point; group feature routes with colocated server actions.
- `src/components`: Reusable UI and form primitives styled with Tailwind utilities.
- `src/hooks` & `src/lib`: Shared logic, data access, Drizzle schema (`src/lib/db`) and env guards (`src/lib/env`).
- `migrations`: Drizzle output; commit alongside the schema change that produced them.
- `public` & `components.json`: Static assets and shadcn/ui registry metadata.

## Build, Test, and Development Commands
- `bun install`: Install dependencies; keep `bun.lock` committed.
- `bun run dev`: Launch the Turbopack dev server.
- `bun run build`: Production build with type and lint enforcement.
- `bun run start`: Serve the compiled app from `.next`.
- `bun run lint` / `bun run typecheck`: Mandatory ESLint and TypeScript checks before a PR.
- `bunx drizzle-kit push`: Apply schema updates to Turso after editing `src/lib/db/schema`.

## Coding Style & Naming Conventions
- TypeScript-first; rely on Prettier defaults (2-space indent, semicolons, double quotes).
- Components in PascalCase, hooks in camelCase, server actions suffixed with `Action`.
- Prefer the `@/` path alias over deep relatives and compose UI with shadcn components plus Tailwind utilities.
- Run `bun run lint` before committing to catch layout and accessibility regressions.

## Testing Guidelines
- Today quality gates are `bun run lint`, `bun run typecheck`, and targeted manual QA—document the scenarios you exercised in PRs.
- Add automated checks as `*.test.ts(x)` files next to the code and run them with `bun test` once committed.
- Prioritize coverage around `src/lib` data transforms, resume tailoring flows, and PDF export logic; anonymize sample data.

## Commit & Pull Request Guidelines
- Follow the existing short present-tense subject line style (`Switches PDF export to A4 format`, `Improves AI results styling`); stay under 72 characters, no trailing punctuation.
- Keep each commit focused and include migrations with the schema change that generated them.
- PR descriptions must cover context, solution, rollout/rollback notes, and screenshots or recordings for UI changes.
- Verify `bun run lint`, `bun run typecheck`, and any new tests before requesting review.

## Environment & Configuration
- Copy `.env.example` (if present) and supply Turso and Groq credentials referenced in `src/lib/env` (`TURSO_CONNECTION_URL`, `TURSO_AUTH_TOKEN`, `GROQ_API_KEY`).
- Keep secrets in local `.env` files only; call out new variables in your PR description.
