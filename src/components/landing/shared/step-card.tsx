import { LucideIcon } from "lucide-react";
import React from "react";

interface StepCardProps {
  icon: LucideIcon | React.ComponentType<{ className?: string; width?: number; height?: number; }>;
  title: string;
  description: string;
}

export function StepCard({ icon: Icon, title, description }: StepCardProps) {
  return (
    <div className="text-center group">
      <div className="w-16 h-16 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-2xl font-bold mx-auto mb-6 group-hover:scale-110 transition-transform duration-300">
        <Icon className="w-6 h-6" />
      </div>
      <h3 className="text-xl font-semibold mb-4">{title}</h3>
      <p className="text-muted-foreground leading-relaxed">{description}</p>
    </div>
  );
}