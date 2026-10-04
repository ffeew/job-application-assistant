import type { ResumeDocument } from "./resume-document";

export function syntheticResume(bulletCount = 2): ResumeDocument {
  return {
    title: "Software Engineer Resume",
    name: "Alex Example",
    contacts: [
      {
        label: "Email",
        text: "alex@example.test",
        url: "mailto:alex@example.test",
      },
      {
        label: "GitHub",
        text: "https://example.test/alex",
        url: "https://example.test/alex",
      },
    ],
    summary: "Software engineer building reliable applications.",
    sections: [
      {
        kind: "work",
        title: "Work Experiences",
        entries: [
          {
            sourceId: "work:1",
            heading: "Example & Co., Software Engineer",
            subheading: "TypeScript, Python",
            dates: "Jan 2024 -- Present",
            details: [],
            links: [],
            bullets: Array.from({ length: bulletCount }, (_, index) => ({
              sourceId: `work:1:bullet:${index}`,
              text: `Co-led *Example Portal* development; reduced processing time by **20%** for ${index + 1} teams.`,
            })),
          },
        ],
      },
    ],
  };
}
