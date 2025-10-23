# Job Application Assistant

Job Application Assistant is a full-stack Next.js App Router project that centralizes the job search workflow. It lets candidates maintain a structured professional profile, track applications, and use AI-powered tools to generate resumes, cover letters, and outreach messages.

## Highlights
- Structured profile builder covering personal details, work experience, education, skills, projects, certifications, achievements, and references.
- Resume library with CRUD, default resume selection, HTML previews, and PDF export using the professional template.
- Job-specific resume tailoring that calls Groq to analyze job descriptions, select relevant content, and produce an A4 PDF with optional manual overrides.
- AI cover letter generator and conversation starter assistant that pull from saved profile/resume data (requires `GROQ_API_KEY`).
- Application tracker and dashboard that surface counts, status breakdowns, and recent activity using Drizzle queries.

## Tech Stack
- **Framework**: Next.js 15.4 (App Router), React 19, TypeScript 5
- **Data & Auth**: Drizzle ORM + Turso (libSQL), BetterAuth sessions, Zod validators
- **Client**: Tailwind CSS v4, Shadcn UI, Lucide icons, Sonner toasts, React Hook Form, TanStack Query
- **AI & Documents**: Vercel AI SDK with `@ai-sdk/groq` for text generation, Puppeteer for PDF export, AI content selection service for resume tailoring
- **Tooling**: Bun (runtime and script runner), ESLint 9, TypeScript compiler checks, Drizzle Kit migrations

## Getting Started

### Prerequisites
- Node.js 20+
- [Bun](https://bun.sh/) 1.1+ (recommended) or npm
- Turso database credentials
- Groq API key for AI functionality

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
- `bun run build` – production build (includes lint and type checks)
- `bun run start` – serve the production build
- `bun run lint` – ESLint
- `bun run typecheck` – TypeScript only
- `bun run db:push` / `bun run db:generate` / `bun run db:studio` – Drizzle Kit helpers
- `bunx drizzle-kit push` – push schema changes directly to Turso if preferred

## Environment variables

| Variable | Required | Description |
| --- | --- | --- |
| `BETTER_AUTH_SECRET` | Yes | 32+ character secret used by BetterAuth |
| `BETTER_AUTH_URL` | Yes | Server-side auth URL (e.g. `http://localhost:3000`) |
| `NEXT_PUBLIC_BETTER_AUTH_URL` | Yes | Client-side auth URL |
| `TURSO_CONNECTION_URL` | Yes | libSQL connection string from Turso |
| `TURSO_AUTH_TOKEN` | Yes | Turso auth token |
| `GROQ_API_KEY` | Yes* | Groq API key used for resume tailoring, cover letters, and conversation starters |
| `GROQ_MODEL` | No | Optional Groq model override; defaults to `openai/gpt-oss-120b` |
| `NEXT_PUBLIC_APP_URL` | No | Optional absolute app URL used in client code |
| `NODE_ENV` | No | Defaults to `development` |
| `PORT` | No | Server port, defaults to `3000` |

\*AI-powered routes return errors if `GROQ_API_KEY` is missing.

## Project structure

- `src/app`
  - Feature folders (e.g., `dashboard/applications`) colocate page components, supporting UI pieces, and TanStack Query `queries/` + `mutations/` so data hooks live beside the screens they power.
  - `src/app/dashboard/profile` keeps `page.tsx` alongside profile-specific components (forms, lists) and data hooks for CRUD.
  - API routes live under `src/app/api/<feature>/`; for instance, `src/app/api/resume-generation/route.ts` handles HTTP, delegates to `service.ts`, and trusts Zod schemas from `validators.ts` to validate requests and share types with the front end.
- `src/components` — Shared UI primitives (shadcn/ui wrappers, buttons, inputs, skeletons) that stay presentation-only.
- `src/lib` — Back-end glue: `env.ts` for Zod-based env validation, `db/` for Drizzle + Turso schema/client, `auth.ts` for BetterAuth, resume templates, utility helpers, and the validator re-exports.
- `middleware.ts` — BetterAuth session checks for protected routes.
- `migrations/` — Drizzle-generated SQL kept in lockstep with schema changes.
- `components.json`, `public/`, `drizzle.config.ts`, `tsconfig.json`, etc. — framework configuration and static assets.

## Feature overview

### Authentication & access control
- BetterAuth email/password flows with sign-in, sign-up, password reset, and middleware-protected dashboard routes.
- `src/lib/auth.ts` and `middleware.ts` enforce session checks on server requests.

### Profile management
- Eight profile sections (personal info, work experience, education, skills, projects, certifications, achievements, references) with React Hook Form + Zod validation.
- CRUD flows implemented with TanStack Query (`queries/` and `mutations/` folders) and Drizzle-backed API routes.

### Resume tooling
- Resume list with default selection and JSON storage of resume content.
- `/dashboard/resumes/generate` builds a resume from profile content and exports PDF/HTML via Puppeteer using the `professional` template.
- General resume generation currently ships with the professional template; additional templates can be added under `src/lib/resume-templates/`.

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
- Resume PDFs are generated server-side with Puppeteer; previews reuse the same HTML with additional styling.

## Database & migrations
- Update the schema in `src/lib/db/schema/`, then run `bun run db:generate` to create SQL migrations.
- Apply changes locally with `bun run db:push`; use `bunx drizzle-kit push` to push to Turso once ready.
- Keep the generated SQL in `migrations/` under version control.

## Quality checks & testing
- Run `bun run lint` and `bun run typecheck` before opening a pull request. Both commands are required and run automatically during `bun run build`.
- There are currently no automated tests; add `*.test.ts(x)` files next to the code when introducing critical logic.

## Contributing
- Review the contributor playbook in `AGENTS.md` for coding standards, naming conventions, and review expectations.
- Keep commits focused and include migrations alongside schema changes.

## License
No license file is included. Contact the maintainers before reusing or distributing this code.
