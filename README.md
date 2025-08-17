# Job Application Assistant

A comprehensive Next.js application that streamlines your job search with AI-powered resume and cover letter tools. Track applications, manage multiple resumes, and generate personalized cover letters all in one place.

## ✨ Features

### 🔐 Authentication & Security

- Email/password authentication with BetterAuth
- Secure session management with server-side validation
- Password reset functionality via email
- Protected routes with middleware authentication

### 📄 Resume Management

- **Structured Profile System** - Comprehensive user profiles with work experience, education, skills, projects, certifications, achievements, and references
- **Professional Resume Generation** - Generate 1-page PDF resumes from structured profile data
- **Multiple Template Support** - Professional resume templates optimized for ATS systems
- **Content Selection** - Choose which profile sections to include in each resume
- **Drag & Drop Ordering** - Reorder experiences, education, and other sections
- **HTML/PDF Export** - Download resumes as professional PDFs or HTML

### 🤖 AI-Powered Cover Letters

- Generate personalized cover letters using Groq AI
- **Preferred Models**: `openai/gpt-oss-120b` and `moonshotai/kimi-k2-instruct`
- Based on job descriptions and your structured profile data
- Customizable and editable generated content
- AI optimization for different job types and companies

### 📊 Application Tracking

- Track job applications with status updates
- Dashboard with real-time statistics
- Application status visualization
- Activity timeline and history

### 🎨 Modern UI/UX

- Responsive design for all devices
- Dark/light mode support
- Clean, professional interface
- Mobile-optimized layouts

## 🛠 Technology Stack

### Core Framework

- **Next.js 15** - Full-stack React framework with App Router
- **TypeScript 5** - Type-safe development
- **Node.js 20+** - Runtime environment

### Database & ORM

- **Turso (SQLite)** - Serverless database
- **Drizzle ORM** - Type-safe database toolkit
- **Database migrations** - Version-controlled schema changes

### Authentication

- **BetterAuth** - Modern authentication library
- **Email/Password** - Secure credential-based auth
- **Session management** - Server-side session validation

### AI Integration

- **Vercel AI SDK** - AI integration framework
- **Groq** - Fast AI inference for cover letter generation
- **Preferred Models**: `openai/gpt-oss-120b`, `moonshotai/kimi-k2-instruct`
- **Puppeteer** - Server-side PDF generation for resumes

### Frontend

- **React Query (TanStack Query)** - Server state management with custom hooks
- **Zustand** - Client state management
- **Tailwind CSS v4** - Utility-first styling
- **Shadcn/ui** - High-quality component library
- **Lucide Icons** - Beautiful icon set
- **Next-Themes** - Dark mode support

### Validation & Forms

- **Zod v4** - Runtime type validation with TypeScript integration
- **React Hook Form** - Performant forms with comprehensive validation
- **Integrated Validation** - All forms use react-hook-form with Zod resolvers

### Development Tools

- **Bun** - Fast package manager and runtime
- **ESLint** - Code linting
- **TypeScript** - Static type checking

### Deployment

- **Vercel** - Production deployment platform
- **Environment validation** - Startup configuration checks

## 🚀 Getting Started

### Prerequisites

- Node.js 20+
- Bun (recommended) or npm
- A Turso database account
- A Groq API key (for AI features)

### Installation

1. **Clone the repository**

   ```bash
   git clone https://github.com/ffeew/job-application-assistant
   cd job-application-assistant
   ```

2. **Install dependencies**

   ```bash
   bun install
   # or
   npm install
   ```

3. **Set up environment variables**

   ```bash
   cp .env.example .env
   ```

   Fill in your environment variables in `.env`:

   ```bash
   # Better Auth Configuration
   BETTER_AUTH_SECRET=your-32-character-secret-key-here
   BETTER_AUTH_URL=http://localhost:3000
   NEXT_PUBLIC_BETTER_AUTH_URL=http://localhost:3000

   # Turso Database Configuration
   TURSO_CONNECTION_URL=libsql://your-database-name.aws-region.turso.io
   TURSO_AUTH_TOKEN=your-turso-auth-token

   # Groq AI Configuration (optional)
   GROQ_API_KEY=your-groq-api-key
   # Preferred models: openai/gpt-oss-120b, moonshotai/kimi-k2-instruct
   ```

4. **Set up the database**

   ```bash
   bun run db:push
   # or
   npm run db:push
   ```

5. **Start the development server**

   ```bash
   bun run dev
   # or
   npm run dev
   ```

6. **Open your browser**
   Navigate to [http://localhost:3000](http://localhost:3000)

## 📁 Project Structure

```
src/
├── app/                          # Next.js App Router
│   ├── (auth)/                   # Authentication pages
│   │   ├── sign-in/
│   │   ├── sign-up/
│   │   ├── forgot-password/
│   │   └── reset-password/
│   ├── dashboard/                # Protected dashboard
│   │   ├── applications/
│   │   ├── resumes/
│   │   ├── cover-letters/
│   │   └── profile/             # Structured profile management
│   └── api/                      # API routes
├── lib/                          # Shared utilities
│   ├── auth.ts                   # BetterAuth configuration
│   ├── env.ts                    # Environment validation
│   ├── db/                       # Database configuration
│   ├── validators/               # Zod validation schemas
│   ├── services/                 # Business logic layer
│   ├── controllers/              # API request handlers
│   ├── resume-templates/         # Resume generation templates
│   └── utils/                    # Helper utilities
├── hooks/                        # Custom React Query hooks
└── components/                   # Reusable UI components
```

## 🏗 Architecture

This application follows a clean architecture with separation between frontend and backend:

### Backend Architecture (3-Layer API)

#### 1. **Validators** (`src/lib/validators/`)

- Define and validate API input/output using Zod schemas
- Shared TypeScript types between frontend and backend
- Runtime validation with compile-time type safety

#### 2. **Services** (`src/lib/services/`)

- Contains all business logic and database operations
- One service class per domain (e.g., `ApplicationsService`)
- Handles data transformation and business rules

#### 3. **Controllers** (`src/lib/controllers/`)

- Handle HTTP requests and orchestrate services
- Authentication validation and error handling
- Request/response validation using Zod schemas

#### 4. **Routes** (`src/app/api/`)

- Thin layer that delegates to controllers
- Clean separation of concerns
- Consistent error handling

### Frontend Architecture

#### **React Query Hooks** (`src/hooks/`)

- Direct API calls to backend endpoints
- Custom hooks for each domain (resumes, applications, cover letters, profiles)
- Built-in caching, loading states, and error handling
- Type-safe using validator schemas

**Available Hook Collections:**
- `use-dashboard.ts` - Dashboard statistics and activity tracking
- `use-resumes.ts` - Resume CRUD operations and management
- `use-applications.ts` - Job application tracking and status updates
- `use-cover-letters.ts` - AI-powered cover letter generation
- `use-profile.ts` - Comprehensive profile data management (user profiles, work experience, education, skills, projects, certifications, achievements, references)

**Example Hook Structure:**

```typescript
// Direct API functions
const resumesApi = {
	getAll: async () => {
		const response = await fetch("/api/resumes");
		if (!response.ok) throw new Error("Failed to fetch");
		return response.json();
	},
};

// React Query hooks
export function useResumes() {
	return useQuery({
		queryKey: ["resumes"],
		queryFn: resumesApi.getAll,
	});
}
```

**Benefits:**

- **No intermediate API layer** - Direct fetch calls in hooks
- **Type safety** - Uses validator types directly
- **Better performance** - Fewer abstraction layers
- **Easier debugging** - Clear path from component to API

## 🧪 Development Commands

```bash
# Development
bun run dev              # Start development server
bun run build            # Build for production
bun run start            # Start production server
bun run lint             # Run ESLint
bun run typecheck        # Run TypeScript type checking

# Database
bun run db:push          # Push schema changes to database
bun run db:studio        # Open Drizzle Studio
bun run db:generate      # Generate migration files
```

## 💻 Development Guidelines

### TypeScript Standards

This project follows strict TypeScript guidelines:

- **NEVER use `any` type** - Always use proper types, interfaces, or `unknown`
- **Use specific types** - Prefer `string | number` over `unknown` when possible
- **Leverage type inference** - Let TypeScript infer types when they're obvious
- **Use generics** - For reusable functions and components

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

// ❌ Bad - Using any
function handleData(data: any): any {
  return data.something;
}
```

### Code Quality

- All ESLint errors must be fixed before committing
- All TypeScript errors must be resolved
- Run `bun run lint` and `bun run typecheck` before submitting PRs

### Form Development with React Hook Form

All forms in this application use **React Hook Form with Zod validation** for robust, type-safe form handling.

#### Core Form Pattern

```typescript
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { createUserProfileSchema } from "@/lib/validators/profile.validator";

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
    </form>
  );
}
```

#### Form Development Rules

1. **Always use Zod resolvers** - Import schemas from `@/lib/validators`
2. **Type safety with `unknown`** - Use `unknown` for form data, then cast after validation
3. **Field-level errors** - Display validation errors below each field
4. **Proper registration** - Use `{...register("fieldName")}` for all inputs
5. **Loading states** - Use `isSubmitting` to disable submit buttons during processing

#### Profile Management Forms

The application includes comprehensive profile forms:

- **Personal Information** - Contact details and professional links
- **Work Experience** - Career history with date handling and current position logic
- **Education** - Academic background with degree validation
- **Skills** - Technical and soft skills with proficiency levels
- **Projects** - Portfolio projects with technology tags
- **Certifications** - Professional certifications with verification
- **Achievements** - Career highlights and awards
- **References** - Professional contacts with details

Each form follows consistent patterns for validation, error handling, and user experience.

## 🔒 Environment Variables

| Variable                      | Required | Description                                 |
| ----------------------------- | -------- | ------------------------------------------- |
| `BETTER_AUTH_SECRET`          | Yes      | 32+ character secret for auth encryption    |
| `BETTER_AUTH_URL`             | Yes      | Base URL for authentication                 |
| `NEXT_PUBLIC_BETTER_AUTH_URL` | Yes      | Public auth URL for client-side             |
| `TURSO_CONNECTION_URL`        | Yes      | Turso database connection string            |
| `TURSO_AUTH_TOKEN`            | Yes      | Turso authentication token                  |
| `GROQ_API_KEY`                | No       | Groq API key for AI cover letter generation |
| `NODE_ENV`                    | No       | Environment (development/production)        |
| `PORT`                        | No       | Server port (default: 3000)                 |

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- [Next.js](https://nextjs.org/) for the amazing framework
- [BetterAuth](https://www.better-auth.com/) for modern authentication
- [Turso](https://turso.tech/) for the serverless database
- [Shadcn/ui](https://ui.shadcn.com/) for the beautiful components
- [Groq](https://groq.com/) for fast AI inference
