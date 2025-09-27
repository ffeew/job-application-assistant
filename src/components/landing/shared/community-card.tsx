import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { LucideIcon } from "lucide-react";
import React from "react";

interface CommunityCardProps {
  icon: LucideIcon | React.ComponentType<{ className?: string; width?: number; height?: number }>;
  title: string;
  description: string;
  buttonText: string;
  buttonLink: string;
  iconBgColor: string;
  iconColor: string;
}

export function CommunityCard({
  icon: Icon,
  title,
  description,
  buttonText,
  buttonLink,
  iconBgColor,
  iconColor,
}: CommunityCardProps) {
  return (
    <Card className="group h-full rounded-3xl border border-border/60 bg-background/80 p-6 text-left shadow-lg shadow-primary/5 transition-all duration-300 hover:-translate-y-1 hover:border-primary/60 hover:shadow-2xl">
      <div className="flex items-center gap-4">
        <div
          className={`flex h-12 w-12 items-center justify-center rounded-2xl ${iconBgColor} transition-transform duration-300 group-hover:scale-110`}
        >
          <Icon className={`h-6 w-6 ${iconColor}`} />
        </div>
        <div>
          <h3 className="text-lg font-semibold leading-tight">{title}</h3>
          <p className="mt-2 text-sm text-muted-foreground">{description}</p>
        </div>
      </div>
      <div className="mt-6 flex items-center justify-between gap-3">
        <span className="rounded-full border border-dashed border-primary/40 bg-primary/5 px-3 py-1 text-xs font-medium uppercase tracking-[0.3em] text-primary">
          Get involved
        </span>
        <Button variant="outline" size="sm" className="rounded-full" asChild>
          <Link href={buttonLink} target="_blank">
            {buttonText}
          </Link>
        </Button>
      </div>
    </Card>
  );
}
