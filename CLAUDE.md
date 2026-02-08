# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

- **Start development server**: `bun run dev` (uses Turbopack for faster builds)
- **Build for production**: `bun run build`
- **Start production server**: `bun run start`
- **Lint code**: `bun run lint`
- **Type check**: `bun run typecheck`

## Code Quality Requirements

**CRITICAL**: After completing any coding task or making changes to the codebase, you MUST run both:

1. **`bun run lint`** - Check for ESLint errors and warnings
2. **`bun run typecheck`** - Verify TypeScript type correctness

### Quality Standards

- **All ESLint errors must be fixed** - No exceptions
- **All TypeScript errors must be resolved** - Ensure type safety
- **Address ESLint warnings** when possible (prefer fixing over disabling)
- **Use proper TypeScript types** - **NEVER use `any`**, always use specific interfaces/types, `unknown`, or proper generics

### Common Issues to Fix

- **Unused variables/imports** - Remove or prefix with underscore if intentionally unused
- **Missing dependencies in useEffect** - Add to dependency array or use ESLint disable comment
- **Unescaped entities** - Use `&apos;` for apostrophes in JSX
- **Type mismatches** - Ensure database types match TypeScript interfaces
- **Missing error handling** - Properly handle catch blocks and error states

### Before Task Completion

1. Run `bun run lint` and fix ALL errors and warnings
2. Run `bun run typecheck` and resolve ALL type errors
3. Test the changes work as expected
4. Only then consider the task complete

**Never** commit or mark a task as complete while linting or type checking fails.

## AI Model Configuration

When working with AI features in this application, use the following Groq models in order of preference:

1. **`openai/gpt-oss-120b`** - Primary model for cover letter generation and AI-powered resume optimization
2. **`moonshotai/kimi-k2-instruct`** - Secondary model if primary is unavailable

These models provide the best performance and quality for the application's AI-powered features including:

- **Job Description Analysis** - Extract requirements, skills, and keywords from job postings
- **Intelligent Content Selection** - Score and rank profile entries by relevance (0-100 scale)
- **Resume Optimization** - Select most relevant experiences, skills, and projects for specific jobs
- **Cover Letter Generation** - Create personalized cover letters based on job descriptions

## TypeScript Coding Standards

### Strict Type Safety

- **NEVER use `any` type** - Always use proper types, interfaces, or `unknown`
- **Use specific types** - Prefer `string | number` over `unknown` when possible
- **Leverage type inference** - Let TypeScript infer types when they're obvious
- **Use generics** - For reusable functions and components

### Proper Type Patterns

```typescript
// ✅ Good - Specific types
interface UserProfile {
	id: number;
	name: string;
	email: string | null;
}

// ✅ Good - Using unknown for dynamic data
function parseJson(data: string): unknown {
	return JSON.parse(data);
}

// ✅ Good - Proper generics
function apiCall<T>(endpoint: string): Promise<T> {
	return fetch(endpoint).then((res) => res.json());
}

// ❌ Bad - Using any
function handleData(data: any): any {
	return data.something;
}
```

### Database Type Conversion

- Use utility functions like `nullToUndefined()` to convert database `null` to TypeScript `undefined`
- Create proper interfaces that match database schema
- Use type assertions only when absolutely necessary with proper runtime checks

## CSS & Styling Guidelines

**This application uses Tailwind CSS v4 for styling.** Follow these guidelines for consistent, maintainable styling:

### Layout & Spacing Best Practices

**ALWAYS prefer Flexbox with `gap` utilities over `space-*` utilities:**

### Spacing Scale

Use consistent spacing values:

- `gap-2` (8px) - Tight spacing (label to input, icon to text)
- `gap-3` (12px) - Button groups, small component spacing
- `gap-4` (16px) - Default form fields, card spacing
- `gap-6` (24px) - Section spacing, page layout

## Project Architecture

This is a fully functional Next.js 15 application for a job application assistant that helps users create AI-powered cover letters, generate job-specific optimized resumes, and track applications with intelligent insights.

### Technology Stack

- **Framework**: Next.js 15 with App Router
- **Database**: Turso (SQLite) with Drizzle ORM
- **Authentication**: BetterAuth with email/password
- **Deployment**: Vercel
- **Styling**: Tailwind CSS v4
- **State Management**: Zustand
- **Data Fetching**: React Query (TanStack Query) with custom hooks
- **Validation**: Zod v4 (including environment variable validation)
- **AI Integration**: Vercel AI SDK with Groq for cover letters and intelligent resume optimization (preferred models: `openai/gpt-oss-120b`, `moonshotai/kimi-k2-instruct`)
- **Dark Mode Support**: Next-Themes
- **UI Library**: Shadcn UI
- **Icons**: Lucide Icons
- **Notifications**: Sonner toast notifications for user feedback
- **Package Manager**: Bun
- **Runtime**: Bun (TypeScript 5)

### Project Structure

This is a **feature-based architecture** where each feature is self-contained:

- **`src/app/dashboard/[feature]/`** - Each feature has its own `queries/`, `mutations/`, and `components/` directories (including feature-specific skeleton components)
- **`src/app/components/`** - App-wide shared components (layout, landing, providers)
- **`src/components/skeletons/`** - Shared skeleton components (used across 3+ features)
- **`src/components/ui/`** - Shadcn UI primitives only
- **`src/lib/`** - Backend layer (validators, services, controllers)
- **`src/lib/validators/`** - Zod schemas shared between frontend/backend
- **`src/lib/services/`** - Business logic and database operations
- **`src/lib/controllers/`** - HTTP request handling

### API Architecture

The application follows a clean 3-layer API architecture:

#### 1. **Validators** (`src/lib/validators/`)

- **Purpose**: Define and validate API input/output using Zod schemas
- **Type Safety**: Inferred types are shared between frontend and backend
- **Structure**: One validator file per domain (e.g., `applications.validator.ts`)
- **Contents**:
  - Request/response schemas
  - Query parameter validation
  - Shared TypeScript types

#### 2. **Services** (`src/lib/services/`)

- **Purpose**: Contains all business logic and database operations
- **Structure**: One service class per domain (e.g., `ApplicationsService`)
- **Responsibilities**:
  - Database queries and mutations
  - Business rule enforcement
  - Data transformation

#### 3. **Controllers** (`src/lib/controllers/`)

- **Purpose**: Handle HTTP requests and orchestrate services
- **Structure**: One controller class per domain (e.g., `ApplicationsController`)
- **Responsibilities**:
  - Authentication validation
  - Request/response validation using Zod schemas
  - Error handling
  - Service coordination

#### 4. **Routes** (`src/app/api/`)

- **Purpose**: Thin layer that delegates to controllers
- **Pattern**: Each route file imports the appropriate controller
- **Example**: `export async function GET(request) { return controller.getApplications(request); }`

### Frontend Data Management

The application uses **React Query with feature-based hooks** co-located with their features.

#### Hook Organization Pattern

Each hook file contains:

- **Direct API functions**: Simple fetch calls to backend endpoints
- **Query hooks**: For data fetching (e.g., `useResumes()`, `useApplication(id)`)
- **Mutation hooks**: For data modification (e.g., `useCreateResume()`, `useUpdateApplication()`)
- **Query keys**: Organized cache invalidation patterns
- **Type safety**: Uses validator types directly from the colocated API modules such as `@/app/api/profile/validators`

**Example Hook Structure**:

```typescript
// src/app/dashboard/resumes/queries/use-resumes.ts

// Direct API calls
const resumesApi = {
	getAll: async (): Promise<Resume[]> => {
		const response = await fetch("/api/resumes");
		if (!response.ok) throw new Error("Failed to fetch resumes");
		return response.json();
	},

	getById: async (id: string): Promise<Resume> => {
		const response = await fetch(`/api/resumes/${id}`);
		if (!response.ok) throw new Error("Failed to fetch resume");
		return response.json();
	},
};

// Query keys
export const resumesKeys = {
	all: ["resumes"] as const,
	lists: () => [...resumesKeys.all, "list"] as const,
	details: () => [...resumesKeys.all, "detail"] as const,
	detail: (id: string) => [...resumesKeys.details(), id] as const,
};

// Hooks
export function useResumes() {
	return useQuery({
		queryKey: resumesKeys.lists(),
		queryFn: resumesApi.getAll,
	});
}

export function useResume(id: string) {
	return useQuery({
		queryKey: resumesKeys.detail(id),
		queryFn: () => resumesApi.getById(id),
		enabled: !!id,
	});
}
```

**Benefits**:

- **Feature Co-Location**: Hooks live with the features that use them
- **Clear Feature Boundaries**: Easy to see what data each feature manages
- **Better Scalability**: Add new features without cluttering shared folders
- **Improved Discoverability**: Related code is organized together
- **Single Responsibility**: Each hook file handles one specific operation
- **Simplified Architecture**: No intermediate API client layer
- **Direct Type Safety**: Uses validator types without re-exports

### Environment Configuration

Environment variables are validated using Zod schema in `src/lib/env.ts`:

- Comprehensive validation for all required variables
- Type-safe environment object exported throughout the app
- Helpful error messages for missing or invalid configuration
- See `.env.example` for required variables

### Database Setup

The project uses Turso (SQLite) as the database with Drizzle ORM. Connection requires:

- `TURSO_CONNECTION_URL` environment variable (validated)
- `TURSO_AUTH_TOKEN` environment variable (validated)

Authentication is configured through BetterAuth with SQLite provider using the Drizzle adapter.

### Core Features

- **Authentication** - Email/password with BetterAuth
- **Profile Management** - Comprehensive profiles with work experience, education, skills, projects, certifications, achievements, references
- **Resume Management** - Create/edit resumes with JSON storage, HTML/PDF generation
- **Job Applications** - Track applications with status updates
- **Cover Letters** - AI-powered personalized generation via Groq
- **AI Resume Optimization** - Job-specific resume generation with intelligent content selection based on job descriptions
- **Dashboard** - Real-time stats and activity tracking

### Path Aliases

Use `@/*` to reference files in the `src/` directory (configured in tsconfig.json).

### API Development Pattern

When creating new API endpoints, follow this structure:

1. **Create Validator** (`src/lib/validators/[domain].validator.ts`):

```typescript
import { z } from "zod";

export const createItemSchema = z.object({
	name: z.string().min(1, "Name is required"),
	// ... other fields
});

export type CreateItemRequest = z.infer<typeof createItemSchema>;
```

2. **Create Service** (`src/lib/services/[domain].service.ts`):

```typescript
export class ItemsService {
	async getItems(userId: string): Promise<ItemResponse[]> {
		// Business logic and database operations
	}
}
```

3. **Create Controller** (`src/lib/controllers/[domain].controller.ts`):

```typescript
export class ItemsController {
	private itemsService = new ItemsService();

	async getItems(request: NextRequest) {
		const session = await auth.api.getSession({ headers: request.headers });
		if (!session)
			return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

		const items = await this.itemsService.getItems(session.user.id);
		return NextResponse.json(items);
	}
}
```

4. **Create Route** (`src/app/api/items/route.ts`):

```typescript
import { ItemsController } from "@/lib/controllers";
const controller = new ItemsController();
export async function GET(request: NextRequest) {
	return controller.getItems(request);
}
```

### Benefits of This Architecture

- **Type Safety**: Zod schemas provide runtime validation and compile-time types
- **Separation of Concerns**: Clear separation between validation, business logic, and request handling
- **Reusability**: Services can be used across different controllers
- **Testability**: Each layer can be tested independently
- **Consistency**: Standardized error handling and validation patterns

### Development Notes

- All data fetching uses React Query hooks (no direct `fetch()` calls)
- All loading states use skeleton components (no text-based "Loading..." messages)
- All layouts use flexbox with `gap` utilities (prefer over `space-*` utilities)
- Environment variables validated at startup (Zod schemas)
- Backend: Clean 3-layer architecture (validators → services → controllers)
- Frontend: Feature-based architecture with co-located hooks
- TypeScript strict mode enabled throughout

### Frontend Development Guidelines

**Data Fetching**:

- **ALWAYS** use React Query hooks, never direct `fetch()` calls
- Import from feature directories: `@/app/dashboard/[feature]/queries/use-[feature]s`
- Queries and mutations are separated into different directories
- List and detail queries are combined in the same file (e.g., `useResumes()` and `useResume(id)` both in `use-resumes.ts`)

**Example Import Pattern**:

```typescript
// Queries (data fetching)
import {
	useApplications,
	useApplication,
} from "@/app/dashboard/applications/queries/use-applications";

// Mutations (data modification)
import { useCreateApplication } from "@/app/dashboard/applications/mutations/use-create-application";
```

**Adding New Hooks**:

1. Determine the feature it belongs to
2. Create in `queries/` (read) or `mutations/` (write) directory
3. Follow existing patterns with direct API calls
4. Export query keys for cache invalidation
5. Use validator types from the colocated API validator modules (e.g. `@/app/api/profile/validators`)

**Component Imports**:

- Feature components: `@/app/dashboard/[feature]/components/*`
- Shared components: `@/app/components/*`
- Shared skeletons: `@/components/skeletons/*`
- UI primitives: `@/components/ui/*`

### Feature-Based Architecture Principles

This application follows a **feature-based architecture** where each feature is self-contained with its own data management and components.

#### Directory Structure for Features

```
src/app/dashboard/[feature]/
├── queries/              # Data fetching hooks
│   ├── use-[feature]s.ts        # List + detail queries combined
│   └── use-[feature]-*.ts       # Additional query hooks
├── mutations/            # Data modification hooks
│   ├── use-create-[feature].ts
│   ├── use-update-[feature].ts
│   ├── use-delete-[feature].ts
│   └── use-*.ts                 # Additional mutations
├── components/           # Feature-specific components
│   ├── [feature]-content.tsx    # Main content component
│   ├── [feature]-form.tsx       # Create/edit form
│   └── [feature]-card.tsx       # Display card
└── [routes]/            # Next.js pages
    ├── page.tsx
    ├── [id]/page.tsx
    └── new/page.tsx
```

#### When to Create a New Feature

Create a new feature directory when:

- The feature has its own data model (database table)
- The feature requires multiple CRUD operations
- The feature has 3+ related pages or components
- The feature should be independently testable

#### Component Organization Rules

Follow the **lowest common ancestor principle** - place components as close as possible to where they're used:

1. **Single-Use Components** → Feature's `components/` directory
2. **Feature-Shared Components** → Stay within the feature folder
3. **Feature-Specific Skeletons** → Feature's `components/` directory (e.g., `applications/components/applications-list-skeleton.tsx`)
4. **Multi-Feature Components** → Move to `/app/components/shared/` only when used by 3+ features
5. **Multi-Feature Skeletons** → `/components/skeletons/` only when used by 3+ features (e.g., `card-skeleton.tsx`)
6. **Layout Components** → `/app/components/layout/` (dashboard, header, sidebar)
7. **UI Primitives** → `/components/ui/` (Shadcn components only)

#### Query vs Mutation Separation

**Queries** (`queries/` directory):

- Fetch data from the server
- Can be combined (list + detail in same file)
- Export query keys for cache management
- Read-only operations

**Mutations** (`mutations/` directory):

- Modify server data (create, update, delete)
- One mutation per file for clarity
- Import query keys to invalidate caches
- Write operations

#### Cache Invalidation Strategy

When creating mutations, invalidate related caches:

```typescript
export function useCreateApplication() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: (data) => api.create(data),
		onSuccess: () => {
			// Invalidate the feature's list
			queryClient.invalidateQueries({ queryKey: applicationsKeys.lists() });
			// Invalidate dashboard stats if the feature affects them
			queryClient.invalidateQueries({ queryKey: dashboardStatsKeys.stats() });
			// Invalidate dashboard activity feed
			queryClient.invalidateQueries({
				queryKey: dashboardActivityKeys.activity(),
			});
		},
	});
}
```

### Zustand vs Custom Hooks Decision Guide

This application uses both Zustand stores and custom hooks for state management. Use this guide to decide which approach is appropriate:

#### Use Zustand Store When:

- **Shared state**: State is accessed by multiple unrelated components
- **Persistent state**: State needs to survive navigation or page changes
- **Complex workflows**: Orchestrating multi-step processes (validate → generate → download)
- **Multiple mutations**: Coordinating 3+ mutations that need shared state
- **Cross-cutting UI state**: Form state, dialogs, navigation that multiple components read/write
- **Side effect separation**: When DOM manipulation (downloads, clipboard) should be separate from data fetching

#### Use Custom Hooks When:

- **Single query**: Simple `useQuery` wrapper for fetching one resource
- **Single mutation**: Simple `useMutation` wrapper for one write operation
- **Derived state**: Computing values from server data within a single component
- **Component-scoped state**: State that only one component needs

#### Red Flags (Refactor Hook → Store):

- Hook creates 3+ internal mutations and combines their states
- Hook manages multiple independent pieces of state
- Hook mixes side effects (DOM manipulation, file downloads) with data fetching
- Same hook logic is duplicated across multiple components
- Hook returns 5+ derived state properties
- Hook orchestrates a workflow with validation steps before main action

#### Store Organization:

```
src/app/dashboard/[feature]/store/
└── use-[feature]-store.ts    # Feature-specific Zustand store
```

### Form Development with React Hook Form

**All forms in this application use React Hook Form with Zod validation**. This provides robust validation, better UX, and strong type safety.

#### Form Implementation Pattern

```typescript
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { createUserProfileSchema } from "@/app/api/profile/validators";
import type { CreateUserProfileRequest } from "@/app/api/profile/validators";

export function MyForm() {
	const form = useForm({
		resolver: zodResolver(createUserProfileSchema),
		defaultValues: {
			firstName: null,
			lastName: null,
			// ... other fields
		},
	});

	const {
		register,
		handleSubmit,
		formState: { errors, isSubmitting },
	} = form;

	const onSubmit = async (data: unknown) => {
		// Data is validated by Zod resolver, safe to cast
		const validatedData = data as CreateUserProfileRequest;
		mutation.mutate(validatedData);
	};

	return (
		<form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
			<div className="flex flex-col gap-2">
				<Label htmlFor="firstName">First Name</Label>
				<Input id="firstName" {...register("firstName")} />
				{errors.firstName && (
					<p className="text-red-500 text-sm mt-1">
						{errors.firstName.message}
					</p>
				)}
			</div>
			{/* More fields... */}
		</form>
	);
}
```

#### Form Development Rules

1. **Always use Zod resolvers**: Import schemas from the colocated API validator modules (e.g. `@/app/api/profile/validators`) and use `zodResolver`
2. **Type safety with `unknown`**: Use `unknown` for form data parameters, then cast after validation
3. **Field-level errors**: Display validation errors below each field using `{errors.fieldName && ...}`
4. **Proper registration**: Use `{...register("fieldName")}` for all form inputs
5. **Loading states**: Use `isSubmitting` from formState to disable submit buttons
6. **Form layout**: Use `flex flex-col gap-4` for forms, `flex flex-col gap-2` for field groups (label + input)

#### Profile Form Pattern

All profile forms follow the same pattern:

- Use React Hook Form with Zod validation
- Handle both create and edit operations
- Integrate with React Query mutations
- Display field-level validation errors
- Use `unknown` type casting after validation

#### Form Best Practices

- **Never use `any` type**: Always use `unknown` and proper casting after Zod validation
- **Validation comments**: Add `// Data is validated by Zod resolver, safe to cast` before type assertions
- **Error handling**: Provide user-friendly error messages and console logging
- **Loading states**: Show loading indicators during form submission
- **Cancel functionality**: Provide cancel buttons that reset form state
- **Success callbacks**: Use `onSuccess` callbacks to trigger cache invalidation and UI updates

## Loading States & Skeleton Components

**All loading states in this application use skeleton components**

## AI Development Guidelines

### AI Integration

- **Service**: `AIContentSelectionService` analyzes job descriptions and selects optimal resume content
- **Models**: Use Groq with `openai/gpt-oss-120b` (primary) or `moonshotai/kimi-k2-instruct` (fallback)
- **Environment**: Requires `GROQ_API_KEY`, optional `GROQ_MODEL` override

### Best Practices

**Error Handling**:

- Always provide fallback behavior when AI fails
- Graceful degradation to manual selection
- Log errors but don't expose to users

**AI Response Processing**:

- Use low temperature (0.2) for consistent results
- Parse JSON responses safely with try/catch
- Validate responses against TypeScript interfaces

**Development Workflow**:

1. Implement AI logic in service layer
2. Create Zod validators for requests/responses
3. Build API endpoints
4. Create React Query hooks
5. Ensure fallback behavior
