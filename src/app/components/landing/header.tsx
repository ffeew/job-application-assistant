import Link from "next/link";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { Wordmark } from "@/components/wordmark";
import { HeaderActions } from "./header-actions";
import { REPOSITORY_URL, sectionLinks } from "./links";

export function Header({ signUpOpen }: { signUpOpen: boolean }) {
  return (
    <header className="mx-auto flex w-full max-w-7xl items-center justify-between gap-6 px-5 py-5 sm:px-8">
      <Link href="/" className="rounded-sm">
        <Wordmark />
      </Link>

      <nav
        aria-label="Page sections"
        className="hidden items-center gap-7 text-sm font-medium md:flex"
      >
        {sectionLinks.map((link) => (
          <a
            key={link.href}
            href={link.href}
            className="hover:text-link rounded-sm transition-colors"
          >
            {link.label}
          </a>
        ))}
        <a
          href={REPOSITORY_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="hover:text-link rounded-sm transition-colors"
        >
          GitHub
        </a>
      </nav>

      <div className="flex items-center gap-1">
        <ThemeToggle />
        <HeaderActions signUpOpen={signUpOpen} />
      </div>
    </header>
  );
}
