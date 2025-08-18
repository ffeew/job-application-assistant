import { CommunityCard } from "./shared/community-card";
import {
  BookOpen,
  Users,
} from "lucide-react";
import { GithubIcon } from "@/components/ui/github-icon";

const communityItems = [
  {
    icon: GithubIcon,
    title: "Contribute Code",
    description: "Submit pull requests, fix bugs, or add new features to help improve the platform.",
    buttonText: "View Repository",
    buttonLink: "https://github.com/ffeew/job-application-assistant",
    iconBgColor: "bg-blue-100 dark:bg-blue-900",
    iconColor: "text-blue-600 dark:text-blue-400"
  },
  {
    icon: BookOpen,
    title: "Documentation",
    description: "Help improve documentation, write guides, or create tutorials for new users.",
    buttonText: "Read Docs",
    buttonLink: "https://github.com/ffeew/job-application-assistant/docs",
    iconBgColor: "bg-green-100 dark:bg-green-900",
    iconColor: "text-green-600 dark:text-green-400"
  },
  {
    icon: Users,
    title: "Report Issues",
    description: "Found a bug or have a feature request? Let us know through GitHub Issues.",
    buttonText: "Report Issue",
    buttonLink: "https://github.com/ffeew/job-application-assistant/issues",
    iconBgColor: "bg-purple-100 dark:bg-purple-900",
    iconColor: "text-purple-600 dark:text-purple-400"
  }
];

export function CommunitySection() {
  return (
    <section className="py-20 bg-muted/20">
      <div className="container mx-auto px-4">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Join the Community
          </h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Help improve the Job Application Assistant for everyone.
            Contributions, feedback, and ideas are always welcome!
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
          {communityItems.map((item, index) => (
            <CommunityCard key={index} {...item} />
          ))}
        </div>
      </div>
    </section>
  );
}