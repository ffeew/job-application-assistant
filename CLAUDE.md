# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

- **Start development server**: `npm run dev` (uses Turbopack for faster builds)
- **Build for production**: `npm run build`
- **Start production server**: `npm start`
- **Lint code**: `npm run lint`
- **Type check**: `npm run typecheck`

## Code Quality Requirements

**CRITICAL**: After completing any coding task or making changes to the codebase, you MUST run both:

1. **`npm run lint`** - Check for ESLint errors and warnings
2. **`npm run typecheck`** - Verify TypeScript type correctness

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
1. Run `npm run lint` and fix ALL errors and warnings
2. Run `npm run typecheck` and resolve ALL type errors  
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
  return fetch(endpoint).then(res => res.json());
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
- **Package Manager**: Bun (indicated by bun.lock)
- **Runtime**: Node.js 20+ (TypeScript 5)

### Key Directories

- `src/app/` - Next.js App Router pages and layouts
  - `src/app/dashboard/applications/[id]/resume/` - **NEW**: AI-powered job-specific resume generation
- `src/lib/` - Shared utilities and configuration
- `src/lib/auth.ts` - BetterAuth configuration with Drizzle adapter
- `src/lib/db/` - Database configuration and schemas
- `src/lib/validators/` - Zod validation schemas shared between frontend and backend
- `src/lib/services/` - Business logic layer with database operations
  - `src/lib/services/ai-content-selection.service.ts` - **NEW**: AI job description analysis and content scoring
  - `src/lib/services/resume-generation.service.ts` - **ENHANCED**: Integrated with AI content selection
- `src/lib/controllers/` - Request handling and service orchestration
- `src/lib/env.ts` - Environment variable validation with Zod (includes `GROQ_MODEL` configuration)
- `src/hooks/` - Custom React Query hooks for data management
  - `src/hooks/use-job-application-resume.ts` - **NEW**: Job-specific resume generation hooks
- `src/components/providers/` - Application providers (QueryClient, etc.)
- `src/components/ui/` - Reusable UI components (Shadcn UI + custom components)

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

The application uses React Query for all data fetching with direct API calls and custom hooks:

- **Custom React Query Hooks** (`src/hooks/`):
  - `use-dashboard.ts` - Dashboard stats and activity data with direct `/api/dashboard/*` calls
  - `use-resumes.ts` - Resume CRUD operations with direct `/api/resumes/*` calls
  - `use-applications.ts` - Job application management with direct `/api/applications/*` calls
  - `use-cover-letters.ts` - Cover letter generation and management with direct `/api/cover-letters/*` calls
  - `use-profile.ts` - Comprehensive profile data management with direct `/api/profile/*` calls
  - `use-job-application-resume.ts` - **NEW**: AI-powered job-specific resume generation with direct `/api/applications/[id]/resume` calls

#### React Query Hook Architecture

Each hook file contains:
- **Direct API functions**: Simple fetch calls to backend endpoints
- **Query hooks**: For data fetching (e.g., `useResumes()`, `useApplication(id)`)
- **Mutation hooks**: For data modification (e.g., `useCreateResume()`, `useUpdateApplication()`)
- **Query keys**: Organized cache invalidation patterns
- **Type safety**: Uses validator types directly from `@/lib/validators`

**Example Hook Structure**:
```typescript
// Direct API calls
const resumesApi = {
  getAll: async (): Promise<Resume[]> => {
    const response = await fetch('/api/resumes');
    if (!response.ok) throw new Error('Failed to fetch resumes');
    return response.json();
  },
  // ... other methods
};

// React Query hooks
export function useResumes() {
  return useQuery({
    queryKey: resumeKeys.lists(),
    queryFn: resumesApi.getAll,
  });
}
```

**Benefits**:
- **Simplified Architecture**: No intermediate API client layer
- **Direct Type Safety**: Uses validator types without re-exports
- **Better Performance**: Fewer abstraction layers
- **Easier Debugging**: Clear path from hook to API endpoint

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
4. **AI Cover Letter Generation** - Groq-powered personalized cover letters (uses `openai/gpt-oss-120b` or `moonshotai/kimi-k2-instruct`)
5. **Structured Profile Management** - Comprehensive user profiles with experiences, education, skills, projects, certifications, achievements, and references
6. **Professional Resume Generation** - HTML/PDF resume generation with 1-page templates and content selection
7. **🆕 AI-Powered Job-Specific Resume Generation** - Revolutionary intelligent resume optimization:
   - **Job Description Analysis** - AI extracts requirements, skills, and keywords from job postings
   - **Intelligent Content Selection** - AI scores and ranks profile entries by relevance (0-100 scale)
   - **Smart Profile Matching** - Automatically selects most relevant experiences, skills, and projects
   - **Transparent AI Decision Making** - Shows strategy, reasoning, and matched keywords
   - **Customizable Parameters** - Control limits for work experiences (1-8), projects (0-6), skills (5-20)
   - **Manual Override Support** - Fine-tune AI selections with manual content choices
   - **Job-Application Integration** - Generate tailored resumes directly from applications with "Generate Tailored Resume" buttons
8. **Dashboard Analytics** - Real-time stats and activity tracking

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

- All pages use React Query hooks for data fetching with proper error handling and loading states
- Environment variables are validated at startup - app won't start with invalid configuration
- API follows clean architecture with validators, services, and controllers
- Frontend React Query hooks use validator types directly for type safety
- No client-side fetch() calls - all data fetching goes through React Query hooks
- Uses Geist fonts (Geist Sans and Geist Mono) for typography
- Configured for both light and dark mode support
- Proper TypeScript throughout with strict type checking

### Frontend Development Guidelines

**Data Fetching**:
- **ALWAYS** use React Query hooks for data fetching, never direct `fetch()` calls
- Import hooks from `@/hooks` (e.g., `import { useResumes } from '@/hooks/use-resumes'`)
- Use appropriate hooks for CRUD operations:
  - `useResumes()` for fetching all resumes
  - `useResume(id)` for fetching a single resume
  - `useCreateResume()` for creating resumes
  - `useUpdateResume()` for updating resumes
  - Similar patterns for applications and cover letters
- **NEW AI-Powered Resume Generation**:
  - `useApplicationResumeInfo(applicationId)` - Fetch application info for resume generation
  - `useGenerateJobApplicationPDF()` - Generate and download job-specific resume PDFs
  - `useGenerateJobApplicationPreview()` - Generate HTML previews with AI insights
  - `useGenerateJobApplicationHTML()` - Generate HTML resumes with AI optimization

**Adding New Data Operations**:
1. If hook doesn't exist, add it to the appropriate hook file in `src/hooks/`
2. Follow the established pattern with direct API calls and React Query
3. Use validator types from `@/lib/validators` for type safety
4. Include proper error handling and cache invalidation

**Component Patterns**:
- Use loading states from React Query (`isLoading`, `isPending`)
- Handle error states appropriately (`error`, `isError`)
- Leverage React Query's caching and background refetching
- Use mutations for create/update/delete operations with proper `onSuccess` callbacks

### Form Development with React Hook Form

**All forms in this application use React Hook Form with Zod validation**. This provides robust validation, better UX, and strong type safety.

#### Form Implementation Pattern

```typescript
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { createUserProfileSchema } from "@/lib/validators/profile.validator";
import type { CreateUserProfileRequest } from "@/lib/validators/profile.validator";

export function MyForm() {
  const form = useForm({
    resolver: zodResolver(createUserProfileSchema),
    defaultValues: {
      firstName: null,
      lastName: null,
      // ... other fields
    },
  });

  const { register, handleSubmit, formState: { errors, isSubmitting } } = form;

  const onSubmit = async (data: unknown) => {
    // Data is validated by Zod resolver, safe to cast
    const validatedData = data as CreateUserProfileRequest;
    mutation.mutate(validatedData);
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div>
        <Label htmlFor="firstName">First Name</Label>
        <Input id="firstName" {...register("firstName")} />
        {errors.firstName && (
          <p className="text-red-500 text-sm mt-1">{errors.firstName.message}</p>
        )}
      </div>
      {/* More fields... */}
    </form>
  );
}
```

#### Form Development Rules

1. **Always use Zod resolvers**: Import schemas from `@/lib/validators` and use `zodResolver`
2. **Type safety with `unknown`**: Use `unknown` for form data parameters, then cast after validation
3. **Field-level errors**: Display validation errors below each field using `{errors.fieldName && ...}`
4. **Proper registration**: Use `{...register("fieldName")}` for all form inputs
5. **Loading states**: Use `isSubmitting` from formState to disable submit buttons

#### Profile Form Components

The application includes comprehensive profile forms using this pattern:

- **`UserProfileForm`** - Personal information with react-hook-form and Zod validation
- **`WorkExperienceForm`** - Work experience CRUD with date handling and current position logic
- **`EducationForm`** - Education history with degree validation
- **`SkillsForm`** - Skills with category and proficiency level dropdowns
- **`ProjectsForm`** - Project portfolio with technology tags
- **`CertificationsForm`** - Professional certifications with verification
- **`AchievementsForm`** - Career achievements and awards
- **`ReferencesForm`** - Professional references with contact details

Each form follows the same pattern:
- Uses appropriate Zod schema for validation
- Handles both create and edit operations
- Integrates with React Query mutations
- Provides proper error handling and loading states
- Uses `unknown` type casting with validation comments

#### Form Best Practices

- **Never use `any` type**: Always use `unknown` and proper casting after Zod validation
- **Validation comments**: Add `// Data is validated by Zod resolver, safe to cast` before type assertions
- **Error handling**: Provide user-friendly error messages and console logging
- **Loading states**: Show loading indicators during form submission
- **Cancel functionality**: Provide cancel buttons that reset form state
- **Success callbacks**: Use `onSuccess` callbacks to trigger cache invalidation and UI updates

## AI Development Guidelines

### AI-Powered Resume Generation Architecture

The application implements intelligent resume generation using a multi-layered approach:

#### **AIContentSelectionService** (`src/lib/services/ai-content-selection.service.ts`)

**Core Capabilities**:
- **Job Description Analysis** - Extracts requirements, skills, keywords, seniority level, and industry
- **Intelligent Content Scoring** - Ranks profile entries by relevance (0-100 scale) 
- **Smart Selection Algorithm** - Chooses optimal content combinations within specified limits
- **Transparent Decision Making** - Provides reasoning and matched keywords for each selection

**Key Methods**:
```typescript
// Analyze job description and extract structured data
async analyzeJobDescription(jobDescription: string): Promise<JobAnalysisResponse>

// Select optimal profile content based on job requirements  
async selectOptimalContent(
  jobDescription: string,
  profileData: ProfileData,
  maxWorkExperiences: number = 4,
  maxProjects: number = 3, 
  maxSkills: number = 12
): Promise<IntelligentContentSelection>
```

#### **Enhanced ResumeGenerationService** (`src/lib/services/resume-generation.service.ts`)

**New AI-Integrated Methods**:
```typescript
// Generate job-specific resume HTML with AI content selection
async generateJobApplicationResumeHTML(
  userId: string,
  application: ApplicationResponse,
  request: JobApplicationResumeRequest
): Promise<{ html: string; aiSelection?: IntelligentContentSelection }>

// Generate job-specific resume PDF with AI optimization
async generateJobApplicationResumePDF(
  userId: string, 
  application: ApplicationResponse,
  request: JobApplicationResumeRequest
): Promise<{ pdf: Buffer; aiSelection?: IntelligentContentSelection }>
```

### AI Integration Best Practices

#### **Environment Configuration**
```typescript
// Environment variables for AI features
GROQ_API_KEY=your-groq-api-key-here          // Required for AI features
GROQ_MODEL=openai/gpt-oss-120b               // Default AI model (optional)
```

#### **Error Handling and Fallbacks**
- **Always provide fallback behavior** when AI analysis fails
- **Graceful degradation** - If AI is unavailable, use manual selection methods
- **Transparent error reporting** - Log AI failures but don't expose them to users
- **Timeout handling** - AI requests should have reasonable timeouts

#### **AI Response Processing**
```typescript
// Always validate AI responses with proper error handling
try {
  const { text } = await generateText({
    model: groq(this.model),
    prompt: analysisPrompt,
    temperature: 0.2, // Lower temperature for consistent results
  });

  // Parse JSON responses safely
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (jsonMatch) {
    return JSON.parse(jsonMatch[0]);
  }
  throw new Error("Failed to parse AI response");
} catch (error) {
  console.error("AI analysis failed:", error);
  return this.getFallbackSelection(profileData, limits);
}
```

#### **Type Safety with AI Responses** 
```typescript
// Use proper TypeScript interfaces for AI response validation
interface JobAnalysisResponse {
  requirements: string[];
  skills: string[];
  keywords: string[];
  seniority: 'entry' | 'mid' | 'senior' | 'executive';
  industry: string;
  summary: string;
}

// Validate AI responses against expected schemas
private validateAndFormatSelection(
  selection: {
    selectedWorkExperiences?: number[];
    selectedEducation?: number[];
    // ... other fields
  },
  profileData: ProfileData
): IntelligentContentSelection
```

### AI Feature Development Workflow

1. **Add AI Logic to Services** - Implement AI analysis in service layer
2. **Create Proper Validators** - Define Zod schemas for AI requests/responses  
3. **Build API Endpoints** - Expose AI functionality through REST APIs
4. **Develop React Hooks** - Create React Query hooks for AI operations
5. **Design UI Components** - Build user interfaces that show AI insights transparently
6. **Implement Fallbacks** - Ensure graceful degradation when AI is unavailable
7. **Add Error Handling** - Proper error boundaries and user feedback
8. **Test Edge Cases** - Validate behavior with malformed job descriptions, network failures, etc.