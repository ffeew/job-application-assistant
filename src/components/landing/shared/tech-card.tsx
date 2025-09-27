import { Card } from "@/components/ui/card";
import { LucideIcon } from "lucide-react";

interface TechCardProps {
  icon: LucideIcon;
  title: string;
  description: string;
  iconBgColor: string;
  iconColor: string;
}

export function TechCard({
  icon: Icon,
  title,
  description,
  iconBgColor,
  iconColor,
}: TechCardProps) {
  return (
    <Card className="group flex h-full flex-col items-center rounded-3xl border border-border/60 bg-gradient-to-br from-background via-background to-muted/50 p-6 text-center shadow-lg shadow-primary/5 transition-all duration-300 hover:-translate-y-1 hover:border-primary/60 hover:shadow-2xl">
      <div
        className={`mb-5 flex h-16 w-16 items-center justify-center rounded-2xl ${iconBgColor} transition-transform duration-300 group-hover:scale-110`}
      >
        <Icon className={`h-8 w-8 ${iconColor}`} />
      </div>
      <h3 className="text-lg font-semibold">{title}</h3>
      <p className="mt-2 text-sm text-muted-foreground">{description}</p>
    </Card>
  );
}
