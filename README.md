# Job Application Assistant

Job Application Assistant helps candidates maintain a professional profile, track applications, and generate resumes, cover letters, and outreach messages.

## Features

- Email/password authentication, password reset (which signs out every existing session), and a protected dashboard.
- Profile management for personal details, work experience, education, skills, projects, certifications, achievements, and references.
- Resume import from PDF, DOCX, or TXT with structured parsing. Text is read directly from the file, and scanned PDFs go through a local OCR service. Imported details and suggested entries can be reviewed before saving; failed structured parsing falls back to basic text extraction. When storage succeeds, originals are available for download or deletion, normally keeping the ten most recent. Failed cleanup leaves older files listed until a later import retries it.
- A resume library with editing, default resume selection, PDF previews, and downloads. Generated resumes store a versioned document snapshot that can be compiled again without rerunning AI; legacy manual and HTML records remain readable. When storage succeeds, saved tailored resumes reuse the generated PDF instead of compiling it again.
- Profile-based and job-specific resume generation with manual content selection or Groq-assisted tailoring, using the A4 `professional` LaTeX template. Both flows support a one- or two-page target with up to three AI fitting revisions while keeping fonts and margins fixed. An unmet target returns the best compiled draft with a warning.
- Background resume generation that continues after navigation and restores the latest job on return. Preview remains a draft; Save and download PDF saves an application resume when the job completes, even if the browser closes. Temporary job results expire after seven days.
- AI cover letters and conversation starters based on saved profile and resume data.
- A local Chrome/Edge extension that fills the selected job application from the saved profile, steps through supported forms and attaches a tailored or default resume. It pauses for applicant-only answers and leaves final submission to the user.
- Drafted answers to an application's questions: paste a page of the form, optionally pick the saved job, and copy each answer into the form yourself. Answers come only from the saved profile; demographic, eligibility, salary and consent questions are flagged for you to answer.
- Application tracking with status, notes, job descriptions, and recruiter information, plus dashboard counts, offer rate, and recent activity.

## Stack

- Next.js 16 App Router, React 19 with React Compiler, and TypeScript 6.
- PostgreSQL with Drizzle ORM, BetterAuth, and Zod.
- Tailwind CSS v4, shadcn/ui, React Hook Form, TanStack Query, and Zustand.
- Vercel AI SDK 7 with Groq (and optionally an OpenRouter model for drafting application answers and extension form filling), a separate authenticated pdfLaTeX service, and a local OCR service running RapidOCR with PaddleOCR models on CPU.
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


### Local autofill extension

Build the extension, then open `chrome://extensions` (or `edge://extensions`), enable Developer mode, choose **Load unpacked**, and select the repository's `extension/` directory:

```sh
pnpm run extension:build
```

Sign in to the web app in the same browser profile. Open a job application, click the extension toolbar button, and enter the web app's address once. The extension reuses that browser session and stores only the address. It has no separate sign-in and does not copy passwords or session cookies. When the app session expires, sign in on the website and reopen the panel. If the website is already signed in but the panel cannot authenticate, check whether browser cookie/privacy settings or an administrator policy block access to the configured app. The answer-drafting page remains available when extension access is unavailable.

Choose the form document in the side panel before **Fill this application**, even when there is only one choice. Each choice shows its origin, heading and sample fields. Use **Rescan forms** if an embedded application loads later. The selection stays fixed; changing the page or selected frame to another origin requires confirmation. The extension requests access to all sites because both the self-hosted app address and embedded application hosts vary. Page scripts run for a user-started operation; forms it cannot inspect require manual completion.

Supported controls include ordinary fields, React-controlled inputs, lists, expandable sections and repeated-entry dialogs. Recognized repeated sections that start empty can be filled automatically. Pre-existing saved entries and sections whose progress cannot be reliably counted are handed to you to avoid duplicates. Signing in to an employer's website, verification, demographic/eligibility/salary questions, references, consents and final submission remain yours. **Stop filling** cancels pending actions and leaves completed changes in place; each Start/Continue allows at most 40 steps. Rebuild and reload the extension after source updates.

The browser runs on the user's computer; no browser-hosting service is used. Answer generation still uses the app's existing OpenRouter configuration, or Groq when OpenRouter is not configured. Every planning step can send the saved profile (without references), saved job context, bounded form metadata and synthetic progress to that provider. Raw page bodies, saved-entry text and user-written field values are excluded from context; known current free-text values are redacted from metadata. This is data minimization, not a guarantee against a hostile website inventing labels containing sensitive text. AI calls can still incur charges or exceed a free provider limit; failed calls are not automatically retried. The copy-and-paste answer drafter is the fallback for unsupported forms.

## Configuration

The app and worker validate their runtime environment through `src/lib/env.ts`. Missing or invalid required values prevent startup. The migration command validates only `DATABASE_URL`.

| Variable | Required | Purpose/default |
| --- | --- | --- |
| `BETTER_AUTH_SECRET` | Yes | Authentication secret, at least 32 characters |
| `BETTER_AUTH_URL` | Yes | Canonical authentication origin; use the public HTTPS origin in production |
| `DISABLE_SIGNUP` | No | Set to `true` to close registration; existing accounts keep working. Defaults to `false` |
| `DATABASE_URL` | Host processes | PostgreSQL connection URL for local app/worker and database tooling |
| `POSTGRES_PASSWORD` | Compose | Database password; Compose builds its internal connection URL from database fields |
| `POSTGRES_USER` / `POSTGRES_DB` | No | Compose user/database names; both default to `job_assistant` |
| `GROQ_API_KEY` | Yes | Content generation and resume parsing |
| `GROQ_MODEL` | No | Primary model; defaults to `qwen/qwen3.8-27b` |
| `GROQ_FALLBACK_MODEL` | No | Resume-fitting fallback; defaults to `openai/gpt-oss-120b` |
| `OPENROUTER_API_KEY` | No | OpenRouter key for answer drafting and extension form filling; set together with `OPENROUTER_TIER_3_MODEL` |
| `OPENROUTER_TIER_3_MODEL` | No | OpenRouter model ID behind the tier-3 codename, which drafts answers and plans extension form filling, such as `openai/gpt-6-luna`. Set both or neither; without them, both features use `GROQ_MODEL` |
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

Drafting answers to application questions sends the whole profile (without references) and the saved job in one request, which can be more than Groq's free tier allows per minute for the default model. With `OPENROUTER_API_KEY` and `OPENROUTER_TIER_3_MODEL` set, that request goes to the OpenRouter model at low reasoning effort instead; OpenRouter may route it to the model's maker or to the cloud providers that also serve it. Without them, use a paid Groq tier or a `GROQ_MODEL` with a higher limit. The page shows the provider's limit or out-of-credits error when one is reached.

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
| `pnpm run extension:build` | Build the unpacked Chrome/Edge extension |
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
