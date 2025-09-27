import { Badge } from "@/components/ui/badge";
import { TechCard } from "./shared/tech-card";
import { Layers, Code, Database, Zap } from "lucide-react";

const mainTechnologies = [
  {
    icon: Layers,
    title: "Next.js 15",
    description:
      "Modern App Router features, Server Components, and Turbopack for instant feedback.",
    iconBgColor: "bg-blue-100 dark:bg-blue-900",
    iconColor: "text-blue-600 dark:text-blue-400",
  },
  {
    icon: Code,
    title: "TypeScript",
    description:
      "Strict typing across the stack with shared interfaces and end-to-end safety.",
    iconBgColor: "bg-purple-100 dark:bg-purple-900",
    iconColor: "text-purple-600 dark:text-purple-400",
  },
  {
    icon: Database,
    title: "Turso + Drizzle",
    description:
      "Edge-ready SQLite with schema management and type-safe queries via Drizzle.",
    iconBgColor: "bg-green-100 dark:bg-green-900",
    iconColor: "text-green-600 dark:text-green-400",
  },
  {
    icon: Zap,
    title: "Groq AI",
    description:
      "High-performance inference powering resume tailoring and cover letter generation.",
    iconBgColor: "bg-orange-100 dark:bg-orange-900",
    iconColor: "text-orange-600 dark:text-orange-400",
  },
];

const supportingTechnologies = [
  { label: "Authentication", value: "BetterAuth" },
  { label: "Styling", value: "Tailwind CSS v4" },
  { label: "State", value: "Zustand + React Query" },
  { label: "Forms", value: "React Hook Form + Zod" },
  { label: "PDF", value: "Puppeteer" },
  { label: "Validation", value: "Drizzle Kit" },
];

export function TechStackSection() {
  return (
    <section
      id="tech"
      className="relative overflow-hidden bg-muted/20 py-24 sm:py-28"
    >
      <div className="absolute inset-0 -z-10 bg-gradient-to-tr from-primary/10 via-muted/10 to-transparent" />
      <div className="container relative mx-auto px-4">
        <div className="mx-auto mb-16 max-w-3xl text-center">
          <Badge
            variant="secondary"
            className="rounded-full px-4 py-1 text-xs tracking-[0.3em]"
          >
            TECH STACK
          </Badge>
          <h2 className="mt-6 text-balance text-3xl font-semibold leading-tight md:text-4xl">
            Built on a polished, performant foundation
          </h2>
          <p className="mt-4 text-lg text-muted-foreground">
            Every layer—from infrastructure to UI—leans on proven tools that ship quickly, scale easily, and stay maintainable.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-4 xl:gap-7">
          {mainTechnologies.map((tech) => (
            <TechCard key={tech.title} {...tech} />
          ))}
        </div>

        <div className="mx-auto mt-12 max-w-5xl rounded-3xl border border-border/60 bg-background/80 p-8 shadow-lg shadow-primary/5 backdrop-blur">
          <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
            <div className="max-w-xl">
              <p className="text-sm font-semibold uppercase tracking-[0.25em] text-muted-foreground">
                Supporting services
              </p>
              <p className="mt-3 text-base text-muted-foreground">
                Fast local development, predictable deployments, and typed APIs keep contributions smooth for every agent.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              {supportingTechnologies.map((item) => (
                <span
                  key={item.label}
                  className="rounded-full border border-border/70 bg-muted/40 px-4 py-2 text-xs font-medium uppercase tracking-wide text-muted-foreground"
                >
                  {item.label}: {item.value}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
