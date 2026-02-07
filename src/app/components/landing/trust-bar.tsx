import { Star, Users, Shield } from "lucide-react";

const stats = [
	{ icon: Shield, label: "Open source", value: "MIT License" },
	{ icon: Star, label: "Self-hosted", value: "Full control" },
	{ icon: Users, label: "Privacy-first", value: "Your data stays yours" },
];

export function TrustBar() {
	return (
		<section className="border-y border-border/60 bg-accent/5 py-6 sm:py-8">
			<div className="container mx-auto px-4">
				<div className="flex flex-wrap items-center justify-center gap-8 md:gap-12 lg:gap-16">
					{stats.map((stat) => {
						const Icon = stat.icon;
						return (
							<div
								key={stat.label}
								className="flex items-center gap-3 text-sm"
							>
								<Icon className="h-4 w-4 flex-shrink-0 text-primary" />
								<div>
									<p className="font-medium text-foreground">{stat.value}</p>
									<p className="text-xs text-muted-foreground">{stat.label}</p>
								</div>
							</div>
						);
					})}
				</div>
			</div>
		</section>
	);
}
