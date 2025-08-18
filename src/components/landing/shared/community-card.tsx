import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { LucideIcon } from "lucide-react";
import React from "react";

interface CommunityCardProps {
	icon: LucideIcon | React.ComponentType<{ className?: string; width?: number; height?: number; }>;
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
		<Card className="p-6 text-center border-0 shadow-lg hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
			<div
				className={`w-16 h-16 mx-auto mb-4 rounded-lg ${iconBgColor} flex items-center justify-center`}
			>
				<Icon className={`w-8 h-8 ${iconColor}`} />
			</div>
			<h3 className="text-lg font-semibold mb-2">{title}</h3>
			<p className="text-sm text-muted-foreground mb-4">{description}</p>
			<Button variant="outline" size="sm" asChild>
				<Link href={buttonLink} target="_blank">
					{buttonText}
				</Link>
			</Button>
		</Card>
	);
}
