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
    description: "Create professional, ATS-optimized resumes with our intelligent builder. Choose from multiple templates and customize for each application.",
    benefits: [
      "Multiple professional templates",
      "ATS optimization",
      "PDF export ready"
    ],
    iconBgColor: "bg-blue-100 dark:bg-blue-900",
    iconColor: "text-blue-600 dark:text-blue-400"
  },
  {
    icon: PenTool,
    title: "AI Cover Letters",
    description: "Generate personalized, compelling cover letters in seconds using advanced AI tailored to specific job descriptions and company culture.",
    benefits: [
      "Job-specific customization",
      "Company research integration",
      "Multiple tone options"
    ],
    iconBgColor: "bg-purple-100 dark:bg-purple-900",
    iconColor: "text-purple-600 dark:text-purple-400"
  },
  {
    icon: BarChart3,
    title: "Application Tracking",
    description: "Never lose track of your applications again. Monitor status, set reminders, and analyze your job search performance with detailed analytics.",
    benefits: [
      "Visual pipeline tracking",
      "Automated reminders",
      "Success analytics"
    ],
    iconBgColor: "bg-green-100 dark:bg-green-900",
    iconColor: "text-green-600 dark:text-green-400"
  },
  {
    icon: Target,
    title: "Profile Management",
    description: "Centralize your professional information including work experience, education, skills, and achievements for quick resume customization.",
    benefits: [
      "Complete profile builder",
      "Skills assessment",
      "Achievement tracking"
    ],
    iconBgColor: "bg-orange-100 dark:bg-orange-900",
    iconColor: "text-orange-600 dark:text-orange-400"
  },
  {
    icon: TrendingUp,
    title: "Success Analytics",
    description: "Track your job search performance with detailed metrics, identify what works, and optimize your approach for better results.",
    benefits: [
      "Response rate tracking",
      "Interview conversion",
      "Performance insights"
    ],
    iconBgColor: "bg-indigo-100 dark:bg-indigo-900",
    iconColor: "text-indigo-600 dark:text-indigo-400"
  },
  {
    icon: Zap,
    title: "Fast & Secure",
    description: "Built with modern technology for lightning-fast performance. Your data is encrypted and secure with enterprise-grade protection.",
    benefits: [
      "End-to-end encryption",
      "GDPR compliant",
      "Lightning fast"
    ],
    iconBgColor: "bg-red-100 dark:bg-red-900",
    iconColor: "text-red-600 dark:text-red-400"
  }
];

export function FeaturesSection() {
  return (
    <section className="py-20 bg-background">
      <div className="container mx-auto px-4">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Everything You Need to Land Your Next Role
          </h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Our comprehensive suite of tools helps you create compelling
            applications and track your progress throughout your job search
            journey.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((feature, index) => (
            <FeatureCard key={index} {...feature} />
          ))}
        </div>
      </div>
    </section>
  );
}