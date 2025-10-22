import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { CheckCircle, LucideIcon } from "lucide-react";

interface FeatureCardProps {
  icon: LucideIcon;
  title: string;
  description: string;
  benefits: string[];
  iconBgColor: string;
  iconColor: string;
  index: number;
}

export function FeatureCard({
  icon: Icon,
  title,
  description,
  benefits,
  iconBgColor,
  iconColor,
  index,
}: FeatureCardProps) {
  return (
    <Card className="group relative flex h-full flex-col overflow-hidden rounded-3xl border border-border/60 bg-gradient-to-br from-background via-background to-muted/50 p-6 shadow-lg shadow-primary/5 transition-all duration-300 hover:-translate-y-1 hover:border-primary/60 hover:shadow-2xl">
      <CardHeader className="space-y-5 pb-0">
        <div className="flex items-center justify-between">
          <span className="flex h-9 w-9 items-center justify-center rounded-2xl bg-primary/10 text-xs font-semibold text-primary">
            {index.toString().padStart(2, "0")}
          </span>
          <div
            className={`flex h-12 w-12 items-center justify-center rounded-2xl ${iconBgColor} transition-transform duration-300 group-hover:scale-110`}
          >
            <Icon className={`h-6 w-6 ${iconColor}`} />
          </div>
        </div>
        <CardTitle className="text-xl font-semibold leading-tight">{title}</CardTitle>
      </CardHeader>
      <CardContent className="mt-5 flex flex-1 flex-col gap-5">
        <CardDescription className="text-sm leading-relaxed text-muted-foreground">
          {description}
        </CardDescription>
        <ul className="space-y-2 text-sm text-muted-foreground">
          {benefits.map((benefit) => (
            <li key={benefit} className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-emerald-500" />
              {benefit}
            </li>
          ))}
        </ul>
      </CardContent>
      <div className="absolute inset-x-6 bottom-0 h-px bg-gradient-to-r from-transparent via-primary/40 to-transparent" />
    </Card>
  );
}
