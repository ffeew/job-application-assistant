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

Vitest runs on Node.js and discovers `*.test.ts(x)` files in `src` and `extension`, tests in `scripts` and `services`, and the opt-in PostgreSQL suite. Import test APIs explicitly from `vitest`. Add focused tests for changes to regression-prone transforms, validation, resume fitting, or generation helpers, using sanitized candidate fixtures.

Pass a path to run a subset:

```sh
pnpm run test src/lib/resume-fitting.test.ts
pnpm run test services/latex-compiler
```

Compiler protocol and diagnostic tests run without TeX. Real compilation tests run when local `newtxtext` and Poppler are available and skip otherwise. They cover page counts, overflow, accents, links, literal TeX, and unsupported characters. The [browser suite](#browser-tests) uses the actual compiler Docker image to verify PDF generation without installing TeX on the host.

Resume import tests build synthetic PDF and DOCX files in memory and cover file-type detection, text and link extraction, the scanned-PDF fallback, and the reading order rebuilt from OCR line positions. The OCR client and the object storage client are tested against a stubbed `fetch`. The OCR service itself is Python and outside Vitest; its image build runs an offline [smoke test](../services/ocr/README.md#tests) that must read a generated image-only PDF.

## PostgreSQL integration tests

Integration tests require `RUN_DB_INTEGRATION=1`, a dedicated disposable database whose name ends in `_test`, and synthetic service credentials. They apply committed migrations twice and test authentication compatibility, CRUD/types/cascades, endpoint ownership, job claims and recovery, stale completion, save intent, failure handling, PDF retrieval, stored PDFs and imported files, answer drafting/autofill application and resume ownership, and retention. Generation and compilation are mocked, and object storage is replaced by an in-memory map whose operations can be made to fail, so no storage server is needed; live AI, OCR, and email delivery are not exercised.

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

The app runs at `http://127.0.0.1:3100` and the fake AI provider at `127.0.0.1:3101`. Tests that need registration closed start a second app from the same build with `DISABLE_SIGNUP=true` at `http://127.0.0.1:3102`, which stops with the test worker that started it. All three ports must be free. Test-only `E2E_TEST=1` selects `.next-e2e` build output, keeping `.next` separate. Setup applies committed migrations to a fresh database ending in `_test`, overrides runtime credentials with synthetic values, and waits for healthy services. Each test gets a fresh BetterAuth account, seeded profile and application data, and browser context. The browser runs in the `en-US` locale and the UTC time zone, and so do the test workers.

The developer's `.env` does not reach the stack: setup deletes the copy Next places in the standalone output, and the worker's `dotenv/config` reads an empty file. Without that, a local OCR or OpenRouter key would make local runs behave unlike CI.

### Coverage and conventions

There is one spec per area (landing, auth, password reset, session, dashboard, applications and their API, profile sections and import, resumes, generation and its jobs, tailored resumes, cover letters, conversation starters, application answers, navigation state, and outages). Each user flow is a `test.describe` tagged with its flow id, such as `@CL-4` or `@create-application`, so `pnpm run test:e2e --grep @CL-4` runs one flow. Each flow tests its happy path first and then its unhappy paths: client and server validation, other accounts' records, missing records, signed-out and revoked sessions, server errors, dropped connections, pending states, rate limits, and provider failures.

Shared helpers are in `tests/e2e/support/helpers.ts`:

- `hold` keeps a request pending until released, for pending states and single-submit checks;
- `recordRequests` proves a form sent nothing;
- `anonymousRequest` gives an API client with no session (a plain `playwright.request.newContext()` inherits the test's session);
- `MALFORMED_JSON` sends a body that is not JSON;
- `errorBody` validates an API error response;
- `call` and `responseTo` match a request by method and path, and `isValid` reads the browser's own field validity;
- `openSection`, `sheet`, `entry`, `openEdit`, `confirmDelete` and `failWrites` drive a profile section, with `sectionButton` and `listGet` for its index and list requests;
- `importReply` scripts the model's reply to a resume import, and `importResume` sends a file through the profile's Import resume button;
- `revokeSessions`, `resetToken` and `seedGeneratedResume` cover session revocation, reading a reset token and seeding a saved resume.

While a dialog is open or closing, the rest of the page is hidden from role queries, so a test waits for the dialog to close before asserting what is behind it. Toasts sit over the bottom-right corner, and hovering one pauses its timer, so a test that clicks something a toast covers moves the mouse away and waits for the toast to close first.

A test for a known bug asserts the intended behaviour. It first proves it reached the defect, for example by checking a response status. It then calls `expectedFail("<file:line>: <cause>")`, and only after that asserts what should happen. Playwright reports these tests as expected failures. Once the bug is fixed, the test fails as "expected to fail, but passed", and its `expectedFail` call is removed. A failure before the call, or on a CI retry, fails the run as usual. A bug becomes expected-fail only after a run has shown the wrong behaviour.

### AI provider

The app and worker reject fetches outside their local app, compiler and storage origins, except Groq, which the fetch guard forwards to a fake OpenAI-compatible provider started by the test worker. A test scripts replies through the `ai` fixture: `ai.reply(completion(text))` for a reply and `ai.reply(providerError(status))` for a failure, optionally matched against the request. `ai.requests()` returns what the app sent, and `userPrompt()` reads the prompt from one. Unscripted calls get a non-retryable 400, which looks to the app like the provider being unavailable. Replies are sent with `retry-after-ms: 0`, so SDK retries are instant. A test fails if a reply it scripted was never requested. This covers cover letters, conversation starters, answer drafting with its flags and error mapping, structured resume import, AI content selection, and AI fitting, all through the real routes and worker. OpenRouter drafting is not tested, because the suite never sets its keys.

### Generation, storage and outages

Resume tests use a small one-page profile. Completed generation tests require zero fitting revisions and warnings, so an unexpected AI fitting attempt fails their assertions even when generation falls back to a draft; the AI fitting test overfills the page on purpose and scripts one revision. Stored files use the real storage container, providing the suite's check of request signing against SeaweedFS. PDF checks use `pdfinfo` and `pdftotext` in the compiler container.

Generation jobs stay queued until a test calls `worker.start()`, which avoids timing-dependent sleeps. The worker processes any account's queued jobs, so tests run serially. Workers stop before candidate cleanup; the app and disposable containers stop at suite teardown, including setup failures.

Outage tests use the `outage` fixture to `docker pause` the storage or compiler container for one test; fixture teardown unpauses it even after a timeout, and each worker unpauses both containers when it starts and stops. Their assertions wait past the storage (15 s) and compiler (25 s) deadlines.

### Running a subset

Playwright discovers `.e2e.ts` files, which Vitest does not. Every run builds the app, and the build runs ESLint, so a lint error in any spec stops the whole run. To run a subset, disable CI retries, or open the report:

```sh
pnpm run test:e2e tests/e2e/profile.e2e.ts
pnpm run test:e2e --grep @CL-4
pnpm run test:e2e --retries=0
pnpm exec playwright show-report artifacts/e2e/report
```

Reports, screenshots, retained failure traces, downloaded PDFs, per-test worker logs, and setup/application/compiler/storage/database logs live under `artifacts/e2e`. Build output and artifacts are ignored by Git, ESLint, and normal TypeScript source discovery.

Not covered: OpenRouter drafting, the health check's database-down answer, an unconfigured compiler, OCR, password-protected PDFs, the 45 and 90 second AI timeouts, the names of downloaded files (the app revokes the download's object URL at once, so Chromium sometimes names the file by its id), real email delivery, live AI providers, and other browser engines.

## CI

[GitHub Actions](../.github/workflows/ci.yml) runs on pull requests targeting `main`, pushes to `main`, and workflow dispatch. The Node.js jobs use `.nvmrc` and frozen pnpm installs. The code-quality job runs the four required checks; separate jobs run PostgreSQL integration tests with synthetic credentials, Chromium browser tests, and a Compose smoke test.

The browser job runs as four shards (`--shard=N/4`), each with its own stack. Tests are split per test, so shards stay similar in length. Each shard uses the GitHub Actions BuildKit cache for the compiler image; only shard 1 writes it back and runs the compiler tests inside that image with `REQUIRE_TEX=1`, so real compilation tests fail instead of skipping. A shard stops after 25 failures or 20 minutes, still writing its report, and uploads browser reports and service logs as `e2e-results-N` for seven days. To reproduce a shard locally, pass the same `--shard` option to `pnpm run test:e2e`. The smoke job builds all project images, including the OCR image and its smoke test, starts `docker-compose.yml` with synthetic credentials, and waits for each health check. Actions are pinned to commit SHAs, which Dependabot updates monthly.

Document relevant manual QA with the change. Public deployment checks, including live provider behavior and backup restoration, are covered in the [deployment guide](deployment.md#deployment-verification).

### Local autofill extension

```sh
pnpm run extension:build
pnpm run test:e2e --grep @autofill
```

The extension tests load the real unpacked extension in a fresh persistent context using Playwright's bundled Chromium. Each test has isolated browser state, including under CI sharding. Fixture forms cover controlled fields, multi-page navigation, explicit iframe selection, late frames and origin changes, repeaters and saved dialogs, privacy filtering, stale fields, final-submit prevention, PDF authentication failures and cancellation during delayed option selection.

A separate session suite signs in through the actual website, then calls the real autofill route from the extension using the same cookie session. It verifies application ownership, session revocation and re-login recovery with the existing fake Groq provider. The session suite also opens the native side panel through Chrome’s API and checks its authenticated requests directly. A cookie-policy scenario records whether a browser profile configured to block third-party cookies can forward its session in that native panel; blocked access must give actionable guidance and make no model request. Managed browser policies and live ATS sites still require environment-specific checks. These fixtures do not establish support for every external form, and tests make no paid AI calls.
