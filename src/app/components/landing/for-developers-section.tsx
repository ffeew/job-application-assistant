"use client";

import { Badge } from "@/components/ui/badge";
import {
	Collapsible,
	CollapsibleContent,
	CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
	Layers,
	Code,
	Database,
	Zap,
	ChevronDown,
	Settings,
} from "lucide-react";
import { GithubIcon } from "@/components/ui/github-icon";

const technologies = [
	{
		icon: Layers,
		title: "Next.js 15",
		description: "App Router, Server Components, Turbopack",
	},
	{
		icon: Code,
		title: "TypeScript",
		description: "Strict typing across the full stack",
	},
	{
		icon: Database,
		title: "Turso + Drizzle",
		description: "Edge SQLite with type-safe queries",
	},
	{
		icon: Zap,
		title: "Groq AI",
		description: "High-performance AI inference",
	},
];

const supportingTech = [
	"BetterAuth",
	"Tailwind CSS v4",
	"Zustand",
	"React Query",
	"React Hook Form",
	"Zod",
	"Puppeteer",
];

const steps = [
	{
		icon: GithubIcon,
		title: "Clone & deploy",
		description:
			"Fork the repository, install dependencies with Bun, and deploy to Vercel or your preferred host.",
	},
	{
		icon: Settings,
		title: "Configure & connect",
		description:
			"Provision a Turso database, add Groq credentials, and run Drizzle migrations.",
	},
	{
		icon: Code,
		title: "Customize & contribute",
		description:
			"Tailor AI prompts, extend UI modules, and open pull requests with improvements.",
	},
];

export function ForDevelopersSection() {
	return (
		<section className="border-t border-border/60 bg-muted/10 py-16 sm:py-20">
			<div className="container mx-auto px-4">
				<Collapsible>
					<CollapsibleTrigger asChild>
						<button className="group mx-auto flex w-full max-w-3xl items-center justify-between rounded-2xl border border-border/60 bg-background px-6 py-5 text-left transition-all duration-300 hover:border-primary/40 hover:shadow-md">
							<div className="flex items-center gap-4">
								<Badge
									variant="secondary"
									className="rounded-full px-3 py-1 text-xs uppercase tracking-wider"
								>
									Developers
								</Badge>
								<span className="font-bold text-xl tracking-tight md:text-2xl">
									Built for developers
								</span>
							</div>
							<ChevronDown className="h-5 w-5 text-muted-foreground transition-transform duration-300 group-data-[state=open]:rotate-180" />
						</button>
					</CollapsibleTrigger>
					<CollapsibleContent className="mx-auto mt-10 max-w-5xl">
					{/* Tech stack grid */}
					<div className="mb-10">
						<h3 className="mb-6 text-center text-sm font-semibold uppercase tracking-wider text-muted-foreground">
							Core Technologies
						</h3>
						<div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
							{technologies.map((tech) => {
								const Icon = tech.icon;
								return (
									<div
										key={tech.title}
										className="flex items-start gap-3 rounded-xl border border-border/60 bg-background p-4"
									>
										<div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-primary/10">
											<Icon className="h-5 w-5 text-primary" />
										</div>
										<div>
											<p className="font-medium">{tech.title}</p>
											<p className="text-xs text-muted-foreground">
												{tech.description}
											</p>
										</div>
									</div>
								);
							})}
						</div>
					</div>

					{/* Supporting tech pills */}
					<div className="mb-10 flex flex-wrap items-center justify-center gap-2">
						{supportingTech.map((tech) => (
							<span
								key={tech}
								className="rounded-full border border-border/60 bg-muted/40 px-4 py-1.5 text-xs font-medium text-muted-foreground"
							>
								{tech}
							</span>
						))}
					</div>

					{/* Getting started steps */}
					<div>
						<h3 className="mb-6 text-center text-sm font-semibold uppercase tracking-wider text-muted-foreground">
							Getting Started
						</h3>
						<div className="grid grid-cols-1 gap-4 md:grid-cols-3">
							{steps.map((step, index) => {
								const Icon = step.icon;
								return (
									<div
										key={step.title}
										className="flex flex-col gap-3 rounded-xl border border-border/60 bg-background p-5"
									>
										<div className="flex items-center gap-3">
											<span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
												{index + 1}
											</span>
											<Icon className="h-4 w-4 text-muted-foreground" />
										</div>
										<h4 className="font-medium">{step.title}</h4>
										<p className="text-sm leading-relaxed text-muted-foreground">
											{step.description}
										</p>
									</div>
								);
							})}
						</div>
					</div>
					</CollapsibleContent>
				</Collapsible>
			</div>
		</section>
	);
}
