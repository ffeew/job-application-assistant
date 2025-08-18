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
}

export function FeatureCard({
	icon: Icon,
	title,
	description,
	benefits,
	iconBgColor,
	iconColor,
}: FeatureCardProps) {
	return (
		<Card className="relative overflow-hidden border-0 shadow-lg hover:shadow-xl hover:-translate-y-1 transition-all duration-300 group">
			<CardHeader>
				<div
					className={`w-12 h-12 rounded-lg ${iconBgColor} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300`}
				>
					<Icon className={`w-6 h-6 ${iconColor}`} />
				</div>
				<CardTitle className="text-xl">{title}</CardTitle>
			</CardHeader>
			<CardContent>
				<CardDescription className="text-base leading-relaxed mb-4">
					{description}
				</CardDescription>
				<ul className="space-y-2 text-sm text-muted-foreground">
					{benefits.map((benefit, index) => (
						<li key={index} className="flex items-center">
							<CheckCircle className="w-4 h-4 text-green-500 mr-2 flex-shrink-0" />
							{benefit}
						</li>
					))}
				</ul>
			</CardContent>
		</Card>
	);
}
