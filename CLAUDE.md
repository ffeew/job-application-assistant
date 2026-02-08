# CLAUDE.md

## Development Commands

- `bun run dev` - Start development server (Turbopack)
- `bun run build` - Build for production
- `bun run lint` - Check for ESLint errors
- `bun run typecheck` - Verify TypeScript types

## Code Quality

**Before completing any task, run both `bun run lint` and `bun run typecheck`.**

- Fix all ESLint errors and warnings
- Fix all TypeScript errors
- Never use `any` type - use specific types, `unknown`, or generics
- Never commit while lint/typecheck fails

## Technology Stack

- **Framework**: Next.js 16 with App Router
- **Database**: Turso (SQLite) with Drizzle ORM
- **Authentication**: BetterAuth with email/password
- **Styling**: Tailwind CSS v4
- **State**: Zustand (shared state), React Query (server state)
- **Validation**: Zod v4
- **AI**: Vercel AI SDK with Groq
- **UI**: Shadcn UI, Lucide Icons, Sonner toasts
- **Runtime**: Bun

## AI Models

Use these Groq models for AI features:
1. `openai/gpt-oss-120b` (primary)
2. `moonshotai/kimi-k2-instruct` (fallback)

Requires `GROQ_API_KEY` environment variable.

## Project Structure

```
src/
├── app/
│   ├── api/                    # API routes with colocated validators
│   ├── dashboard/[feature]/    # Feature-based architecture
│   │   ├── queries/            # React Query fetch hooks
│   │   ├── mutations/          # React Query mutation hooks
│   │   ├── components/         # Feature-specific components
│   │   └── store/              # Zustand stores (if needed)
│   └── components/             # App-wide shared components
├── components/
│   ├── ui/                     # Shadcn UI primitives only
│   └── skeletons/              # Shared skeleton components
└── lib/
    ├── validators/             # Zod schemas
    ├── services/               # Business logic, database ops
    └── controllers/            # HTTP request handling
```

## Architecture Patterns

### Backend (3-layer)
1. **Validators** (`src/lib/validators/`) - Zod schemas for request/response
2. **Services** (`src/lib/services/`) - Business logic and database operations
3. **Controllers** (`src/lib/controllers/`) - Auth, validation, error handling
4. **Routes** (`src/app/api/`) - Thin layer delegating to controllers

### Frontend
- **Data fetching**: React Query hooks co-located with features
- **Forms**: React Hook Form + Zod validation via `zodResolver`
- **State**: Zustand for shared/workflow state, React Query for server state
- **Loading**: Skeleton components (never text-based "Loading...")

## Key Development Rules

- Use `@/*` path alias for imports from `src/`
- Use React Query hooks, never direct `fetch()` in components
- Use flexbox with `gap` utilities, not `space-*`
- Use skeleton components for all loading states
- Import validators from colocated API modules (e.g., `@/app/api/profile/validators`)
- Invalidate related caches in mutation `onSuccess` callbacks
- Use `unknown` type for form data, cast after Zod validation
- Environment variables validated in `src/lib/env.ts`
- Database connection requires `TURSO_CONNECTION_URL` and `TURSO_AUTH_TOKEN`
