"use client";

import { Badge } from "@/components/ui/badge";
import {
	FileText,
	PenTool,
	BarChart3,
	Target,
	Zap,
	CheckCircle,
	Shield,
} from "lucide-react";
import { useScrollAnimation } from "@/app/hooks/use-scroll-animation";

const heroFeatures = [
	{
		icon: FileText,
		title: "Smart Resume Builder",
		description:
			"Create ATS-optimized resumes with AI scoring and relevance analysis. Get intelligent suggestions for every job posting and see exactly why each experience matters.",
		benefits: [
			"AI-powered relevance scoring with explanations",
			"Live preview with manual override controls",
			"One-click PDF and HTML export",
		],
		imagePosition: "right" as const,
	},
	{
		icon: PenTool,
		title: "Instant Cover Letters",
		description:
			"Generate compelling, personalized cover letters in seconds. Our AI adapts to company culture, role requirements, and your unique voice.",
		benefits: [
			"Job-specific customization engine",
			"Company research integration",
			"Multiple tone and style options",
		],
		imagePosition: "left" as const,
	},
	{
		icon: BarChart3,
		title: "Application Tracking",
		description:
			"Visualize your entire job search pipeline at a glance. Set reminders, track response rates, and identify what\u2019s working.",
		benefits: [
			"Kanban-style pipeline visualization",
			"Automated follow-up reminders",
			"Success rate analytics",
		],
		imagePosition: "right" as const,
	},
];

const secondaryFeatures = [
	{
		icon: Target,
		title: "Profile Management",
		description:
			"Build a comprehensive profile once, reuse everywhere. Track all your experiences, skills, and achievements in one place.",
	},
	{
		icon: Zap,
		title: "Lightning Fast",
		description:
			"Instant previews, real-time updates, and optimized performance. No waiting around while job hunting.",
	},
	{
		icon: Shield,
		title: "Privacy First",
		description:
			"Self-hosted and open source. Your data stays yours, always. Enterprise-grade security without compromise.",
	},
];

function HeroFeatureItem({
	feature,
	index,
}: {
	feature: (typeof heroFeatures)[number];
	index: number;
}) {
	const { ref, isVisible } = useScrollAnimation();
	const Icon = feature.icon;
	const isImageRight = feature.imagePosition === "right";

	return (
		<div
			ref={ref}
			className={`grid gap-12 lg:grid-cols-2 lg:gap-16 ${
				isImageRight ? "" : "lg:[direction:rtl] lg:[&>*]:[direction:ltr]"
			} ${isVisible ? "animate-fade-in-up" : "before-animate"}`}
		>
			{/* Content */}
			<div className="flex flex-col justify-center">
				<div className="mb-6 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10">
					<Icon className="h-7 w-7 text-primary" />
				</div>
				<h3 className="font-display text-3xl leading-tight md:text-4xl">
					{feature.title}
				</h3>
				<p className="mt-4 text-lg leading-relaxed text-muted-foreground">
					{feature.description}
				</p>
				<ul className="mt-6 flex flex-col gap-3">
					{feature.benefits.map((benefit) => (
						<li
							key={benefit}
							className="flex items-start gap-3 text-base text-muted-foreground"
						>
							<CheckCircle className="mt-0.5 h-5 w-5 flex-shrink-0 text-primary" />
							<span>{benefit}</span>
						</li>
					))}
				</ul>
			</div>

			{/* Visual placeholder */}
			<div className="flex items-center justify-center">
				<div className="relative w-full max-w-md">
					<div className="absolute inset-0 -z-10 rounded-[24px] bg-gradient-to-br from-primary/15 via-accent/10 to-transparent blur-2xl" />
					<div className="flex aspect-[4/3] items-center justify-center rounded-[24px] border border-border/40 bg-card/50 backdrop-blur-sm">
						<div className="flex flex-col items-center gap-3 p-8">
							<div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10">
								<Icon className="h-8 w-8 text-primary/60" />
							</div>
							<p className="text-sm text-muted-foreground">
								Feature {index + 1} preview
							</p>
						</div>
					</div>
				</div>
			</div>
		</div>
	);
}

function SecondaryFeaturesGrid() {
	const { ref, isVisible } = useScrollAnimation();

	return (
		<div ref={ref} className="mt-24 grid gap-8 md:grid-cols-3 lg:mt-32">
			{secondaryFeatures.map((feature, index) => {
				const Icon = feature.icon;
				return (
					<div
						key={feature.title}
						className={`flex flex-col gap-4 rounded-2xl border border-border/60 bg-card/50 p-8 transition-all duration-300 hover:-translate-y-1 hover:border-primary/40 hover:shadow-lg ${isVisible ? `animate-fade-in-up stagger-${index + 1}` : "before-animate"}`}
					>
						<div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
							<Icon className="h-6 w-6 text-primary" />
						</div>
						<h4 className="font-display text-xl">{feature.title}</h4>
						<p className="text-sm leading-relaxed text-muted-foreground">
							{feature.description}
						</p>
					</div>
				);
			})}
		</div>
	);
}

export function FeaturesSection() {
	const { ref: headerRef, isVisible: headerVisible } = useScrollAnimation();

	return (
		<section
			id="features"
			className="relative bg-background py-20 sm:py-28 lg:py-36"
		>
			<div className="container mx-auto px-4">
				{/* Section header */}
				<div
					ref={headerRef}
					className={`mx-auto mb-16 max-w-2xl text-center lg:mb-24 ${headerVisible ? "animate-fade-in-up" : "before-animate"}`}
				>
					<Badge
						variant="secondary"
						className="mb-4 rounded-full px-4 py-1 text-xs uppercase tracking-wider"
					>
						Features
					</Badge>
					<h2 className="font-display text-balance text-4xl leading-tight md:text-5xl">
						Everything you need to stand out
					</h2>
					<p className="mt-6 text-lg leading-relaxed text-muted-foreground">
						Purpose-built tools covering the full job search lifecycle, from
						capturing your experience to measuring success.
					</p>
				</div>

				{/* Hero features */}
				<div className="flex flex-col gap-24 lg:gap-32">
					{heroFeatures.map((feature, index) => (
						<HeroFeatureItem
							key={feature.title}
							feature={feature}
							index={index}
						/>
					))}
				</div>

				{/* Secondary features */}
				<SecondaryFeaturesGrid />
			</div>
		</section>
	);
}
