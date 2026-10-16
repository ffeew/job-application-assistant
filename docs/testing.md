# Testing and quality checks

Use Node.js 24 and the pnpm version pinned in `package.json`. See [local setup](../README.md#local-setup) for installation. Ordinary tests use synthetic fixtures and do not require a database or provider credentials.

## Required checks

Run these commands from the repository root before completing changes or opening a pull request:

```sh
pnpm run format:check
pnpm run lint
pnpm run typecheck
pnpm run test
```

Prettier owns formatting with its default options; `pnpm run format` rewrites files in place. Markdown, generated migrations, and the lockfile are excluded in `.prettierignore`.

ESLint treats errors and warnings as failures. Its configuration includes Next.js/React Compiler checks, TypeScript ESLint's strict type-aware preset, TanStack Query, and JSX accessibility rules. TypeScript ESLint is pinned because preset changes can alter the gate; review its rules when upgrading. `pnpm run lint:fix` applies automatic fixes and reports remaining findings.

Type checking generates Next.js route types before running `tsc --noEmit`. Generated route files and `next-env.d.ts` should not be edited. TypeScript enables `noUncheckedIndexedAccess`, so array and dictionary lookups must handle missing entries. `pnpm run build` runs the lint gate before the production Next.js build and its type checks.

## Unit and service tests

Vitest runs on Node.js and discovers `*.test.ts(x)` files in `src`, tests in `scripts`, `services` and `extension`, and the opt-in PostgreSQL suite. Import test APIs explicitly from `vitest`. Add focused tests for changes to regression-prone transforms, validation, resume fitting, or generation helpers, using sanitized candidate fixtures.

Pass a path to run a subset:

```sh
pnpm run test src/lib/resume-fitting.test.ts
pnpm run test services/latex-compiler
```

Compiler protocol and diagnostic tests run without TeX. Real compilation tests run when local `newtxtext` and Poppler are available and skip otherwise. They cover page counts, overflow, accents, links, literal TeX, and unsupported characters. The [browser suite](#browser-tests) uses the actual compiler Docker image to verify PDF generation without installing TeX on the host.

Resume import tests build synthetic PDF and DOCX files in memory and cover file-type detection, text and link extraction, the scanned-PDF fallback, and the reading order rebuilt from OCR line positions. The OCR client and the object storage client are tested against a stubbed `fetch`. The OCR service itself is Python and outside Vitest; its image build runs an offline [smoke test](../services/ocr/README.md#tests) that must read a generated image-only PDF.

## PostgreSQL integration tests

Integration tests require `RUN_DB_INTEGRATION=1`, a dedicated disposable database whose name ends in `_test`, and synthetic service credentials. They apply committed migrations twice and test authentication compatibility, CRUD/types/cascades, endpoint ownership, job claims and recovery, stale completion, save intent, failure handling, PDF retrieval, stored PDFs and imported files, autofill's application ownership and resume choice, and retention. Generation and compilation are mocked, and object storage is replaced by an in-memory map whose operations can be made to fail, so no storage server is needed; live AI, OCR, and email delivery are not exercised.

For an isolated local database, start PostgreSQL 18 on loopback port 5433. The port and container name must be available:

```sh
docker run --detach --rm --name job-assistant-integration-db \
  -p 127.0.0.1:5433:5432 \
  -e POSTGRES_USER=test -e POSTGRES_PASSWORD=test \
  -e POSTGRES_DB=job_assistant_test postgres:18-bookworm

until docker exec job-assistant-integration-db pg_isready -U test -d job_assistant_test; do
  sleep 1
done

NODE_ENV=test RUN_DB_INTEGRATION=1 \
DATABASE_URL=postgresql://test:test@localhost:5433/job_assistant_test \
BETTER_AUTH_SECRET=test-only-secret-at-least-thirty-two-characters \
BETTER_AUTH_URL=http://localhost:3000 GROQ_API_KEY=test-only \
RESEND_API_KEY= RESEND_FROM_EMAIL= pnpm run test:integration

docker stop job-assistant-integration-db
```

Stop the container after testing even if the test command fails. The `--rm` container and its disposable database are removed when it stops. For another dedicated test database, adjust `DATABASE_URL` while retaining the `_test` suffix. Ordinary `pnpm run test` skips integration unless the opt-in environment variable is set.

## Browser tests

The Playwright suite uses desktop Chromium, the production standalone Next.js application, PostgreSQL 18 in Testcontainers, the real LaTeX compiler image, and the SeaweedFS image named in `docker-compose.yml`. Docker must be running and its CLI available. The harness supplies isolated services and synthetic credentials, so development services and provider keys are not required.

```sh
pnpm install
pnpm exec playwright install --with-deps chromium
pnpm run test:e2e
pnpm run test:e2e:ui
```

The first run builds the compiler's TeX/font packages; later runs use Docker's build cache. To reuse an image built from the current compiler sources, set `E2E_LATEX_IMAGE` to its local tag; the harness then skips that build.

The app runs at `http://127.0.0.1:3100`; the port must be free. Test-only `E2E_TEST=1` selects `.next-e2e` build output, keeping `.next` separate. Setup applies committed migrations to a fresh database ending in `_test`, overrides runtime credentials with synthetic values, and waits for healthy services. Each test gets a fresh BetterAuth account, seeded profile and application data, and browser context. Authentication tests also exercise the actual UI.

The autofill test (`tests/e2e/autofill.e2e.ts`) builds the extension, loads it unpacked into Playwright's Chromium, and serves a fixture form from `127.0.0.1` with an iframe from `localhost`, so the frame is cross-origin. It runs the page script through `chrome.scripting` in the extension's isolated world and checks label extraction, hidden and `aria-hidden` inputs, coded select values, a select refilled by another field, native and ARIA radios, same-named radios in two forms, a lone checkbox and a checkbox group with a self-describe box, a `maxlength` overflow, a hidden file input outlined through its label, a React controlled input, a Radix Select (filled twice), search comboboxes that filter after a delay or ignore a click, and the iframe field.

It then drives the real side panel (`panel.html`, opened for the fixture tab) through whole runs. The fixture server stands in for the app: it checks each step request against the route's schema, answers with a scripted model from `tests/e2e/support/autofill-agent.ts` passed through the route's `finalizeFills`, and records what was sent. The runs cover a Workday-style wizard (repeaters, a collapsed section, a nested list, a slow Next and a review page whose Submit is never offered or clicked), a form embedded from another origin with a follow-up an answer reveals, beside a chat frame and a nav "Next" that are never sent, a form that loads a new page and saves an entry from a dialog, answers and a verification code typed by the applicant that are kept and never sent, a double-clicked Continue, a required field that can't be filled, Stop during a slow step, a click that changes nothing, and a "Next" that turns into "Submit" before the click. The model itself is not exercised; the click and answer rules are unit-tested in `src/app/api/autofill/policy.test.ts` and `fills.test.ts`.

Resume tests use manual content selection and a small one-page profile. The app and worker reject fetches outside their local app/compiler/storage origins to prevent live provider calls. Completed generation tests require zero fitting revisions and warnings, so an unexpected AI fitting attempt fails their assertions even when generation falls back to a draft. The imported-file test sends a real upload and checks the basic extraction used when structured parsing fails. Stored files use the real storage container, providing the suite's check of request signing against SeaweedFS. PDF checks use `pdfinfo` and `pdftotext` in the compiler container.

The queued-job test starts the real worker only after navigation, avoiding timing-dependent sleeps. Workers stop before candidate cleanup; the app and disposable containers stop at suite teardown, including setup failures.

Playwright discovers `.e2e.ts` files, which Vitest does not. To run a subset, disable CI retries, or open the report:

```sh
pnpm run test:e2e tests/e2e/profile.e2e.ts
pnpm run test:e2e --retries=0
pnpm exec playwright show-report artifacts/e2e/report
```

Reports, screenshots, retained failure traces, downloaded PDFs, per-test worker logs, and setup/application/compiler/storage/database logs live under `artifacts/e2e`. Build output and artifacts are ignored by Git, ESLint, and normal TypeScript source discovery. Core workflows and real generation are covered; live AI, OCR, email delivery, mobile layouts, and other browser engines are deferred.

## CI

[GitHub Actions](../.github/workflows/ci.yml) runs on pull requests targeting `main`, pushes to `main`, and workflow dispatch. The Node.js jobs use `.nvmrc` and frozen pnpm installs. The code-quality job runs the four required checks; separate jobs run PostgreSQL integration tests with synthetic credentials, Chromium browser tests, and a Compose smoke test.

The browser job uses the GitHub Actions BuildKit cache for the compiler image, runs compiler tests inside that image with `REQUIRE_TEX=1` so real compilation tests fail instead of skipping, and uploads browser reports and service logs for seven days. The smoke job builds all project images, including the OCR image and its smoke test, starts `docker-compose.yml` with synthetic credentials, and waits for each health check. Actions are pinned to commit SHAs, which Dependabot updates monthly.

Document relevant manual QA with the change. Public deployment checks, including live provider behavior and backup restoration, are covered in the [deployment guide](deployment.md#deployment-verification).
