# Job Application Assistant

Job Application Assistant is a full-stack Next.js App Router project that centralizes the job search workflow. It lets candidates maintain a structured professional profile, track applications, and use AI-powered tools to generate resumes, cover letters, and outreach messages.

## Highlights

- Structured profile builder covering personal details, work experience, education, skills, projects, certifications, achievements, and references.
- One-click resume import that runs Mistral OCR to prefill personal details and stage suggested entries for work history, education, skills, and more—review everything before saving.
- Resume library with CRUD, default resume selection, PDF previews, and LaTeX PDF export using the professional template.
- Job-specific resume tailoring that calls Groq to analyze job descriptions, select relevant content, and produce an A4 PDF with optional manual overrides.
- AI cover letter generator and conversation starter assistant that pull from saved profile/resume data (requires `GROQ_API_KEY`).
- Application tracker and dashboard that surface counts, status breakdowns, and recent activity using Drizzle queries.

## Tech Stack

- **Framework**: Next.js 16.3 (App Router), React 19.3 with React Compiler, TypeScript 6
- **Data & Auth**: Drizzle ORM + PostgreSQL, BetterAuth sessions, Zod validators
- **Client**: Tailwind CSS v4, Shadcn UI, Lucide icons, Sonner toasts, React Hook Form, TanStack Query
- **AI & Documents**: Vercel AI SDK 7 with `@ai-sdk/groq` for text generation, a Docker-hosted pdfLaTeX compiler for PDF export, AI content selection and page fitting for resumes
- **Tooling**: Node.js 24, pnpm, Vitest, ESLint 9, TypeScript compiler checks, Drizzle Kit migrations

## Getting Started

### Prerequisites

- Node.js 24 (use `fnm install` and `fnm use`; fnm reads the committed `.nvmrc`)
- [pnpm](https://pnpm.io/installation) 12.10.1 (pinned in `package.json`)
- Docker Engine with Compose v2 for PostgreSQL and the PDF compiler
- Groq API key for AI functionality
- Mistral API key for resume OCR imports

### Setup

If pnpm is not already available under Node.js 24, run `npm install --global pnpm@12.10.1` after `fnm use`.

```bash
git clone https://github.com/ffeew/job-application-assistant
cd job-application-assistant

fnm install
fnm use
pnpm install
cp .env.example .env    # then fill in the values
docker compose -f docker-compose.yml -f docker-compose.dev.yml up -d db latex-compiler
pnpm run db:migrate      # apply committed PostgreSQL migrations
pnpm run worker          # run in a separate terminal for resume generation
pnpm run dev             # run in another terminal; visit http://localhost:3000
```

### Useful scripts

- `pnpm run dev` – start the Turbopack dev server
- `pnpm run build` – run ESLint, then build for production with Turbopack and type checks
- `pnpm run start` – serve the production build
- `pnpm run lint` – strict ESLint checks; errors and warnings fail the command
- `pnpm run lint:fix` – apply ESLint's safe automatic fixes, then report remaining findings
- `pnpm run typecheck` – generate Next.js route types, then run TypeScript checks
- `pnpm run test` – run the focused Vitest tests on Node.js
- `pnpm run build:runtime` – bundle the migrator, worker, and PDF compiler for Node.js
- `pnpm run db:push` / `pnpm run db:generate` / `pnpm run db:studio` – Drizzle Kit helpers
- `pnpm run db:migrate` – apply committed PostgreSQL migrations
- `pnpm run worker` – process queued resume generation jobs
- `pnpm run test:integration` – PostgreSQL/API/worker integration tests (see the deployment guide)

## Self-hosted deployment

Run the app, PostgreSQL, migrations, generation worker, and PDF compiler with Docker Compose. Your existing host-installed Cloudflare tunnel forwards to `http://127.0.0.1:3000`. See [the deployment guide](docs/deployment.md) for configuration, updates, backups, local development, and validation.

Resume generation returns a job ID immediately and polls for completion. Work continues after leaving the page; the latest job is restored on return. Completed and failed job results expire after seven days. Preview remains a draft; Generate & Save PDF saves tailored resumes even if the browser closes.

## Environment variables

| Variable                      | Required | Description                                                                      |
| ----------------------------- | -------- | -------------------------------------------------------------------------------- |
| `BETTER_AUTH_SECRET`          | Yes      | 32+ character secret used by BetterAuth                                          |
| `BETTER_AUTH_URL`             | Yes      | Server-side auth URL (e.g. `http://localhost:3000`)                              |
| `DATABASE_URL`               | Yes      | PostgreSQL URL for host development and database tooling                          |
| `POSTGRES_PASSWORD`          | Compose  | PostgreSQL password; Compose encodes credentials for its internal connection URL  |
| `POSTGRES_USER` / `POSTGRES_DB` | No      | Compose user/database names, defaulting to `job_assistant`                         |
| `GROQ_API_KEY`                | Yes\*    | Groq API key used for resume tailoring, cover letters, and conversation starters |
| `GROQ_MODEL`                  | No       | Optional Groq model override; defaults to `qwen/qwen3.8-27b`                    |
| `GROQ_FALLBACK_MODEL`         | No       | Fitting fallback; defaults to `openai/gpt-oss-120b`                              |
| `LATEX_COMPILER_URL`          | For PDFs | URL of the separate compiler service                                             |
| `LATEX_COMPILER_TOKEN`        | For PDFs | Shared compiler authentication token (32+ characters)                            |
| `MISTRAL_API_KEY`             | Yes\*    | Mistral OCR API key used to import resumes into the profile form                 |
| `NEXT_PUBLIC_APP_URL`         | No       | Optional absolute app URL used in client code                                    |
| `NODE_ENV`                    | No       | Defaults to `development`                                                        |
| `PORT`                        | No       | Server port, defaults to `3000`                                                  |

\*AI-powered routes return errors if the corresponding key is missing (Groq for content generation, Mistral for resume imports).

Groq generation defaults to [Qwen 3.8 27B](https://console.groq.com/docs/model/qwen/qwen3.8-27b) in non-thinking mode. Qwen is currently a preview model and has higher token prices than GPT-OSS 120B. Requests with an explicit output budget are capped at Qwen's 16,384-token limit; resume fitting tries GPT-OSS 120B if the primary model fails. Resume imports retain their basic text-extraction fallback.

For existing deployments, update any `GROQ_MODEL` and `GROQ_FALLBACK_MODEL` overrides to the defaults above and restart the app and generation worker. To switch the primary back to GPT-OSS, set `GROQ_MODEL=openai/gpt-oss-120b` and restart both processes. Check Groq's [supported models](https://console.groq.com/docs/models) and [deprecation history](https://console.groq.com/docs/deprecations) when changing overrides.

## Project structure

- `src/app`
  - Feature folders (e.g., `dashboard/applications`) colocate page components, supporting UI pieces, and TanStack Query `queries/` + `mutations/` so data hooks live beside the screens they power.
  - `src/app/dashboard/profile` keeps `page.tsx` alongside profile-specific components (forms, lists) and data hooks for CRUD.
  - API routes live under `src/app/api/<feature>/`; for instance, `src/app/api/resume-generation/route.ts` handles HTTP, delegates to `service.ts`, and trusts Zod schemas from `validators.ts` to validate requests and share types with the front end.
- `src/components` — Shared UI primitives (shadcn/ui wrappers, buttons, inputs, skeletons) that stay presentation-only.
- `src/lib` — Back-end glue: `env.ts` for Zod-based env validation, `db/` for Drizzle + PostgreSQL schema/client, `auth.ts` for BetterAuth, resume templates, utility helpers, and the validator re-exports.
- `src/proxy.ts` — BetterAuth session-cookie checks for protected dashboard routes.
- `migrations/` — Drizzle-generated SQL kept in lockstep with schema changes.
- `components.json`, `public/`, `drizzle.config.ts`, `tsconfig.json`, etc. — framework configuration and static assets.

## Feature overview

### Authentication & access control

- BetterAuth email/password flows with sign-in, sign-up, password reset, and proxy-protected dashboard routes.
- `src/proxy.ts` redirects dashboard requests without a session cookie to sign-in. API routes validate sessions through `src/lib/auth.ts`.

### Profile management

- Eight profile sections (personal info, work experience, education, skills, projects, certifications, achievements, references) with React Hook Form + Zod validation.
- Personal info card includes a resume uploader that calls `/api/profile/resume-import` to run Mistral OCR and prefill the form when `MISTRAL_API_KEY` is configured.
- Resume imports use Mistral SDK 2 and `mistral-ocr-latest` (currently OCR 4.1). Tables, headers, and footers remain inline in the page Markdown so the profile parser retains contact details and tabular content. No new environment variables are required.
- CRUD flows implemented with TanStack Query (`queries/` and `mutations/` folders) and Drizzle-backed API routes.

### Resume tooling

- Resume list with default selection and JSON storage of resume content.
- `/dashboard/resumes/generate` builds a resume from profile content using the compact A4 LaTeX `professional` template, with PDF preview and download.
- Both resume flows support a one- or two-page target. The app compiles the selected content, checks the real page count and layout warnings, and may shorten wording or remove less relevant bullets through up to three AI revisions. Font size and margins stay fixed; an unmet target returns a downloadable draft with a warning.

### LaTeX compiler setup

Resume generation requires `LATEX_COMPILER_URL` and a matching 32+ character `LATEX_COMPILER_TOKEN` in the app and compiler service. Follow [the compiler deployment guide](services/latex-compiler/README.md) to build and run the Docker image locally or on a container host. The Compose stack runs the compiler privately beside the app and worker. These settings are optional for other application features when running outside Compose.

### Job-specific resume tailoring

- `/dashboard/applications/[id]/resume` uses job descriptions plus Groq (`AIContentSelectionService`) to score and select relevant profile entries.
- Supports configurable limits, preview rendering, A4 PDF export, and manual overrides when AI output needs tweaks.

### AI cover letters & conversation starters

- Cover letters (`src/app/api/cover-letters/service.ts`) generate drafts with Groq and store edits alongside application/resume references.
- Conversation starters combine profile and default resume context to craft outreach messages.
- Both features surface clear errors if the Groq key is missing to encourage graceful fallbacks.

### Application tracking & dashboard

- CRUD for job applications with status, notes, job description, and recruiter info.
- Dashboard aggregates counts, offer rate, and recent activity via dedicated queries under `dashboard/queries`.

## Architecture notes

- Each API feature lives in `src/app/api/<feature>/` with `route.ts`, `service.ts`, and Zod validators to keep handlers thin.
- Drizzle ORM interacts with PostgreSQL via `src/lib/db/db.ts`; migrations are tracked in `/migrations` and configured in `drizzle.config.ts`.
- Front-end data access is handled through co-located `queries` and `mutations` that wrap REST endpoints with TanStack Query.
- `@/lib/validators` re-exports schema types so client code can stay type-safe.
- Resume PDFs are compiled by a separate authenticated LaTeX service. Preview, download, and save reuse one generated result. Saved generated resumes store a versioned document snapshot and recompile it without rerunning AI; legacy manual and HTML records remain readable. No database migration is needed.

## Database & migrations

- Update the schema in `src/lib/db/schema/`, then run `pnpm run db:generate` to create SQL migrations.
- Apply committed migrations with `pnpm run db:migrate`; use `pnpm run db:push` only for disposable local schema experiments.
- The squashed PostgreSQL baseline initializes a fresh database; historical Turso data is not imported.
- Keep the generated SQL in `migrations/` under version control.

## Quality checks & testing

Browser E2E tests use Playwright with seeded PostgreSQL Testcontainers and the
real PDF compiler. Run `pnpm exec playwright install --with-deps chromium`, then
`pnpm run test:e2e` with Docker running. See [the browser testing guide](tests/e2e/README.md)
for fixtures, UI mode, artifacts, and CI details.

PostgreSQL integration tests are opt-in with `RUN_DB_INTEGRATION=1` and a dedicated `DATABASE_URL` whose database name ends in `_test`. CI runs them against PostgreSQL 18 with fake service credentials; ordinary unit tests require no database. See the deployment guide for the full command.


- Run `pnpm run lint`, `pnpm run typecheck`, and `pnpm run test` before opening a pull request. Production builds invoke the same lint gate before Next.js compiles and checks types; Next.js 16 does not run linting itself.
- CI uses Node.js 24 and `pnpm install --frozen-lockfile` before running all three checks. Tests use sanitized fixtures and need no database or AI credentials.
- ESLint combines core recommended rules, Next.js Core Web Vitals and React Compiler checks, TypeScript ESLint's `strictTypeChecked` preset, TanStack Query's recommended rules, and JSX accessibility checks for HTML and shared form controls. Type-aware rules use the existing TypeScript project; JavaScript configuration files stay untyped. Generated Next.js files and build output are ignored.
- TypeScript also enables `noUncheckedIndexedAccess`: array and dictionary lookups must account for missing values. Keep defensive guards and correct their types rather than suppressing lint errors.
- The two intentional strict-preset adjustments allow concise callbacks returning `void`, explicit `void` expressions, and numeric template interpolation. Other template restrictions remain strict. Unused lint directives and inline configurations fail linting. TypeScript ESLint is pinned because its strict preset can change in minor releases; review preset changes when upgrading it.
- Await dependent asynchronous work. Use `withAsyncHandler` for promise-returning React event handlers and `runAsyncAction` for background work that may reject; both observe unexpected failures. Use explicit `void` for TanStack Query invalidations and refetches with the default error handling to preserve background refresh timing. Handle rejections explicitly when opting into `throwOnError`.
- Keep JSON input typed as `unknown` until validated. Client query and mutation hooks use `parseJsonResponse` with feature-specific Zod transport schemas before caching data; HTTP timestamp fields stay strings, while server/domain types retain `Date` objects. Use `readApiError` for text and PDF HTTP errors. Response schemas validate actual wire types without imposing new form constraints on stored data.
- Add focused `*.test.ts(x)` files next to new regression-prone logic. Existing tests cover response validation and fallbacks, stored resume content, async event adapters, and defensive month formatting. Formatting enforcement is separate from this lint configuration.

## Contributing

- Review the contributor playbook in `AGENTS.md` for coding standards, naming conventions, and review expectations.
- Keep commits focused and include migrations alongside schema changes.

## License

No license file is included. Contact the maintainers before reusing or distributing this code.
