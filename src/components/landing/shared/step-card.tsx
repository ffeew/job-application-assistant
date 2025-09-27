import { LucideIcon } from "lucide-react";
import React from "react";

interface StepCardProps {
  icon: LucideIcon | React.ComponentType<{ className?: string; width?: number; height?: number }>;
  title: string;
  description: string;
  stepNumber: number;
  isLast?: boolean;
}

export function StepCard({
  icon: Icon,
  title,
  description,
  stepNumber,
  isLast = false,
}: StepCardProps) {
  return (
    <div className="relative flex gap-4 md:gap-6">
      <div className="relative flex flex-col items-center">
        <span className="flex h-10 w-10 items-center justify-center rounded-full border border-primary/40 bg-primary/10 text-xs font-semibold text-primary">
          {stepNumber}
        </span>
        {!isLast && (
          <div className="hidden flex-1 md:flex md:flex-col md:items-center" aria-hidden="true">
            <span className="mx-auto mt-2 block h-full w-px bg-border/60" />
          </div>
        )}
      </div>
      <div className="group flex-1 rounded-3xl border border-border/60 bg-background/80 p-6 shadow-lg shadow-primary/5 transition-all duration-300 hover:-translate-y-1 hover:border-primary/60 hover:shadow-2xl">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <Icon className="h-5 w-5" />
            </span>
            <h3 className="text-lg font-semibold leading-tight">{title}</h3>
          </div>
          <span className="rounded-full border border-primary/20 bg-primary/5 px-3 py-1 text-xs font-medium uppercase tracking-wide text-primary">
            Step {stepNumber}
          </span>
        </div>
        <p className="mt-4 text-sm leading-relaxed text-muted-foreground">{description}</p>
      </div>
    </div>
  );
}
