import { Badge } from "@/components/ui/badge";
import { StepCard } from "./shared/step-card";
import { Settings, Code } from "lucide-react";
import { GithubIcon } from "@/components/ui/github-icon";

const steps = [
  {
    icon: GithubIcon,
    title: "Clone & deploy",
    description:
      "Fork or clone the repository, install dependencies with Bun, and choose Vercel, Netlify, or your preferred hosting option.",
  },
  {
    icon: Settings,
    title: "Configure & connect",
    description:
      "Provision a Turso database, add Groq credentials, and run Drizzle migrations to sync your schema across environments.",
  },
  {
    icon: Code,
    title: "Customize & contribute",
    description:
      "Tailor AI prompts, extend UI modules, and open pull requests with improvements, features, or documentation updates.",
  },
];

export function GettingStartedSection() {
  return (
    <section
      id="getting-started"
      className="relative overflow-hidden bg-background py-24 sm:py-28"
    >
      <div className="absolute inset-0 -z-10 bg-gradient-to-b from-background via-muted/30 to-background" />
      <div className="container relative mx-auto px-4">
        <div className="mx-auto mb-16 max-w-3xl text-center">
          <Badge
            variant="secondary"
            className="rounded-full px-4 py-1 text-xs tracking-[0.3em]"
          >
            LAUNCH FAST
          </Badge>
          <h2 className="mt-6 text-balance text-3xl font-semibold leading-tight md:text-4xl">
            Deploy in minutes, adapt for your workflow
          </h2>
          <p className="mt-4 text-lg text-muted-foreground">
            Follow the streamlined developer path below to self-host the assistant, wire up credentials, and start shipping upgrades.
          </p>
        </div>

        <div className="mx-auto flex max-w-3xl flex-col gap-9">
          {steps.map((step, index) => (
            <StepCard
              key={step.title}
              stepNumber={index + 1}
              isLast={index === steps.length - 1}
              {...step}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
