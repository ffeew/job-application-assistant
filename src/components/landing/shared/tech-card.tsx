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
  iconColor 
}: TechCardProps) {
  return (
    <Card className="text-center p-6 border-0 shadow-md hover:shadow-lg hover:-translate-y-1 transition-all duration-300">
      <div className={`w-16 h-16 mx-auto mb-4 rounded-lg ${iconBgColor} flex items-center justify-center`}>
        <Icon className={`w-8 h-8 ${iconColor}`} />
      </div>
      <h3 className="font-semibold mb-2">{title}</h3>
      <p className="text-sm text-muted-foreground">{description}</p>
    </Card>
  );
}