# Local server deployment

The stack targets Linux x86-64 with Docker Engine and Compose v2. It runs the Next.js app, PostgreSQL 18, a one-shot migrator, a background generation worker, the LaTeX compiler, and the OCR service. Migrations initialize a fresh PostgreSQL database; they do not import historical Turso data.

For host development, follow [local setup](../README.md#local-setup). Configuration variables are listed in the [README](../README.md#configuration), and automated checks are covered in the [testing guide](testing.md).

## First deployment

1. Copy `.env.example` to `.env`. Set the Groq key and generate separate database, BetterAuth, compiler, and OCR secrets with `openssl rand -hex 32`.
2. Set `BETTER_AUTH_URL=https://your-public-hostname`. This is the canonical origin for authentication, secure cookies, password reset links, and dashboard redirects. The browser uses its current origin; there is no public auth URL to bake into the image.
3. Run `docker compose config --quiet`, then `docker compose up -d --build --wait`.
4. Point your existing host-installed Cloudflare tunnel's published hostname to **`http://127.0.0.1:3000`** (or the configured `APP_PORT`). Retain the public Host header and forwarded HTTPS information. Use the public HTTPS hostname for sign-up and sign-in.
5. Check `docker compose ps`, `docker compose logs migrate`, and `curl --fail http://127.0.0.1:3000/api/health`.

Only the app publishes a loopback port. PostgreSQL and the compiler stay on the Compose network. The [OCR service](../services/ocr/README.md) sits on its own internal network, reachable only from the app and without internet access. Keep Cloudflare caching rules from caching authenticated dashboard/API responses; the app's job responses use `Cache-Control: no-store`.

Compose constructs an internal PostgreSQL connection URL from `POSTGRES_USER`, `POSTGRES_PASSWORD`, and `POSTGRES_DB`, safely URL-encoding credentials. The `.env` `DATABASE_URL` is for host-side tools and local development. Keep its credentials synchronized and URL-encode special characters when editing it. A PostgreSQL named volume persists at `/var/lib/postgresql` for the version 18 image.

Migrations run after database readiness. The app and worker start after migration success and compiler readiness; the app also waits for the OCR service. A failed migration blocks their initial startup; inspect the migrator logs before retrying. A worker resumes queued jobs after process restarts and transient database failures.

Production builds use non-secret placeholders and do not connect to a live database or AI service. Real secrets are passed only to runtime containers, and runtime validation rejects missing/invalid configuration. The migrator requires only database settings. Optional Resend settings control password reset emails; without Resend, the server logs email content instead.

## Updates and rollback

Back up the database before updates. Generate and commit schema migrations during development with `pnpm run db:generate`; deploy committed migrations rather than using `db:push` against production.

```sh
docker compose build
# Stop both consumers before schema changes; the worker has 200 seconds to finish.
docker compose stop app worker
docker compose run --rm migrate
docker compose up -d --wait
```

Keep the preceding source revision/images. Rebuilding that revision is sufficient only when its schema is compatible with the migration. Otherwise stop the stack and restore the matching database backup before starting the older version. Changing PostgreSQL's major version requires an explicit upgrade/restore procedure; keep version 18 for this stack. `docker compose down` preserves data; adding `--volumes` deletes it.

When updating from a release that used Mistral OCR, add a generated `OCR_SERVICE_TOKEN` to `.env` before starting the stack; `MISTRAL_API_KEY` is no longer read. The first build produces an OCR image of about 500 MB.

Keep app and compiler releases compatible with saved document snapshots. See the [compiler guide](../services/latex-compiler/README.md#image-and-template-compatibility) for image and template compatibility requirements.

## Backups and restore

Save backups outside the repository and copy them to separate storage. The dump contains accounts, candidate information, resumes, and temporary job results.

```sh
docker compose exec -T db sh -c 'pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" -Fc' > /path/to/backup.dump
```

To restore a backup to the configured database, stop the app and worker first. Restore replaces the database's saved state:

```sh
docker compose stop app worker
docker compose exec -T db sh -c 'pg_restore -U "$POSTGRES_USER" -d "$POSTGRES_DB" --clean --if-exists --exit-on-error' < /path/to/backup.dump
docker compose up -d --wait
```

Test backups by restoring them into a separate empty database/container before relying on them.

## Background generation

The worker runs one job at a time. HTTP generation requests enqueue work and return **202 `{ jobId, status }`**. Poll `GET /api/resume-generation/jobs/{id}` every two seconds; statuses are `queued`, `running`, `completed`, and `failed`. Completed responses contain a validated generated-resume result. `GET /api/resume-generation/jobs/{id}/pdf` downloads the stored PDF without another AI call or compilation. Every job endpoint requires a session and enforces ownership.

`POST /api/resume-generation/jobs` accepts `{ kind: "profile" | "application", intent, request }`, with the generation request schema for that kind. Profile intents are `preview` and `download`; application jobs also allow `save-and-download`. Application requests include `applicationId`. `POST /api/resume-generation/preview`, `POST /api/resume-generation/pdf`, and `POST /api/applications/{id}/resume` also enqueue jobs and return 202. The application endpoint's GET reads application and saved-resume information; its PUT explicitly saves or updates a tailored resume.

`GET /api/resume-generation/jobs` restores the owner's latest profile job; provide `?applicationId=...` for an application's latest job. The generation screens restore inputs and completed results, show queue/running states, and permit retry after failure. Preview remains a draft, Download PDF downloads a profile resume, and Save and download PDF commits a tailored resume with job completion even when the browser closes. A restored result does not trigger another automatic download. Use the download and save actions to download or save the restored result.

Workers heartbeat claims every 30 seconds with five-minute leases. An interrupted job is retried once after its lease expires; an obsolete worker cannot overwrite the replacement. AI failures use model/draft fallbacks where available and otherwise produce a retryable job error. Generation runs in the worker with a 180-second overall deadline, independently of Cloudflare's HTTP timeout. Queued work survives restarts. Completed/failed job records and their PDFs expire after seven days, with hourly cleanup; saved library resumes remain.

Read `docker compose logs -f app worker latex-compiler ocr` for operational status. App health checks database readiness; worker health checks its processing heartbeat; compiler and OCR health check their HTTP services. A worker health failure is visible in `docker compose ps`; Docker's restart policy restarts exited processes, not merely unhealthy ones. A missing worker leaves jobs queued until it returns.

## Deployment verification

Run the [quality and integration checks](testing.md) before deploying. Keep `docker-compose.dev.yml` out of the production stack; it publishes PostgreSQL, the compiler, and the OCR service for host development.

Before using the public deployment, verify HTTPS sign-up/sign-in/reset links and dashboard redirects, profile/application CRUD, preview generation, leaving/reopening a running job, Save and download PDF, and saved-PDF downloads through the tunnel. Import a text-based PDF and a scanned PDF into a profile; the scan should populate fields and show the OCR warning. Confirm records survive container recreation and a backup restores into a separate test database. Live AI and email checks require your configured provider credentials.
