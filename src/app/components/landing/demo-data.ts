// Synthetic candidate and listings for the landing page demo. Nothing here is
// real candidate data; names and employers are invented.

export interface DemoBullet {
  id: string;
  text: string;
}

export interface DemoRole {
  id: string;
  /** Matches the template's entry heading: "Company, Job title". */
  heading: string;
  dates: string;
  bullets: DemoBullet[];
}

export interface DemoListing {
  id: string;
  title: string;
  company: string;
  body: string;
  phrases: string[];
  summary: string;
  bulletIds: string[];
  skills: string[];
  matched: string[];
  revisions: number;
}

export const demoProfile = {
  name: "Alex Example",
  // The template sets contacts two to a line.
  contactLines: [
    ["Email: alex@example.com", "Phone: +1 555 0100"],
    [
      "LinkedIn: linkedin.com/in/alex-example",
      "GitHub: github.com/alex-example",
    ],
  ],
  education: {
    heading: "Example State University",
    subheading: "BSc, Computer Science",
    dates: "2012 - 2016",
  },
  roles: [
    {
      id: "r1",
      heading: "Vantry Logistics, Senior Software Engineer",
      dates: "Mar 2021 - Present",
      bullets: [
        {
          id: "r1-platform",
          text: "Run the Kubernetes platform that 40 engineers deploy to across three regions.",
        },
        {
          id: "r1-deploys",
          text: "Cut median deploy time from 25 to 6 minutes by rebuilding the CI pipeline.",
        },
        {
          id: "r1-oncall",
          text: "Led the on-call rotation and wrote the incident runbooks; weekly pages fell by half.",
        },
        {
          id: "r1-payments",
          text: "Built the payment reconciliation service in Go, handling 2 million transactions a day.",
        },
        {
          id: "r1-mentoring",
          text: "Mentored four engineers, two of whom were promoted to senior.",
        },
        {
          id: "r1-planning",
          text: "Ran quarterly planning for a team of seven with product and design.",
        },
      ],
    },
    {
      id: "r2",
      heading: "Pellow Pay, Software Engineer",
      dates: "Jun 2018 - Feb 2021",
      bullets: [
        {
          id: "r2-ledger",
          text: "Designed the idempotent ledger API behind card refunds in Go and PostgreSQL.",
        },
        {
          id: "r2-migration",
          text: "Moved 300 services from virtual machines to Kubernetes with no customer downtime.",
        },
        {
          id: "r2-latency",
          text: "Reduced PostgreSQL query latency by 60% through partitioning and index changes.",
        },
        {
          id: "r2-pci",
          text: "Brought the checkout service to PCI DSS compliance ahead of its audit.",
        },
        {
          id: "r2-hiring",
          text: "Interviewed 50 candidates and redesigned the backend take-home exercise.",
        },
      ],
    },
    {
      id: "r3",
      heading: "Orrin Labs, Junior Developer",
      dates: "Aug 2016 - May 2018",
      bullets: [
        {
          id: "r3-terraform",
          text: "Wrote the Terraform modules that create staging environments.",
        },
        {
          id: "r3-dashboards",
          text: "Shipped support dashboards in TypeScript and React.",
        },
        {
          id: "r3-tests",
          text: "Raised integration test coverage of the billing module from 40% to 85%.",
        },
      ],
    },
  ] satisfies DemoRole[],
  skills: [
    "Go",
    "PostgreSQL",
    "Kubernetes",
    "Terraform",
    "CI/CD",
    "AWS",
    "Prometheus",
    "Linux",
    "API design",
    "PCI DSS",
    "Kafka",
    "TypeScript",
    "Mentoring",
    "Hiring",
    "Incident response",
    "Roadmap planning",
  ],
};

export const demoListings: DemoListing[] = [
  {
    id: "platform",
    title: "Platform engineer",
    company: "Arvo Robotics",
    body: "Our fleet software runs on Kubernetes in several regions. You will own the CI/CD pipelines and deploy tooling, manage infrastructure with Terraform, and share the on-call rotation.",
    phrases: ["Kubernetes", "CI/CD pipelines", "Terraform", "on-call rotation"],
    summary:
      "Platform engineer who runs Kubernetes and deploy tooling for product teams.",
    bulletIds: [
      "r1-platform",
      "r1-deploys",
      "r1-oncall",
      "r2-migration",
      "r2-latency",
      "r3-terraform",
    ],
    skills: [
      "Kubernetes",
      "Terraform",
      "CI/CD",
      "AWS",
      "Prometheus",
      "Linux",
      "Go",
      "PostgreSQL",
    ],
    matched: [
      "Kubernetes",
      "CI pipeline",
      "on-call rotation",
      "Terraform",
      "CI/CD",
    ],
    revisions: 1,
  },
  {
    id: "payments",
    title: "Backend engineer, payments",
    company: "Mintline",
    body: "You will build payment services in Go on PostgreSQL, design idempotent APIs for moving money, and keep our card flows PCI DSS compliant.",
    phrases: [
      "payment services",
      "Go",
      "PostgreSQL",
      "idempotent APIs",
      "PCI DSS",
    ],
    summary:
      "Backend engineer who builds payment systems in Go and PostgreSQL.",
    bulletIds: [
      "r1-payments",
      "r1-deploys",
      "r2-ledger",
      "r2-latency",
      "r2-pci",
      "r3-tests",
    ],
    skills: [
      "Go",
      "PostgreSQL",
      "API design",
      "PCI DSS",
      "Kafka",
      "Kubernetes",
      "AWS",
      "TypeScript",
    ],
    matched: [
      "payment reconciliation service",
      "payment systems",
      "idempotent ledger API",
      "Go",
      "PostgreSQL",
      "PCI DSS",
    ],
    revisions: 2,
  },
  {
    id: "manager",
    title: "Engineering manager",
    company: "Corbel Health",
    body: "You will lead a team of seven engineers: mentoring, hiring, and planning with product and design. You stay close to delivery and to incident response.",
    phrases: ["mentoring", "hiring", "planning", "incident response"],
    summary:
      "Senior engineer moving into management after mentoring, hiring and planning for a team of seven.",
    bulletIds: [
      "r1-mentoring",
      "r1-planning",
      "r1-oncall",
      "r1-platform",
      "r2-hiring",
      "r2-pci",
    ],
    skills: [
      "Mentoring",
      "Hiring",
      "Roadmap planning",
      "Incident response",
      "Kubernetes",
      "Go",
      "PostgreSQL",
      "AWS",
    ],
    matched: [
      "Mentored four engineers",
      "quarterly planning",
      "incident runbooks",
      "Interviewed 50 candidates",
      "Mentoring",
      "Hiring",
      "Roadmap planning",
      "Incident response",
    ],
    revisions: 0,
  },
];

export const demoBulletCount = demoProfile.roles.reduce(
  (count, role) => count + role.bullets.length,
  0,
);

export interface TextSegment {
  text: string;
  marked: boolean;
}

const escapeRegExp = (value: string) =>
  value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/**
 * Splits text around whole-word phrase matches so they can be highlighted.
 * Longer phrases win, so "Go" never splits "idempotent ledger API in Go".
 */
export function splitByPhrases(text: string, phrases: string[]): TextSegment[] {
  if (phrases.length === 0) return [{ text, marked: false }];
  const pattern = new RegExp(
    `(?<![A-Za-z])(?:${[...phrases]
      .sort((a, b) => b.length - a.length)
      .map(escapeRegExp)
      .join("|")})(?![A-Za-z])`,
    "g",
  );
  const segments: TextSegment[] = [];
  let cursor = 0;
  for (const match of text.matchAll(pattern)) {
    if (match.index > cursor)
      segments.push({ text: text.slice(cursor, match.index), marked: false });
    segments.push({ text: match[0], marked: true });
    cursor = match.index + match[0].length;
  }
  if (cursor < text.length)
    segments.push({ text: text.slice(cursor), marked: false });
  return segments;
}

export function tailorRoles(listing: DemoListing): DemoRole[] {
  return demoProfile.roles.flatMap((role) => {
    const bullets = listing.bulletIds.flatMap((id) => {
      const bullet = role.bullets.find((item) => item.id === id);
      return bullet ? [bullet] : [];
    });
    return bullets.length > 0 ? [{ ...role, bullets }] : [];
  });
}
