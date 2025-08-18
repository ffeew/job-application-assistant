import { TechCard } from "./shared/tech-card";
import { Layers, Code, Database, Zap } from "lucide-react";

const mainTechnologies = [
	{
		icon: Layers,
		title: "Next.js 15",
		description:
			"React framework with App Router, Server Components, and Turbopack",
		iconBgColor: "bg-blue-100 dark:bg-blue-900",
		iconColor: "text-blue-600 dark:text-blue-400",
	},
	{
		icon: Code,
		title: "TypeScript",
		description:
			"Full type safety with strict mode and comprehensive type definitions",
		iconBgColor: "bg-purple-100 dark:bg-purple-900",
		iconColor: "text-purple-600 dark:text-purple-400",
	},
	{
		icon: Database,
		title: "Turso + Drizzle",
		description:
			"SQLite database with type-safe ORM and edge-ready performance",
		iconBgColor: "bg-green-100 dark:bg-green-900",
		iconColor: "text-green-600 dark:text-green-400",
	},
	{
		icon: Zap,
		title: "AI Integration",
		description:
			"Groq AI models for cover letter generation and resume optimization",
		iconBgColor: "bg-orange-100 dark:bg-orange-900",
		iconColor: "text-orange-600 dark:text-orange-400",
	},
];

const supportingTechnologies = [
	{ label: "Authentication", value: "BetterAuth" },
	{ label: "Styling", value: "Tailwind CSS v4" },
	{ label: "Data Fetching", value: "React Query" },
	{ label: "Forms", value: "React Hook Form" },
];

export function TechStackSection() {
	return (
		<section className="py-20 bg-background">
			<div className="container mx-auto px-4">
				<div className="text-center mb-16">
					<h2 className="text-3xl md:text-4xl font-bold mb-4">
						Modern Technology Stack
					</h2>
					<p className="text-xl text-muted-foreground max-w-2xl mx-auto">
						Built with cutting-edge technologies for performance, scalability,
						and developer experience.
					</p>
				</div>

				<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 max-w-6xl mx-auto">
					{mainTechnologies.map((tech, index) => (
						<TechCard key={index} {...tech} />
					))}
				</div>

				<div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-4xl mx-auto mt-12">
					{supportingTechnologies.map((tech, index) => (
						<div key={index} className="text-center p-4">
							<div className="font-medium text-sm">{tech.label}</div>
							<div className="text-xs text-muted-foreground">{tech.value}</div>
						</div>
					))}
				</div>
			</div>
		</section>
	);
}
