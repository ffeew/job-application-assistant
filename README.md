# Job Application Assistant

A comprehensive Next.js application that streamlines your job search with AI-powered resume and cover letter tools. Track applications, manage multiple resumes, and generate personalized cover letters all in one place.

## ✨ Features

### 🔐 Authentication & Security
- Email/password authentication with BetterAuth
- Secure session management with server-side validation
- Password reset functionality via email
- Protected routes with middleware authentication

### 📄 Resume Management
- Create and manage multiple resume versions
- Customize resumes for different job applications
- JSON-based content storage for flexibility
- Export capabilities (planned)

### 🤖 AI-Powered Cover Letters
- Generate personalized cover letters using Groq AI
- Based on job descriptions and your resume data
- Customizable and editable generated content

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

### Frontend
- **React Query (TanStack Query)** - Server state management
- **Zustand** - Client state management
- **Tailwind CSS v4** - Utility-first styling
- **Shadcn/ui** - High-quality component library
- **Lucide Icons** - Beautiful icon set
- **Next-Themes** - Dark mode support

### Validation & Forms
- **Zod v4** - Runtime type validation
- **React Hook Form** - Performant forms with validation

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
   git clone <repository-url>
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
│   │   └── cover-letters/
│   └── api/                      # API routes
├── lib/                          # Shared utilities
│   ├── auth.ts                   # BetterAuth configuration
│   ├── env.ts                    # Environment validation
│   ├── db/                       # Database configuration
│   ├── validators/               # Zod validation schemas
│   ├── services/                 # Business logic layer
│   ├── controllers/              # API request handlers
│   └── api/                      # Frontend API client
├── hooks/                        # Custom React Query hooks
└── components/                   # Reusable UI components
```

## 🏗 Architecture

This application follows a clean 3-layer API architecture:

### 1. **Validators** (`src/lib/validators/`)
- Define and validate API input/output using Zod schemas
- Shared TypeScript types between frontend and backend
- Runtime validation with compile-time type safety

### 2. **Services** (`src/lib/services/`)
- Contains all business logic and database operations
- One service class per domain (e.g., `ApplicationsService`)
- Handles data transformation and business rules

### 3. **Controllers** (`src/lib/controllers/`)
- Handle HTTP requests and orchestrate services
- Authentication validation and error handling
- Request/response validation using Zod schemas

### 4. **Routes** (`src/app/api/`)
- Thin layer that delegates to controllers
- Clean separation of concerns
- Consistent error handling

## 🧪 Development Commands

```bash
# Development
bun run dev              # Start development server
bun run build            # Build for production
bun run start            # Start production server
bun run lint             # Run ESLint

# Database
bun run db:push          # Push schema changes to database
bun run db:studio        # Open Drizzle Studio
bun run db:generate      # Generate migration files
```

## 🔒 Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `BETTER_AUTH_SECRET` | Yes | 32+ character secret for auth encryption |
| `BETTER_AUTH_URL` | Yes | Base URL for authentication |
| `NEXT_PUBLIC_BETTER_AUTH_URL` | Yes | Public auth URL for client-side |
| `TURSO_CONNECTION_URL` | Yes | Turso database connection string |
| `TURSO_AUTH_TOKEN` | Yes | Turso authentication token |
| `GROQ_API_KEY` | No | Groq API key for AI cover letter generation |
| `NODE_ENV` | No | Environment (development/production) |
| `PORT` | No | Server port (default: 3000) |

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
