# Repository Guidelines

## Architecture Constraints

See the [stack overview](README.md#stack) for technologies and versions.

- **Auth**: BetterAuth with proxy-backed dashboard session-cookie checks and API session validation (see `src/lib/auth.ts`, `src/proxy.ts`).
- **React Compiler & Forms**: Use `useWatch` for reactive form subscriptions. Pass `{ keepFieldsRef: true }` to `reset` when populating mounted inputs so memoized registration props remain valid.
- **AI**: Use `instructions` for system prompts and `getGroqGenerationOptions` for the configured model's provider options and output budget.
- **Documents**: Resume templates live in `src/lib/resume-templates/`. Preserve compatibility with saved document snapshots when changing templates or compiler dependencies; see the [compiler guide](services/latex-compiler/README.md#image-and-template-compatibility).
- **Stored files**: Go through `src/app/api/stored-files.ts`, never the client in `src/lib/object-storage.ts` directly. Storage is optional and must not fail the action it accompanies: a write that fails is logged and the import or save still succeeds. A delete the user asked for removes the file before the row (`removeFile`), so a failure is reported instead of leaving the file behind. Storage keys stay on the server.

## Module Organization

- `src/app`
  - Feature folders (e.g., `dashboard/resumes`) colocate page entries with supporting UI components, TanStack Query `queries/` & `mutations/`, and Zustand `store/` directories when needed.
  - API routes live under `src/app/api/<feature>/`: `route.ts` handles HTTP, services hold business logic, and `validators.ts` exports Zod schemas shared by client and server. Resume-generation request schemas also live in `api/profile/validators.ts`.
  - Authentication pages reside in `(auth)/`; dashboard routes are protected via `src/proxy.ts`.
- `src/components`: Shared presentation-only primitives (buttons, inputs, skeletons) built on shadcn/ui.
- `src/lib`: Environment validation, Drizzle setup, BetterAuth server configuration, resume templates, utilities, and validator re-exports. The BetterAuth browser client is in `src/app/utils/authClient.ts`.
- `scripts/`: Migration, generation-worker, runtime-bundling, and container entrypoints.
- `Jenkinsfile`: Deployment pipeline for an existing Jenkins controller; see the [deployment guide](docs/deployment.md#automated-deployment-with-jenkins).
- `services/latex-compiler/`: Authenticated PDF compiler and its container image.
- `services/ocr/`: Authenticated OCR service for scanned PDFs (Python, RapidOCR on CPU) and its container image. Keep it a thin wrapper; reading-order and other testable logic stays in TypeScript.
- File storage has no service directory: Compose runs the upstream SeaweedFS image, pinned in `docker-compose.yml`, and the browser tests read that tag.
- `tests/`: PostgreSQL integration tests and the Playwright browser harness; focused unit tests are colocated with their modules.
- `migrations/`: Generated SQL files—commit alongside schema adjustments.
- `public/`, `components.json`, config roots (`drizzle.config.ts`, `tsconfig.json`, etc.) hold assets and tool configuration.

## Development

Follow the [local quickstart](README.md#local-setup) and [script reference](README.md#commands). Keep `pnpm-lock.yaml` checked in.

## Quality Requirements

1. Run the [required checks](docs/testing.md#required-checks) after changes; fix all errors and warnings. Follow that guide for test selection, fixture isolation, and CI coverage.
2. Avoid disabling ESLint rules unless absolutely necessary—explain with comments if you must.
3. Prefer explicit types; **never** reach for `any`. Use `unknown`, generics, or schema-derived types.
4. Keep code paths defensive—handle API errors, loading states, and empty data gracefully.
5. When touching AI features, ensure clear fallbacks if model calls fail.
6. Use `withAsyncHandler` for promise-returning React events and `runAsyncAction` for rejectable background work. Explicit `void` is appropriate for default TanStack Query invalidations/refetches, whose errors are handled by the library. Do not ignore promises that can reject without an error handler.
7. Treat JSON as `unknown` until Zod validation. Client hooks use `parseJsonResponse` and feature transport schemas with string timestamps; server/domain schemas keep `Date`. `parseJsonResponse` throws `ApiError`; use `throw await readApiError(...)` for error responses from text/PDF endpoints. `ApiError.status` decides whether a query is retried; mutations are never retried automatically. Route handlers use `routeErrorResponse`: expected `RequestError` failures preserve their status/message, invalid input returns 400, and unexpected failures are logged and return 500.
8. Server code logs through `logger` (`src/lib/logger.ts`, pino): pass the caught value as `err` and identifiers as fields, as in `logger.error({ err: error, jobId }, "Generation job failed")`. `console` is lint-blocked outside the exceptions listed in `eslint.config.mjs`. Browser code reports a failure with a toast instead of logging it. `src/lib/env.ts` must not import the logger, because the proxy imports `env`. Better Auth logs through the same logger, tagged `component: "better-auth"` (`src/lib/auth.ts`).

## TypeScript & Coding Standards

- Lean on Zod schemas exported from `src/app/api/<feature>/validators` for runtime validation and type inference.
- Build request schemas with the bounded field helpers in `src/lib/validators/fields.ts`, including `documentText` for resume content and `jobDescriptionText` for job descriptions. `optionalMonth`/`optionalEmail`/`optionalUrl` turn a cleared input into `null`, and `httpUrl` accepts only web addresses. A record that links to an application or resume must check ownership with `src/app/api/linked-records.ts`.
- Forms should use React Hook Form with `zodResolver` (see existing dashboard profile forms for patterns). When a validated form value needs a type assertion, explain why the resolver makes the assertion safe.
- Components in PascalCase, hooks in camelCase, server actions suffixed with `Action`.
- Use 2-space indentation, semicolons, and double quotes. Respect Tailwind naming; prefer `@/` alias imports.
- Keep data fetching in feature Query and mutation hooks rather than calling `fetch` directly in components; invalidate related caches on mutation success.
- Use flexbox with `gap` utilities instead of `space-*`, and skeleton components for loading states.
- Keep comments that explain reasons, constraints, tradeoffs, compatibility, or non-obvious invariants. Remove comments that repeat names, narrate operations, or label obvious sections. Preserve tool directives, required annotations, and license notices.

## Design System

The interface is built on one idea: a job hunt is a filing job, so the app is a file drawer. Sections are manila folders with index tabs, documents are white sheets lying in them, and verdicts are rubber-stamped. The dark theme is the drawer at night. Tokens live in `src/app/globals.css`; use them rather than raw palette classes such as `bg-blue-50`.

- **Surfaces**: three depths only. The ink strip (`band`) is the drawer behind the folders: app and landing headers, the sign-in backdrop, the self-hosting section and the footer. It flips the content tokens to light-on-ink, so components inside need no variants; cards, pages, folders and tabs inside a band restore the normal tokens. The folder (`bg-background`, manila with a faint grain) is the ground, and forms and page headers sit directly on it; use the `folder` utility for a folder on the strip or a sticky bar. A sheet (`Card`) is white with a paper shadow and no border, for tables, lists and grouped settings. A page (`Paper`) is reserved for documents: resume previews and letters. Sheets cast a shadow; folders do not.
- **Tabs and stamps**: the two devices that carry the identity. A `FolderTab` says which folder is open: use it for sections that own the folder below (dashboard navigation, the landing demo's example listings, the sign-in folder), and plain links for everything else. Tabs are text labels with no icons; the sign-in tab carries the wordmark and its glyph. A `Stamp` states a verdict: `StatusMark` stamps an application's status (single frame while in progress, double once decided) and the resume preview stamps the page fit. Stamps sit on sheets or pages, never on the folder, because their inks are only checked against paper.
- **Colour**: ink for text; ballpoint blue (`primary`, `text-link`, `ring`) for actions, links and focus; kraft (`border-kraft`, `--border`) for folder edges and rules; red for rejected, over target and delete. Highlighter (`Highlight`, `bg-highlight`) means "matched to the job" and nothing else, and only appears on paper: it disappears on manila. Status colours are stamp inks and strip fills; each passes 4.5:1 as text on paper in both themes and was checked for colour-blind separation, so re-run both checks before changing them. Text on manila needs the darker cuts already in the tokens (`muted-foreground`, `destructive`).
- **Type**: Archivo for the tool, with the `title` utility (condensed, bold) for page titles and the wordmark. STIX Two Text (`font-document`) only inside documents. Big Shoulders Stencil (`font-stencil`) only inside stamps. Tool sizes stay on 12, 14, 16, 18, 21, 24, 36, 48, 60, 72 (`text-3xl` is unused); text on a `Paper` is sized as a document, off that scale.
- **Copy**: sentence case, no exclamation marks. Uppercase appears in stamps and in a resume page's section headings, as the LaTeX template sets them, and nowhere else. A button names its outcome and its toast repeats that name ("Save application", then "Application saved"). Errors say what happened and what to do next.
- **Shared pieces**: `PageHeader`, `EmptyState`, `FormSection` and `RowListSkeleton` in `src/app/dashboard/components`; `FolderTab`, `Stamp`, `Notice`, `ConfirmDeleteDialog` and `SegmentedControl` in `src/components/ui`; `section-parts.tsx` for profile sections; `ResumeWorkbench` for pages that pair settings with a page preview.
- **Motion**: only in response to an action: a stamp presses in when a verdict arrives. The one exception is the landing page, where the highlighter strokes draw and a single stamp lands after them. `prefers-reduced-motion` is honoured globally.

## AI Feature Notes

- Surface provider failures with human-friendly errors and preserve feature fallbacks. See the [configuration reference](README.md#configuration) for model settings.
- Keep prompts deterministic—low temperature (≈0.2–0.3) for resume content selection, slightly higher (≈0.6–0.7) for conversational outputs per existing services.
- Validate AI outputs against Zod schemas before using them; provide fallbacks to manual selection when parsing fails.
- Endpoints that call the model while a request waits pass through `limitAiRequest` (`src/app/api/ai-rate-limit.ts`) and give the call an `abortSignal` timeout. Background generation is capped per account in `enqueueGenerationJob`.

## Commit & PR Expectations

- Commit messages: short, present tense, <=72 chars (`Add conversation starter loader`).
- Bundle related changes; include generated migrations with the schema update that produced them.
- PR descriptions should call out context, solution, rollout/rollback considerations, manual QA, and screenshots/video for UI changes.

## Environment & Secrets

- Follow the [configuration reference](README.md#configuration) and [deployment guide](docs/deployment.md) for required and optional services.
- Never commit secrets. Mention new env vars in PRs.
- Never bake real secrets into container images.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
