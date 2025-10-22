import { Badge } from "@/components/ui/badge";
import { FeatureCard } from "./shared/feature-card";
import {
  FileText,
  PenTool,
  BarChart3,
  Target,
  TrendingUp,
  Zap,
} from "lucide-react";

const features = [
  {
    icon: FileText,
    title: "Smart Resume Builder",
    description:
      "Create professional, ATS-optimized resumes with AI scoring, manual overrides, and instant previews tuned per application.",
    benefits: [
      "AI relevance scoring with reasoning",
      "Live preview + manual overrides",
      "1-click PDF or HTML export",
    ],
    iconBgColor: "bg-blue-100 dark:bg-blue-900",
    iconColor: "text-blue-600 dark:text-blue-400",
  },
  {
    icon: PenTool,
    title: "AI Cover Letters",
    description:
      "Generate compelling cover letters in seconds with AI that adapts to role, tone, and company culture.",
    benefits: [
      "Job-specific customization",
      "Company research integration",
      "Multiple tone options",
    ],
    iconBgColor: "bg-purple-100 dark:bg-purple-900",
    iconColor: "text-purple-600 dark:text-purple-400",
  },
  {
    icon: BarChart3,
    title: "Application Tracking",
    description:
      "Visualize every pipeline stage, set nudges, and surface insights that keep your search on track.",
    benefits: [
      "Visual pipeline tracking",
      "Automated reminders",
      "Success analytics",
    ],
    iconBgColor: "bg-green-100 dark:bg-green-900",
    iconColor: "text-green-600 dark:text-green-400",
  },
  {
    icon: Target,
    title: "Profile Management",
    description:
      "Centralize experience, skills, education, and achievements for instant reuse across resumes.",
    benefits: [
      "Complete profile builder",
      "Skills assessment",
      "Achievement tracking",
    ],
    iconBgColor: "bg-orange-100 dark:bg-orange-900",
    iconColor: "text-orange-600 dark:text-orange-400",
  },
  {
    icon: TrendingUp,
    title: "Success Analytics",
    description:
      "Understand what works with dashboards that track response rates, interviews, and offers.",
    benefits: [
      "Response rate tracking",
      "Interview conversion",
      "Performance insights",
    ],
    iconBgColor: "bg-indigo-100 dark:bg-indigo-900",
    iconColor: "text-indigo-600 dark:text-indigo-400",
  },
  {
    icon: Zap,
    title: "Fast & Secure",
    description:
      "Lightning-fast performance paired with enterprise-grade security and privacy controls.",
    benefits: [
      "End-to-end encryption",
      "GDPR compliant",
      "Lightning fast",
    ],
    iconBgColor: "bg-red-100 dark:bg-red-900",
    iconColor: "text-red-600 dark:text-red-400",
  },
];

export function FeaturesSection() {
  return (
    <section
      id="features"
      className="relative overflow-hidden bg-background py-24 sm:py-28"
    >
      <div className="absolute inset-0 -z-10 bg-gradient-to-b from-secondary/10 via-transparent to-background" />
      <div className="container relative mx-auto px-4">
        <div className="mx-auto mb-16 max-w-3xl text-center">
          <Badge
            variant="secondary"
            className="rounded-full px-4 py-1 text-xs tracking-[0.3em]"
          >
            WORKFLOW SUITE
          </Badge>
          <h2 className="mt-6 text-balance text-3xl font-semibold leading-tight md:text-4xl">
            Everything you need to craft magnetic applications
          </h2>
          <p className="mt-4 text-lg text-muted-foreground">
            Purpose-built modules cover the full lifecycle—from capturing experience to exporting personalized resumes and measuring outcomes.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
          {features.map((feature, index) => (
            <FeatureCard key={feature.title} index={index + 1} {...feature} />
          ))}
        </div>
      </div>
    </section>
  );
}
