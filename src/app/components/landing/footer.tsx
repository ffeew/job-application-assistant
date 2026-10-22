import Link from "next/link";
import { Button } from "@/components/ui/button";
import { GithubIcon } from "@/components/ui/github-icon";
import { Wordmark } from "@/components/wordmark";
import { projectLinks, REPOSITORY_URL } from "./links";

export function Footer({ signUpOpen }: { signUpOpen: boolean }) {
  return (
    <footer>
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-5 py-16 sm:px-8 md:flex-row md:items-center md:justify-between lg:py-20">
        <h2 className="title text-4xl leading-none sm:text-5xl">
          Start with your profile
        </h2>
        <div className="flex flex-wrap gap-3">
          <Button size="lg" asChild>
            {signUpOpen ? (
              <Link href="/sign-up">Create account</Link>
            ) : (
              <Link href="/sign-in">Sign in</Link>
            )}
          </Button>
          <Button size="lg" variant="outline" asChild>
            <a href={REPOSITORY_URL} target="_blank" rel="noopener noreferrer">
              <GithubIcon className="size-4" width={16} height={16} />
              View source on GitHub
            </a>
          </Button>
        </div>
      </div>

      <div className="band">
        <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-5 py-8 sm:px-8 md:flex-row md:items-center md:justify-between">
          <Wordmark />
          <nav aria-label="Project links">
            <ul className="flex flex-wrap gap-x-6 gap-y-2 text-sm">
              {projectLinks.map((link) => (
                <li key={link.label}>
                  <a
                    href={link.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-muted-foreground hover:text-foreground rounded-sm transition-colors"
                  >
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </nav>
        </div>
      </div>
    </footer>
  );
}
