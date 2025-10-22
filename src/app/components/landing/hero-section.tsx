import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowRight, Check, PlayCircle, Sparkles } from "lucide-react";
import { GithubIcon } from "@/components/ui/github-icon";

const highlights = [
  "Tailor resumes with explainable AI",
  "Track every application in one place",
  "Generate polished PDFs instantly",
  "Self-hosted with full data ownership",
];

const previewItems = [
  {
    label: "Work Experience match",
    percentage: "92%",
    descriptor: "Senior Product Designer · Figma",
    skills: ["UX Research", "Design Systems", "AI Copilot"],
  },
  {
    label: "Skills spotlight",
    percentage: "87%",
    descriptor: "Matches job keywords",
    skills: ["Next.js", "TypeScript", "Groq AI"],
  },
];

export function HeroSection() {
  return (
    <section
      id="hero"
      className="relative overflow-hidden bg-gradient-to-b from-background via-background to-muted/30 py-20 sm:py-28 lg:py-32"
    >
      <div className="absolute inset-x-0 top-[-200px] -z-10 flex justify-center">
        <div className="h-[420px] w-[420px] rounded-full bg-primary/20 blur-[160px]" />
      </div>
      <div className="absolute inset-y-0 right-0 -z-10 hidden lg:block">
        <div className="h-full w-[420px] bg-gradient-to-l from-primary/10 via-transparent to-transparent" />
      </div>

      <div className="container relative mx-auto grid items-center gap-12 px-4 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)]">
        <div className="relative z-10 space-y-8">
          <Badge
            variant="outline"
            className="inline-flex items-center gap-2 rounded-full border-primary/40 bg-primary/10 px-4 py-1 text-xs font-medium uppercase tracking-[0.18em] text-primary"
          >
            <Sparkles className="h-3.5 w-3.5" />
            AI-first, open source, self-hosted
          </Badge>

          <div className="space-y-4">
            <h1 className="text-balance text-4xl font-bold leading-tight tracking-tight md:text-5xl lg:text-6xl">
              Launch smarter applications with an assistant that learns from you.
            </h1>
            <p className="text-balance text-lg text-muted-foreground md:text-xl">
              Consolidate profiles, tailor every resume, and ship cover letters with explainable AI guidance—all from a single private workspace.
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-3 sm:justify-start">
            <Button size="lg" className="h-12 rounded-full px-8 text-base flex-shrink-0" asChild>
              <Link href="/dashboard">
                Try the live demo
                <ArrowRight className="ml-2 h-5 w-5" />
              </Link>
            </Button>
            <Button
              size="lg"
              variant="ghost"
              className="h-12 rounded-full px-6 text-base flex-shrink-0"
              asChild
            >
              <Link href="https://github.com/ffeew/job-application-assistant" target="_blank">
                <GithubIcon className="mr-2 h-5 w-5" width={20} height={20} />
                View on GitHub
              </Link>
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="h-12 rounded-full border-border/80 px-6 text-base flex-shrink-0"
              asChild
            >
              <Link href="#getting-started" className="flex items-center">
                <PlayCircle className="mr-2 h-5 w-5" />
                Watch product tour
              </Link>
            </Button>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 sm:gap-4">
            {highlights.map((item) => (
              <div
                key={item}
                className="flex items-start gap-3 rounded-2xl border border-border/60 bg-background/80 p-4 shadow-sm backdrop-blur"
              >
                <span className="mt-0.5 flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <Check className="h-3.5 w-3.5" />
                </span>
                <p className="text-sm font-medium text-muted-foreground">{item}</p>
              </div>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-8 rounded-2xl border border-border/60 bg-background/60 p-6 shadow-sm backdrop-blur">
            <div>
              <p className="text-3xl font-semibold">92%</p>
              <p className="text-sm text-muted-foreground">Average AI relevance score</p>
            </div>
            <div>
              <p className="text-3xl font-semibold">1-click</p>
              <p className="text-sm text-muted-foreground">Resume tailoring workflow</p>
            </div>
            <div>
              <p className="text-3xl font-semibold">4+</p>
              <p className="text-sm text-muted-foreground">Professional PDF templates</p>
            </div>
          </div>
        </div>

        <div className="relative mt-12 lg:mt-0">
          <div className="absolute inset-0 -z-10 rounded-[32px] bg-gradient-to-br from-primary/25 via-primary/5 to-secondary/40 opacity-70 blur-3xl" />
          <div className="relative overflow-hidden rounded-[32px] border border-border/70 bg-background/80 p-8 shadow-2xl shadow-primary/10 backdrop-blur-xl">
            <div className="flex items-center justify-between text-xs font-medium uppercase tracking-[0.35em] text-muted-foreground">
              <span>Resume insight</span>
              <span className="rounded-full bg-emerald-500/10 px-3 py-1 text-[0.7rem] font-semibold text-emerald-500">
                Live preview
              </span>
            </div>

            <div className="mt-6 space-y-4">
              {previewItems.map((item) => (
                <div
                  key={item.label}
                  className="rounded-2xl border border-border/70 bg-gradient-to-br from-background/90 via-background to-muted/40 p-5 shadow-sm"
                >
                  <div className="flex items-center justify-between text-xs font-semibold text-muted-foreground">
                    <span>{item.label}</span>
                    <span className="rounded-full bg-primary/10 px-3 py-1 text-primary">
                      {item.percentage}
                    </span>
                  </div>
                  <p className="mt-3 text-sm font-medium text-foreground">{item.descriptor}</p>
                  <div className="mt-4 flex flex-wrap gap-2">
                    {item.skills.map((skill) => (
                      <span
                        key={skill}
                        className="rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-[0.7rem] font-medium text-primary"
                      >
                        {skill}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-6 space-y-3 rounded-3xl border border-dashed border-border/60 bg-muted/10 p-6">
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>Export queue</span>
                <span>PDF • DOCX</span>
              </div>
              <div className="space-y-2">
                <div className="h-2 rounded-full bg-muted">
                  <div className="h-full w-[78%] rounded-full bg-primary" />
                </div>
                <div className="h-2 rounded-full bg-muted">
                  <div className="h-full w-[54%] rounded-full bg-secondary" />
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                Generated resumes are stored securely in your workspace with version history and quick share links.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
