import { Badge } from "@/components/ui/badge";
import { CommunityCard } from "./shared/community-card";
import { BookOpen, Users } from "lucide-react";
import { GithubIcon } from "@/components/ui/github-icon";

const communityItems = [
  {
    icon: GithubIcon,
    title: "Contribute code",
    description:
      "Submit pull requests, tackle issues, or design new workflows that improve the product for everyone.",
    buttonText: "View repository",
    buttonLink: "https://github.com/ffeew/job-application-assistant",
    iconBgColor: "bg-blue-100 dark:bg-blue-900",
    iconColor: "text-blue-600 dark:text-blue-400",
  },
  {
    icon: BookOpen,
    title: "Level up docs",
    description:
      "Write guides, record walkthroughs, and keep AGENTS.md accurate so contributors can ramp faster.",
    buttonText: "Read docs",
    buttonLink: "https://github.com/ffeew/job-application-assistant/docs",
    iconBgColor: "bg-green-100 dark:bg-green-900",
    iconColor: "text-green-600 dark:text-green-400",
  },
  {
    icon: Users,
    title: "Share feedback",
    description:
      "Report bugs, propose features, or start discussions. Your insights shape the roadmap.",
    buttonText: "Open issues",
    buttonLink: "https://github.com/ffeew/job-application-assistant/issues",
    iconBgColor: "bg-purple-100 dark:bg-purple-900",
    iconColor: "text-purple-600 dark:text-purple-400",
  },
];

export function CommunitySection() {
  return (
    <section
      id="community"
      className="relative overflow-hidden bg-muted/30 py-24 sm:py-28"
    >
      <div className="absolute inset-0 -z-10 bg-gradient-to-b from-muted/40 via-transparent to-background" />
      <div className="container relative mx-auto px-4">
        <div className="mx-auto mb-16 max-w-3xl text-center">
          <Badge
            variant="secondary"
            className="rounded-full px-4 py-1 text-xs tracking-[0.3em]"
          >
            COMMUNITY
          </Badge>
          <h2 className="mt-6 text-balance text-3xl font-semibold leading-tight md:text-4xl">
            Build alongside a thriving contributor network
          </h2>
          <p className="mt-4 text-lg text-muted-foreground">
            Join engineers, designers, and job seekers shaping the assistant. Collaborate in code, documentation, and strategy.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3 xl:gap-7">
          {communityItems.map((item) => (
            <CommunityCard key={item.title} {...item} />
          ))}
        </div>
      </div>
    </section>
  );
}
