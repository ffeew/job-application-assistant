export const REPOSITORY_URL = "https://github.com/ffeew/job-application-assistant";

export const sectionLinks = [
  { href: "#how-it-works", label: "How it works" },
  { href: "#self-hosting", label: "Self-hosting" },
] as const;

export const projectLinks = [
  { href: REPOSITORY_URL, label: "GitHub" },
  { href: `${REPOSITORY_URL}#readme`, label: "Documentation" },
  { href: `${REPOSITORY_URL}/issues`, label: "Issues" },
  { href: `${REPOSITORY_URL}/releases`, label: "Releases" },
] as const;
