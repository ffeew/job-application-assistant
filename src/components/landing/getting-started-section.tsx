import { StepCard } from "./shared/step-card";
import {
  Settings,
  Code,
} from "lucide-react";
import { GithubIcon } from "@/components/ui/github-icon";

const steps = [
  {
    icon: GithubIcon,
    title: "Clone & Deploy",
    description: "Clone the repository from Github and deploy to your preferred platform (Vercel, Netlify, or self-hosted server)."
  },
  {
    icon: Settings,
    title: "Configure & Setup",
    description: "Set up your environment variables, configure your database connection, and customize the AI models for your needs."
  },
  {
    icon: Code,
    title: "Use & Contribute",
    description: "Start managing your job applications and contribute back to the open source community with improvements and features."
  }
];

export function GettingStartedSection() {
  return (
    <section className="py-20 bg-muted/20">
      <div className="container mx-auto px-4">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Getting Started
          </h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Self-host your own job application assistant with our simple
            deployment process.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
          {steps.map((step, index) => (
            <StepCard key={index} {...step} />
          ))}
        </div>
      </div>
    </section>
  );
}