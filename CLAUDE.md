# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

- **Start development server**: `npm run dev` (uses Turbopack for faster builds)
- **Build for production**: `npm run build`
- **Start production server**: `npm start`
- **Lint code**: `npm run lint`

## Project Architecture

This is a fully functional Next.js 15 application for a job application assistant that helps users create cover letters, customize resumes, and track applications.

### Technology Stack

- **Framework**: Next.js 15 with App Router
- **Database**: Turso (SQLite) with Drizzle ORM
- **Authentication**: BetterAuth with email/password
- **Deployment**: Vercel
- **Styling**: Tailwind CSS v4
- **State Management**: Zustand
- **Data Fetching**: React Query (TanStack Query) with custom hooks
- **Validation**: Zod v4 (including environment variable validation)
- **AI Integration**: Vercel AI SDK with Groq
- **Dark Mode Support**: Next-Themes
- **UI Library**: Shadcn UI
- **Icons**: Lucide Icons
- **Package Manager**: Bun (indicated by bun.lock)
- **Runtime**: Node.js 20+ (TypeScript 5)

### Key Directories

- `src/app/` - Next.js App Router pages and layouts
- `src/lib/` - Shared utilities and configuration
- `src/lib/auth.ts` - BetterAuth configuration with Drizzle adapter
- `src/lib/db/` - Database configuration and schemas
- `src/lib/validators/` - Zod validation schemas shared between frontend and backend
- `src/lib/services/` - Business logic layer with database operations
- `src/lib/controllers/` - Request handling and service orchestration
- `src/lib/api/` - Frontend API client layer with typed functions
- `src/lib/env.ts` - Environment variable validation with Zod
- `src/hooks/` - Custom React Query hooks for data management
- `src/components/providers/` - Application providers (QueryClient, etc.)

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

The application uses React Query for all data fetching with a well-organized structure:

- **API Service Layer** (`src/lib/api/`):
  - `client.ts` - Base API client with error handling
  - `services.ts` - Typed service functions for all endpoints
  - `types.ts` - TypeScript interfaces (can be migrated to use validator types)

- **Custom React Query Hooks** (`src/hooks/`):
  - `use-dashboard.ts` - Dashboard stats and activity data
  - `use-resumes.ts` - Resume CRUD operations
  - `use-applications.ts` - Job application management
  - `use-cover-letters.ts` - Cover letter generation and management

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

### Features Implemented

1. **User Authentication** - Email/password with BetterAuth
2. **Resume Management** - Create, edit, delete resumes with JSON content storage
3. **Job Application Tracking** - Track applications with status updates and detailed information
4. **AI Cover Letter Generation** - Groq-powered personalized cover letters
5. **Dashboard Analytics** - Real-time stats and activity tracking

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
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    
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

- All pages use React Query for data fetching with proper error handling and loading states
- Environment variables are validated at startup - app won't start with invalid configuration
- API follows clean architecture with validators, services, and controllers
- Frontend and backend share Zod validation schemas for type safety
- Uses Geist fonts (Geist Sans and Geist Mono) for typography
- Configured for both light and dark mode support
- Proper TypeScript throughout with strict type checking