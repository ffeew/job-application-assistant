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
	Sparkles,
} from "lucide-react";
import { useScrollAnimation } from "@/app/hooks/use-scroll-animation";

function ResumeBuilderPreview() {
	return (
		<div className="flex flex-col gap-3 rounded-xl border border-border/60 bg-card p-4 shadow-sm">
			<div className="flex items-start justify-between">
				<div className="flex flex-col gap-1">
					<div className="h-3 w-24 rounded bg-foreground/80" />
					<div className="h-2 w-16 rounded bg-muted-foreground/40" />
				</div>
				<div className="flex items-center gap-1 rounded-full bg-emerald-500/15 px-2 py-1">
					<Sparkles className="h-3 w-3 text-emerald-600 dark:text-emerald-400" />
					<span className="text-xs font-medium text-emerald-600 dark:text-emerald-400">
						92%
					</span>
				</div>
			</div>
			<div className="flex flex-col gap-2">
				<div className="h-2 w-full rounded bg-muted-foreground/20" />
				<div className="h-2 w-4/5 rounded bg-muted-foreground/20" />
				<div className="h-2 w-3/5 rounded bg-muted-foreground/20" />
			</div>
			<div className="flex flex-wrap gap-1.5">
				<span className="rounded-full bg-primary/15 px-2 py-0.5 text-[10px] font-medium text-primary">
					React
				</span>
				<span className="rounded-full bg-primary/15 px-2 py-0.5 text-[10px] font-medium text-primary">
					TypeScript
				</span>
				<span className="rounded-full bg-muted px-2 py-0.5 text-[10px] text-muted-foreground">
					Node.js
				</span>
			</div>
		</div>
	);
}

function CoverLetterPreview() {
	return (
		<div className="flex flex-col gap-3 rounded-xl border border-border/60 bg-card p-4 shadow-sm">
			<div className="flex flex-col gap-1.5">
				<div className="h-2 w-20 rounded bg-muted-foreground/30" />
				<div className="h-2 w-28 rounded bg-muted-foreground/30" />
			</div>
			<div className="flex flex-col gap-1.5">
				<div className="h-2 w-full rounded bg-muted-foreground/20" />
				<div className="h-2 w-full rounded bg-muted-foreground/20" />
				<div className="h-2 w-11/12 rounded bg-muted-foreground/20" />
				<div className="h-2 w-4/5 rounded bg-muted-foreground/20" />
			</div>
			<div className="flex flex-col gap-1.5">
				<div className="h-2 w-full rounded bg-muted-foreground/20" />
				<div className="flex items-center gap-1">
					<div className="h-2 w-3/5 rounded bg-muted-foreground/20" />
					<div className="h-3 w-0.5 animate-pulse rounded bg-primary" />
				</div>
			</div>
			<div className="mt-1 flex items-center gap-1.5">
				<div className="h-3 w-3 animate-spin rounded-full border-2 border-primary border-t-transparent" />
				<span className="text-[10px] text-muted-foreground">
					Generating...
				</span>
			</div>
		</div>
	);
}

function ApplicationTrackerPreview() {
	return (
		<div className="flex gap-2">
			<div className="flex flex-1 flex-col gap-2">
				<div className="rounded-md bg-muted/50 px-2 py-1 text-center text-[10px] font-medium text-muted-foreground">
					Applied
				</div>
				<div className="flex flex-col gap-1.5">
					<div className="rounded-md border border-border/60 bg-card p-2">
						<div className="h-2 w-12 rounded bg-foreground/60" />
						<div className="mt-1 h-1.5 w-8 rounded bg-muted-foreground/30" />
					</div>
					<div className="rounded-md border border-border/60 bg-card p-2">
						<div className="h-2 w-10 rounded bg-foreground/60" />
						<div className="mt-1 h-1.5 w-9 rounded bg-muted-foreground/30" />
					</div>
				</div>
			</div>
			<div className="flex flex-1 flex-col gap-2">
				<div className="rounded-md bg-amber-500/15 px-2 py-1 text-center text-[10px] font-medium text-amber-600 dark:text-amber-400">
					Interview
				</div>
				<div className="flex flex-col gap-1.5">
					<div className="rounded-md border border-amber-500/30 bg-card p-2">
						<div className="h-2 w-11 rounded bg-foreground/60" />
						<div className="mt-1 h-1.5 w-7 rounded bg-muted-foreground/30" />
					</div>
				</div>
			</div>
			<div className="flex flex-1 flex-col gap-2">
				<div className="rounded-md bg-emerald-500/15 px-2 py-1 text-center text-[10px] font-medium text-emerald-600 dark:text-emerald-400">
					Offer
				</div>
				<div className="flex flex-col gap-1.5">
					<div className="rounded-md border border-emerald-500/30 bg-card p-2">
						<div className="h-2 w-9 rounded bg-foreground/60" />
						<div className="mt-1 h-1.5 w-6 rounded bg-muted-foreground/30" />
					</div>
				</div>
			</div>
		</div>
	);
}

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
		Preview: ResumeBuilderPreview,
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
		Preview: CoverLetterPreview,
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
		Preview: ApplicationTrackerPreview,
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
}: {
	feature: (typeof heroFeatures)[number];
	index: number;
}) {
	const { ref, isVisible } = useScrollAnimation();
	const Icon = feature.icon;
	const { Preview } = feature;
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
				<div className="mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 ring-2 ring-primary/20">
					<Icon className="h-8 w-8 text-primary" />
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

			{/* Feature preview */}
			<div className="flex items-center justify-center">
				<div className="relative w-full max-w-md">
					<div className="absolute inset-0 -z-10 rounded-[24px] bg-gradient-to-br from-primary/15 via-accent/10 to-transparent blur-2xl" />
					<div className="flex aspect-[4/3] items-center justify-center rounded-[24px] border border-border/40 bg-card/50 p-6 backdrop-blur-sm">
						<Preview />
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
						className={`flex flex-col gap-4 rounded-2xl border border-border/60 bg-card/50 p-8 transition-all duration-300 hover:-translate-y-1 hover:border-secondary/40 hover:shadow-xl hover:shadow-secondary/10 ${isVisible ? `animate-fade-in-up stagger-${index + 1}` : "before-animate"}`}
					>
						<div className="flex h-14 w-14 items-center justify-center rounded-xl bg-primary/10 ring-2 ring-primary/20">
							<Icon className="h-7 w-7 text-primary" />
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
			className="relative bg-background py-24 sm:py-32 lg:py-40"
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
