# Browser tests

For lint, type checking, unit tests, PostgreSQL integration tests, and CI coverage,
see the [testing guide](../../docs/testing.md).

The Playwright suite uses desktop Chromium, the production standalone Next.js
application, PostgreSQL 18 in Testcontainers, the real LaTeX compiler image, and
the SeaweedFS image named in `docker-compose.yml`.
Docker must be running. Node.js 24, pnpm, and the Docker CLI are required; there
is no need to start Compose, configure a development database, or supply AI keys.

```sh
pnpm install
pnpm exec playwright install --with-deps chromium
pnpm run test:e2e
pnpm run test:e2e:ui
```

The first run builds the compiler's TeX/font packages. Later runs use Docker's
build cache. To use an image already built from the current compiler sources,
set `E2E_LATEX_IMAGE` to its local tag; the harness then skips the image build.
CI builds this image using the GitHub Actions BuildKit cache and also runs the
compiler's unit tests inside it.

The app runs at `http://127.0.0.1:3100`; the port must be free. Test-only
`E2E_TEST=1` selects `.next-e2e` build output, keeping `.next` separate. Setup
applies committed migrations to a fresh database ending in `_test`, overrides
runtime credentials with synthetic values, and waits for healthy services.
Each test gets a fresh BetterAuth account, seeded profile and application data,
and browser context. Authentication tests also exercise the actual UI.

Resume tests use manual content selection and a small one-page profile. Both the
application and generation worker reject external fetches outside their local
app/compiler/storage origins. Unexpected AI fitting therefore fails the test
instead of calling Groq. The imported-file test sends a real upload, so its
details come from the basic extraction that import falls back to without a
provider. Stored files are written to and read from the real storage
container, which is the only check of request signing against SeaweedFS. PDF checks use `pdfinfo` and `pdftotext` in the compiler container.
The queued-job test starts the real worker only after navigation, avoiding
timing-dependent sleeps. Workers stop before candidate cleanup; the app and
disposable containers stop at suite teardown, including setup failures.

Browser files use `.e2e.ts`, which Playwright explicitly discovers and Vitest's test
runner does not. To run a subset or disable CI retries:

```sh
pnpm run test:e2e tests/e2e/profile.e2e.ts
pnpm run test:e2e --retries=0
pnpm exec playwright show-report artifacts/e2e/report
```

Browser reports, screenshots, retained failure traces, downloaded PDFs, per-test
worker logs, and setup/application/compiler/storage/database logs live under
`artifacts/e2e`. CI uploads these for seven days. Build output and artifacts are
ignored by Git, ESLint, and the main TypeScript file discovery. Core workflows
and real generation are covered; live AI, OCR, email delivery, mobile layouts,
and other browser engines are deferred.
