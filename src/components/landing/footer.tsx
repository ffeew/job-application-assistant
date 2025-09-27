import Link from "next/link";
import { Briefcase, Mail } from "lucide-react";
import { GithubIcon } from "@/components/ui/github-icon";
import { Button } from "@/components/ui/button";

const projectLinks = [
  { href: "/dashboard", label: "Live demo" },
  {
    href: "https://github.com/ffeew/job-application-assistant",
    label: "Repository",
    external: true,
  },
  {
    href: "https://github.com/ffeew/job-application-assistant/releases",
    label: "Releases",
    external: true,
  },
  {
    href: "https://github.com/ffeew/job-application-assistant/blob/main/CHANGELOG.md",
    label: "Changelog",
    external: true,
  },
];

const communityLinks = [
  {
    href: "https://github.com/ffeew/job-application-assistant/docs",
    label: "Documentation",
    external: true,
  },
  {
    href: "https://github.com/ffeew/job-application-assistant/issues",
    label: "Issues",
    external: true,
  },
  {
    href: "https://github.com/ffeew/job-application-assistant/discussions",
    label: "Discussions",
    external: true,
  },
  {
    href: "https://github.com/ffeew/job-application-assistant?tab=readme-ov-file#-contributing",
    label: "Contributing",
    external: true,
  },
];

export function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="relative border-t border-border/60 bg-gradient-to-b from-background via-muted/40 to-background py-20">
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/40 to-transparent" />
      <div className="container mx-auto px-4">
        <div className="mx-auto mb-16 max-w-5xl overflow-hidden rounded-3xl border border-primary/30 bg-gradient-to-br from-primary/10 via-primary/5 to-transparent p-10 shadow-2xl shadow-primary/20">
          <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
            <div className="max-w-2xl">
              <p className="text-sm font-semibold uppercase tracking-[0.3em] text-primary">
                Ready to streamline applications?
              </p>
              <h3 className="mt-3 text-2xl font-semibold text-foreground md:text-3xl">
                Spin up your private assistant, tailor every resume, and keep momentum with one workflow.
              </h3>
            </div>
            <div className="flex flex-wrap gap-3">
              <Button asChild size="lg" className="rounded-full px-7">
                <Link href="/sign-up">Create workspace</Link>
              </Button>
              <Button
                asChild
                variant="outline"
                size="lg"
                className="rounded-full border-border/70 px-7"
              >
                <Link href="https://github.com/ffeew/job-application-assistant/projects" target="_blank">
                  View roadmap
                </Link>
              </Button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-10 lg:grid-cols-[1.5fr_1fr_1fr]">
          <div className="space-y-6">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                <Briefcase className="h-5 w-5" />
              </span>
              <div>
                <h3 className="text-lg font-semibold">Job Application Assistant</h3>
                <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">
                  Open source • Self-hosted • AI native
                </p>
              </div>
            </div>
            <p className="max-w-lg text-sm text-muted-foreground">
              Manage profiles, tailor resumes, write cover letters, and track every application in a unified AI-powered cockpit.
            </p>
            <div className="flex items-center gap-3">
              <Link
                href="https://github.com/ffeew/job-application-assistant"
                target="_blank"
                className="flex h-9 w-9 items-center justify-center rounded-full border border-border/60 text-muted-foreground transition-colors hover:border-foreground hover:text-foreground"
              >
                <GithubIcon className="h-4 w-4" width={16} height={16} />
              </Link>
              <Link
                href="mailto:contact@example.com"
                className="flex h-9 w-9 items-center justify-center rounded-full border border-border/60 text-muted-foreground transition-colors hover:border-foreground hover:text-foreground"
              >
                <Mail className="h-4 w-4" />
              </Link>
            </div>
          </div>

          <div>
            <h4 className="text-sm font-semibold uppercase tracking-[0.3em] text-muted-foreground">
              Project
            </h4>
            <ul className="mt-4 space-y-3 text-sm text-muted-foreground">
              {projectLinks.map((link) => (
                <li key={link.label}>
                  <Link
                    href={link.href}
                    {...(link.external ? { target: "_blank" } : {})}
                    className="transition-colors hover:text-foreground"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="text-sm font-semibold uppercase tracking-[0.3em] text-muted-foreground">
              Community
            </h4>
            <ul className="mt-4 space-y-3 text-sm text-muted-foreground">
              {communityLinks.map((link) => (
                <li key={link.label}>
                  <Link
                    href={link.href}
                    {...(link.external ? { target: "_blank" } : {})}
                    className="transition-colors hover:text-foreground"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="mt-16 flex flex-col gap-3 border-t border-border/60 pt-6 text-sm text-muted-foreground md:flex-row md:items-center md:justify-between">
          <p>© {year} Job Application Assistant. Released under the MIT License.</p>
          <p className="text-xs">
            Crafted with Next.js, Tailwind, Turso, Drizzle, and Groq.
          </p>
        </div>
      </div>
    </footer>
  );
}
