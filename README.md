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

- **Framework**: Next.js 16.3 (App Router), React 19.3 with React Compiler, TypeScript 5
- **Data & Auth**: Drizzle ORM + Turso (libSQL), BetterAuth sessions, Zod validators
- **Client**: Tailwind CSS v4, Shadcn UI, Lucide icons, Sonner toasts, React Hook Form, TanStack Query
- **AI & Documents**: Vercel AI SDK with `@ai-sdk/groq` for text generation, a Docker-hosted pdfLaTeX compiler for PDF export, AI content selection and page fitting for resumes
- **Tooling**: Bun (runtime and script runner), ESLint 9, TypeScript compiler checks, Drizzle Kit migrations

## Getting Started

### Prerequisites

- Node.js 20.9.0+ (Node.js 24 is used in CI)
- [Bun](https://bun.sh/) 1.1+ (recommended) or npm
- Turso database credentials
- Groq API key for AI functionality
- Mistral API key for resume OCR imports

### Setup

```bash
git clone https://github.com/ffeew/job-application-assistant
cd job-application-assistant

bun install             # or npm install
cp .env.example .env    # then fill in the values
bun run db:push         # apply the latest Drizzle migrations
bun run dev             # visit http://localhost:3000
```

### Useful scripts

- `bun run dev` – start the Turbopack dev server
- `bun run build` – run ESLint, then build for production with Turbopack and type checks
- `bun run start` – serve the production build
- `bun run lint` – strict ESLint checks; errors and warnings fail the command
- `bun run lint:fix` – apply ESLint's safe automatic fixes, then report remaining findings
- `bun run typecheck` – generate Next.js route types, then run TypeScript checks
- `bun run test` – run the focused Bun tests
- `bun run db:push` / `bun run db:generate` / `bun run db:studio` – Drizzle Kit helpers
- `bunx drizzle-kit push` – push schema changes directly to Turso if preferred

## Environment variables

| Variable                      | Required | Description                                                                      |
| ----------------------------- | -------- | -------------------------------------------------------------------------------- |
| `BETTER_AUTH_SECRET`          | Yes      | 32+ character secret used by BetterAuth                                          |
| `BETTER_AUTH_URL`             | Yes      | Server-side auth URL (e.g. `http://localhost:3000`)                              |
| `NEXT_PUBLIC_BETTER_AUTH_URL` | Yes      | Client-side auth URL                                                             |
| `TURSO_CONNECTION_URL`        | Yes      | libSQL connection string from Turso                                              |
| `TURSO_AUTH_TOKEN`            | Yes      | Turso auth token                                                                 |
| `GROQ_API_KEY`                | Yes\*    | Groq API key used for resume tailoring, cover letters, and conversation starters |
| `GROQ_MODEL`                  | No       | Optional Groq model override; defaults to `openai/gpt-oss-120b`                  |
| `GROQ_FALLBACK_MODEL`         | No       | Fitting fallback; defaults to `moonshotai/kimi-k2-instruct`                      |
| `LATEX_COMPILER_URL`          | For PDFs | URL of the separate compiler service                                             |
| `LATEX_COMPILER_TOKEN`        | For PDFs | Shared compiler authentication token (32+ characters)                            |
| `MISTRAL_API_KEY`             | Yes\*    | Mistral OCR API key used to import resumes into the profile form                 |
| `NEXT_PUBLIC_APP_URL`         | No       | Optional absolute app URL used in client code                                    |
| `NODE_ENV`                    | No       | Defaults to `development`                                                        |
| `PORT`                        | No       | Server port, defaults to `3000`                                                  |

\*AI-powered routes return errors if the corresponding key is missing (Groq for content generation, Mistral for resume imports).

## Project structure

- `src/app`
  - Feature folders (e.g., `dashboard/applications`) colocate page components, supporting UI pieces, and TanStack Query `queries/` + `mutations/` so data hooks live beside the screens they power.
  - `src/app/dashboard/profile` keeps `page.tsx` alongside profile-specific components (forms, lists) and data hooks for CRUD.
  - API routes live under `src/app/api/<feature>/`; for instance, `src/app/api/resume-generation/route.ts` handles HTTP, delegates to `service.ts`, and trusts Zod schemas from `validators.ts` to validate requests and share types with the front end.
- `src/components` — Shared UI primitives (shadcn/ui wrappers, buttons, inputs, skeletons) that stay presentation-only.
- `src/lib` — Back-end glue: `env.ts` for Zod-based env validation, `db/` for Drizzle + Turso schema/client, `auth.ts` for BetterAuth, resume templates, utility helpers, and the validator re-exports.
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
- CRUD flows implemented with TanStack Query (`queries/` and `mutations/` folders) and Drizzle-backed API routes.

### Resume tooling

- Resume list with default selection and JSON storage of resume content.
- `/dashboard/resumes/generate` builds a resume from profile content using the compact A4 LaTeX `professional` template, with PDF preview and download.
- Both resume flows support a one- or two-page target. The app compiles the selected content, checks the real page count and layout warnings, and may shorten wording or remove less relevant bullets through up to three AI revisions. Font size and margins stay fixed; an unmet target returns a downloadable draft with a warning.

### LaTeX compiler setup

Resume generation requires `LATEX_COMPILER_URL` and a matching 32+ character `LATEX_COMPILER_TOKEN` in the app and compiler service. Follow [the compiler deployment guide](services/latex-compiler/README.md) to build and run the Docker image locally or on a container host. Keep the Next.js app on Vercel and expose the compiler through HTTPS in production. These settings are optional for other application features.

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
- Drizzle ORM interacts with Turso via `src/lib/db/db.ts`; migrations are tracked in `/migrations` and configured in `drizzle.config.ts`.
- Front-end data access is handled through co-located `queries` and `mutations` that wrap REST endpoints with TanStack Query.
- `@/lib/validators` re-exports schema types so client code can stay type-safe.
- Resume PDFs are compiled by a separate authenticated LaTeX service. Preview, download, and save reuse one generated result. Saved generated resumes store a versioned document snapshot and recompile it without rerunning AI; legacy manual and HTML records remain readable. No database migration is needed.

## Database & migrations

- Update the schema in `src/lib/db/schema/`, then run `bun run db:generate` to create SQL migrations.
- Apply changes locally with `bun run db:push`; use `bunx drizzle-kit push` to push to Turso once ready.
- Keep the generated SQL in `migrations/` under version control.

## Quality checks & testing

- Run `bun run lint`, `bun run typecheck`, and `bun run test` before opening a pull request. Production builds invoke the same lint gate before Next.js compiles and checks types; Next.js 16 does not run linting itself.
- CI uses Node.js 24 and `bun install --frozen-lockfile` before running all three checks. Tests use sanitized fixtures and need no database or AI credentials.
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
