# Testing and quality checks

Use Node.js 24 and the pnpm version pinned in `package.json`. See [local setup](../README.md#local-setup) for installation. Ordinary tests use synthetic fixtures and do not require a database or provider credentials.

## Required checks

Run these commands from the repository root before completing changes or opening a pull request:

```sh
pnpm run lint
pnpm run typecheck
pnpm run test
```

ESLint treats errors and warnings as failures. Its configuration includes Next.js/React Compiler checks, TypeScript ESLint's strict type-aware preset, TanStack Query, and JSX accessibility rules. TypeScript ESLint is pinned because preset changes can alter the gate; review its rules when upgrading. `pnpm run lint:fix` applies automatic fixes and reports remaining findings.

Type checking generates Next.js route types before running `tsc --noEmit`. Generated route files and `next-env.d.ts` should not be edited. TypeScript enables `noUncheckedIndexedAccess`, so array and dictionary lookups must handle missing entries. `pnpm run build` runs the lint gate before the production Next.js build and its type checks.

## Unit and compiler tests

Vitest runs on Node.js and discovers `*.test.ts(x)` files in `src`, tests in `scripts` and `services`, and the opt-in PostgreSQL suite. Import test APIs explicitly from `vitest`. Add focused tests for changes to regression-prone transforms, validation, resume fitting, or generation helpers, using sanitized candidate fixtures.

Pass a path to run a subset:

```sh
pnpm run test src/lib/resume-fitting.test.ts
pnpm run test services/latex-compiler
```

Compiler protocol and diagnostic tests run without TeX. Real compilation tests run when local `newtxtext` and Poppler are available and skip otherwise. They cover page counts, overflow, accents, links, literal TeX, and unsupported characters. The [browser suite](../tests/e2e/README.md) uses the actual compiler Docker image to verify PDF generation without installing TeX on the host.

## PostgreSQL integration tests

Integration tests require `RUN_DB_INTEGRATION=1`, a dedicated disposable database whose name ends in `_test`, and synthetic service credentials. They apply committed migrations twice and test authentication compatibility, CRUD/types/cascades, endpoint ownership, job claims and recovery, stale completion, save intent, failure handling, PDF retrieval, and retention. Generation is mocked; live AI, OCR, and email delivery are not exercised.

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
BETTER_AUTH_URL=http://localhost:3000 GROQ_API_KEY=test-only MISTRAL_API_KEY=test-only \
RESEND_API_KEY= RESEND_FROM_EMAIL= pnpm run test:integration

docker stop job-assistant-integration-db
```

Stop the container after testing even if the test command fails. The `--rm` container and its disposable database are removed when it stops. For another dedicated test database, adjust `DATABASE_URL` while retaining the `_test` suffix. Ordinary `pnpm run test` skips integration unless the opt-in environment variable is set.

## Browser tests and CI

The [browser testing guide](../tests/e2e/README.md) covers Playwright commands, isolated PostgreSQL Testcontainers, production app builds, real compiler PDFs, UI mode, and failure artifacts. Docker and Chromium are required, but development services and provider keys are not.

[GitHub Actions](../.github/workflows/ci.yml) runs on pull requests targeting `main`, pushes to `main`, and workflow dispatch. All jobs use Node.js 24 and frozen pnpm installs. Separate jobs run the three required checks, the integration suite against PostgreSQL 18 with synthetic credentials, and Chromium browser tests. The browser job caches the compiler image build and uploads reports and service logs for seven days.

Document relevant manual QA with the change. Public deployment checks, including live provider behavior and backup restoration, are covered in the [deployment guide](deployment.md#deployment-verification).
