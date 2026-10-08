# Job Application Assistant

Job Application Assistant helps candidates maintain a professional profile, track applications, and generate resumes, cover letters, and outreach messages.

## Features

- Email/password authentication, password reset, and a protected dashboard.
- Profile management for personal details, work experience, education, skills, projects, certifications, achievements, and references.
- Resume import using Mistral OCR and structured parsing. Imported details and suggested entries can be reviewed before saving; failed structured parsing falls back to basic text extraction.
- A resume library with editing, default resume selection, PDF previews, and downloads. Generated resumes store a versioned document snapshot that can be compiled again without rerunning AI; legacy manual and HTML records remain readable.
- Profile-based and job-specific resume generation with manual content selection or Groq-assisted tailoring, using the A4 `professional` LaTeX template. Both flows support a one- or two-page target with up to three AI fitting revisions while keeping fonts and margins fixed. An unmet target returns the best compiled draft with a warning.
- Background resume generation that continues after navigation and restores the latest job on return. Preview remains a draft; Generate & Save PDF saves an application resume when the job completes, even if the browser closes. Temporary job results expire after seven days.
- AI cover letters and conversation starters based on saved profile and resume data.
- Application tracking with status, notes, job descriptions, and recruiter information, plus dashboard counts, offer rate, and recent activity.

## Stack

- Next.js 16 App Router, React 19 with React Compiler, and TypeScript 6.
- PostgreSQL with Drizzle ORM, BetterAuth, and Zod.
- Tailwind CSS v4, shadcn/ui, React Hook Form, TanStack Query, and Zustand.
- Vercel AI SDK 7 with Groq, Mistral OCR, and a separate authenticated pdfLaTeX service.
- Node.js 24, pnpm, Vitest, Playwright, and ESLint.

## Local setup

Install Node.js 24 using fnm and the committed `.nvmrc`. Docker Engine with Compose v2 must be available for PostgreSQL and the PDF compiler. The app and worker require Groq and Mistral API keys at startup, even when you only use other features.

```sh
git clone https://github.com/ffeew/job-application-assistant
cd job-application-assistant
fnm install
fnm use
```

pnpm is pinned to 12.10.1 in `package.json`. If it is unavailable after selecting Node.js 24, install it with `npm install --global pnpm@12.10.1`.

```sh
pnpm install
cp .env.example .env
```

Fill in `.env` before continuing. Generate the database password, BetterAuth secret, and compiler token independently with `openssl rand -hex 32`. Match `DATABASE_URL` to the Compose database credentials, URL-encoding special characters. For host development, use `BETTER_AUTH_URL=http://localhost:3000`, a database URL at `localhost:5432`, and `LATEX_COMPILER_URL=http://localhost:8080`.

```sh
docker compose -f docker-compose.yml -f docker-compose.dev.yml up -d db latex-compiler
pnpm run db:migrate
```

The development override exposes the database and compiler on loopback. Use it only for local development. Start the worker in a separate terminal:

```sh
pnpm run worker
```

Start the application in another terminal, then open `http://localhost:3000`:

```sh
pnpm run dev
```

## Configuration

The app and worker validate their runtime environment through `src/lib/env.ts`. Missing or invalid required values prevent startup. The migration command validates only `DATABASE_URL`.

| Variable | Required | Purpose/default |
| --- | --- | --- |
| `BETTER_AUTH_SECRET` | Yes | Authentication secret, at least 32 characters |
| `BETTER_AUTH_URL` | Yes | Canonical authentication origin; use the public HTTPS origin in production |
| `DATABASE_URL` | Host processes | PostgreSQL connection URL for local app/worker and database tooling |
| `POSTGRES_PASSWORD` | Compose | Database password; Compose builds its internal connection URL from database fields |
| `POSTGRES_USER` / `POSTGRES_DB` | No | Compose user/database names; both default to `job_assistant` |
| `GROQ_API_KEY` | Yes | Content generation and resume parsing |
| `GROQ_MODEL` | No | Primary model; defaults to `qwen/qwen3.8-27b` |
| `GROQ_FALLBACK_MODEL` | No | Resume-fitting fallback; defaults to `openai/gpt-oss-120b` |
| `MISTRAL_API_KEY` | Yes | Resume OCR imports |
| `LATEX_COMPILER_URL` | PDFs; supplied by Compose | Compiler URL; Compose uses `http://latex-compiler:8080` |
| `LATEX_COMPILER_TOKEN` | PDFs; required by Compose | Shared app/worker/compiler token, at least 32 characters |
| `RESEND_API_KEY` | No | Password reset email delivery; without it, email content is logged to the server console |
| `RESEND_FROM_EMAIL` | No | Sender for Resend; defaults to `noreply@example.com` |
| `NODE_ENV` | No | Defaults to `development`; runtime containers use `production` |
| `PORT` | No | App port outside Compose; set in the process environment, not `.env`; defaults to `3000` |
| `APP_PORT` | No | Compose host port published on loopback; defaults to `3000` |

Qwen requests use non-thinking mode and cap explicit output budgets at 16,384 tokens. Resume fitting tries the fallback model if the primary fails. Model override changes require restarting the app and worker. Resume OCR uses the `mistral-ocr-latest` alias and keeps tables, headers, and footers inline for profile parsing.

## Commands

| Command | Purpose |
| --- | --- |
| `pnpm run dev` | Start the Turbopack development server |
| `pnpm run build` / `pnpm run start` | Run lint and the production build; serve the build |
| `pnpm run lint` / `pnpm run lint:fix` | Run strict ESLint checks; optionally apply automatic fixes |
| `pnpm run typecheck` | Generate Next.js route types, then run TypeScript checks |
| `pnpm run test` | Run Vitest tests; database integration is opt-in |
| `pnpm run test:integration` | Run PostgreSQL/API/worker integration tests with the test environment configured |
| `pnpm run test:e2e` / `pnpm run test:e2e:ui` | Run Playwright browser tests or open UI mode |
| `pnpm run build:runtime` | Bundle the migrator, worker, and compiler as Node.js ESM entrypoints |
| `pnpm run worker` | Process queued resume generation jobs |
| `pnpm run db:migrate` | Apply committed PostgreSQL migrations |
| `pnpm run db:generate` / `pnpm run db:studio` | Generate migrations from schema changes; inspect the database |
| `pnpm run db:push` | Apply schema directly for disposable local experiments |

Commit generated SQL in `migrations/` alongside schema changes. Deploy committed migrations rather than using `db:push` against production.

## Guides

- [Testing and quality checks](docs/testing.md): lint, type checking, unit/integration tests, and CI.
- [Browser tests](tests/e2e/README.md): isolated Playwright setup, fixtures, and artifacts.
- [Self-hosted deployment](docs/deployment.md): Docker Compose, Cloudflare Tunnel, queue operation, updates, and backups.
- [Resume compiler](services/latex-compiler/README.md): compiler setup, protocol, resource limits, and compatibility.
- [Contributor guidelines](AGENTS.md): architecture, module ownership, coding standards, and review expectations.

## License

No license file is included. Contact the maintainers before reusing or distributing this code.
