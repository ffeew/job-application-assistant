# Job Application Assistant

Job Application Assistant helps candidates maintain a professional profile, track applications, and generate resumes, cover letters, and outreach messages.

## Features

- Email/password authentication, password reset, and a protected dashboard.
- Profile management for personal details, work experience, education, skills, projects, certifications, achievements, and references.
- Resume import from PDF, DOCX, or TXT with structured parsing. Text is read directly from the file, and scanned PDFs go through a local OCR service. Imported details and suggested entries can be reviewed before saving; failed structured parsing falls back to basic text extraction. When storage succeeds, originals are available for download or deletion, normally keeping the ten most recent. Failed cleanup leaves older files listed until a later import retries it.
- A resume library with editing, default resume selection, PDF previews, and downloads. Generated resumes store a versioned document snapshot that can be compiled again without rerunning AI; legacy manual and HTML records remain readable. When storage succeeds, saved tailored resumes reuse the generated PDF instead of compiling it again.
- Profile-based and job-specific resume generation with manual content selection or Groq-assisted tailoring, using the A4 `professional` LaTeX template. Both flows support a one- or two-page target with up to three AI fitting revisions while keeping fonts and margins fixed. An unmet target returns the best compiled draft with a warning.
- Background resume generation that continues after navigation and restores the latest job on return. Preview remains a draft; Save and download PDF saves an application resume when the job completes, even if the browser closes. Temporary job results expire after seven days.
- AI cover letters and conversation starters based on saved profile and resume data.
- Application tracking with status, notes, job descriptions, and recruiter information, plus dashboard counts, offer rate, and recent activity.

## Stack

- Next.js 16 App Router, React 19 with React Compiler, and TypeScript 6.
- PostgreSQL with Drizzle ORM, BetterAuth, and Zod.
- Tailwind CSS v4, shadcn/ui, React Hook Form, TanStack Query, and Zustand.
- Vercel AI SDK 7 with Groq, a separate authenticated pdfLaTeX service, and a local OCR service running RapidOCR with PaddleOCR models on CPU.
- SeaweedFS for imported files and saved resume PDFs, used through its S3 API so another S3-compatible store can take its place.
- Node.js 24, pnpm, Vitest, Playwright, ESLint, and Prettier.

## Local setup

Install Node.js 24 using fnm and the committed `.nvmrc`. Docker Engine with Compose v2 must be available for PostgreSQL, the PDF compiler, the OCR service, and file storage. The app and worker require a Groq API key at startup, even when you only use other features.

```sh
git clone https://github.com/ffeew/job-application-assistant
cd job-application-assistant
fnm install
fnm use
```

pnpm is pinned to 12.10.1 in `package.json`. If it is unavailable after selecting Node.js 24, install it with `npm install --global pnpm@12.10.1`.

`pnpm-workspace.yaml` sets `minimumReleaseAge`, so pnpm only installs package versions published at least 7 days ago. Adding or updating to a newer release fails until it is old enough.

```sh
pnpm install
cp .env.example .env
```

Fill in `.env` before continuing. Generate the database password, BetterAuth secret, compiler token, OCR token, and storage secret independently with `openssl rand -hex 32`. Match `DATABASE_URL` to the Compose database credentials, URL-encoding special characters. For host development, use `BETTER_AUTH_URL=http://localhost:3000`, a database URL at `localhost:5432`, `LATEX_COMPILER_URL=http://localhost:8080`, `OCR_SERVICE_URL=http://localhost:8081`, and `OBJECT_STORAGE_URL=http://localhost:8333`.

```sh
docker compose -f docker-compose.dev.yml up -d
pnpm run db:migrate
```

The development file runs only the database, compiler, OCR service, and file storage, published on loopback. Run it on its own and use it only for local development. Start the worker in a separate terminal:

```sh
pnpm run worker
```

Start the application in another terminal, then open `http://localhost:3000`:

```sh
pnpm run dev
```

## Configuration

The app and worker validate their runtime environment through `src/lib/env.ts`. Missing or invalid required values prevent startup. The migration command validates only `DATABASE_URL`. The Jenkins pipeline reads these variables from a [Secret file credential](docs/deployment.md#production-credential), not from a `.env` in its workspace.

| Variable | Required | Purpose/default |
| --- | --- | --- |
| `BETTER_AUTH_SECRET` | Yes | Authentication secret, at least 32 characters |
| `BETTER_AUTH_URL` | Yes | Canonical authentication origin; use the public HTTPS origin in production |
| `DISABLE_SIGNUP` | No | Set to `true` to close registration and hide the sign-up links; existing accounts keep working. Defaults to `false` |
| `DATABASE_URL` | Host processes | PostgreSQL connection URL for local app/worker and database tooling |
| `POSTGRES_PASSWORD` | Compose | Database password; Compose builds its internal connection URL from database fields |
| `POSTGRES_USER` / `POSTGRES_DB` | No | Compose user/database names; both default to `job_assistant` |
| `GROQ_API_KEY` | Yes | Content generation and resume parsing |
| `GROQ_MODEL` | No | Primary model; defaults to `qwen/qwen3.8-27b` |
| `GROQ_FALLBACK_MODEL` | No | Resume-fitting fallback; defaults to `openai/gpt-oss-120b` |
| `LATEX_COMPILER_URL` | PDFs; supplied by Compose | Compiler URL; Compose uses `http://latex-compiler:8080` |
| `LATEX_COMPILER_TOKEN` | PDFs; required by Compose | Shared app/worker/compiler token, at least 32 characters |
| `OCR_SERVICE_URL` | Scanned PDFs; supplied by Compose | OCR service URL; Compose uses `http://ocr:8080` |
| `OCR_SERVICE_TOKEN` | Scanned PDFs; required by Compose | Shared app/OCR service token, at least 32 characters |
| `OBJECT_STORAGE_URL` | Stored files; supplied by Compose | S3 endpoint for imported files and saved resume PDFs; Compose uses `http://seaweedfs:8333` |
| `OBJECT_STORAGE_ACCESS_KEY` / `OBJECT_STORAGE_SECRET_KEY` | Stored files; required by Compose | Credentials shared by the app, worker, and storage container; the secret needs at least 32 characters |
| `OBJECT_STORAGE_BUCKET` / `OBJECT_STORAGE_REGION` | No | Bucket and signing region; default to `job-assistant` and `us-east-1` |
| `RESEND_API_KEY` | No | Password reset email delivery; without it, email content is written to the server log |
| `RESEND_FROM_EMAIL` | No | Sender for Resend; defaults to `noreply@example.com` |
| `NODE_ENV` | No | Defaults to `development`; runtime containers use `production` |
| `LOG_LEVEL` | No | Minimum level the app, worker, and migrator log (`debug`, `info`, `warn`, `error`); defaults to `info` |
| `PORT` | No | App port outside Compose; set in the process environment, not `.env`; defaults to `3000` |
| `APP_PORT` | No | Compose host port published on loopback; defaults to `3000` |

Qwen requests use non-thinking mode and cap explicit output budgets at 16,384 tokens. Resume fitting tries the fallback model if the primary fails. Model override changes require restarting the app and worker.

Resume import reads text-based PDFs and DOCX files inside the app, including link targets and DOCX page headers. A PDF without a usable text layer is sent to the [OCR service](services/ocr/README.md); if that service is not configured, the import asks for a text-based file instead. Legacy `.doc` files are not supported.

Imported files and saved resume PDFs are written to object storage. The Compose stack runs [SeaweedFS](https://github.com/seaweedfs/seaweedfs) for this; any store that speaks the S3 API with path-style addresses works if you point `OBJECT_STORAGE_URL` at it and create the bucket. Without these settings the app still runs: an import reads the file without keeping it, and a saved generated resume is compiled each time it is opened. If storage is configured but unreachable, imports and saves still succeed: the import warns that the original was not kept, and a resume saved without a PDF retries storage when it is opened. See the [deployment guide](docs/deployment.md#backups-and-restore) for missing-file recovery.

## Commands

| Command | Purpose |
| --- | --- |
| `pnpm run dev` | Start the Turbopack development server |
| `pnpm run build` / `pnpm run start` | Run lint and the production build; serve the build. `next start` warns about the standalone output, which the containers run as `.next/standalone/server.js` |
| `pnpm run lint` / `pnpm run lint:fix` | Run strict ESLint checks; optionally apply automatic fixes |
| `pnpm run format` / `pnpm run format:check` | Format files with Prettier; check formatting without writing |
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

- [Testing and quality checks](docs/testing.md): lint, type checking, unit/integration/browser tests, and CI.
- [Self-hosted deployment](docs/deployment.md): Docker Compose, Cloudflare Tunnel, Jenkins deployment, queue operation, updates, and backups.
- [Resume compiler](services/latex-compiler/README.md): compiler setup, protocol, resource limits, and compatibility.
- [OCR service](services/ocr/README.md): scanned-PDF reading, protocol, resource limits, and models.
- [Contributor guidelines](AGENTS.md): stack, module layout, and the checks to run before finishing a change.

## License

No license file is included. Contact the maintainers before reusing or distributing this code.
