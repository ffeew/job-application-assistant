"use client";

import { Badge } from "@/components/ui/badge";
import { Upload, Search, Sparkles } from "lucide-react";
import { useScrollAnimation } from "@/app/hooks/use-scroll-animation";

const steps = [
	{
		icon: Upload,
		number: "01",
		title: "Import your profile",
		description:
			"Upload your existing resume or build your profile from scratch. Add work experience, skills, education, and achievements once.",
	},
	{
		icon: Search,
		number: "02",
		title: "Paste a job listing",
		description:
			"Copy any job description and let our AI analyze the requirements. We identify key skills, qualifications, and culture signals.",
	},
	{
		icon: Sparkles,
		number: "03",
		title: "Get a tailored resume",
		description:
			"Receive an optimized resume highlighting your most relevant experiences. Export as PDF, edit manually, or regenerate with a different focus.",
	},
];

export function HowItWorksSection() {
	const { ref, isVisible } = useScrollAnimation();

	return (
		<section
			id="how-it-works"
			ref={ref}
			className="relative bg-accent/5 py-20 sm:py-28 lg:py-36"
		>
			<div className="container mx-auto px-4">
				<div
					className={`mx-auto mb-16 max-w-2xl text-center lg:mb-20 ${isVisible ? "animate-fade-in-up" : "before-animate"}`}
				>
					<Badge
						variant="secondary"
						className="mb-4 rounded-full px-4 py-1 text-xs uppercase tracking-wider"
					>
						How it works
					</Badge>
					<h2 className="font-display text-balance text-4xl leading-tight md:text-5xl">
						Three steps to better applications
					</h2>
					<p className="mt-6 text-lg leading-relaxed text-muted-foreground">
						Stop sending generic resumes. Start matching each opportunity with
						precision.
					</p>
				</div>

				<div className="mx-auto grid max-w-5xl gap-8 md:grid-cols-3 md:gap-6">
					{steps.map((step, index) => {
						const Icon = step.icon;
						return (
							<div
								key={step.number}
								className={`group relative flex flex-col gap-6 rounded-3xl border border-border/60 bg-background p-8 transition-all duration-300 hover:-translate-y-2 hover:border-primary/40 hover:shadow-xl ${isVisible ? `animate-fade-in-up stagger-${index + 1}` : "before-animate"}`}
							>
								<div className="absolute right-6 top-6 font-display text-6xl leading-none text-border/80 transition-colors group-hover:text-primary/20">
									{step.number}
								</div>

								<div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10">
									<Icon className="h-7 w-7 text-primary" />
								</div>

								<div className="relative z-10">
									<h3 className="font-display text-2xl leading-tight">
										{step.title}
									</h3>
									<p className="mt-3 text-base leading-relaxed text-muted-foreground">
										{step.description}
									</p>
								</div>
							</div>
						);
					})}
				</div>
			</div>
		</section>
	);
}
