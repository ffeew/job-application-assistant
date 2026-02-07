"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowRight, Sparkles, FileText, BarChart3, PenTool } from "lucide-react";
import { useScrollAnimation } from "@/app/hooks/use-scroll-animation";

export function HeroSection() {
	const { ref, isVisible } = useScrollAnimation({ threshold: 0.05 });

	return (
		<section
			id="hero"
			ref={ref}
			className="relative overflow-hidden bg-gradient-to-b from-background via-background to-accent/5 py-16 sm:py-24 lg:py-32"
		>
			{/* Ambient warm glow */}
			<div className="absolute inset-x-0 top-[-150px] -z-10 flex justify-center opacity-40">
				<div className="h-[500px] w-[500px] rounded-full bg-primary/30 blur-[180px]" />
			</div>

			<div className="container relative mx-auto px-4">
				<div className="mx-auto grid max-w-6xl gap-12 lg:grid-cols-[1.2fr_0.8fr] lg:gap-16">
					{/* Left column */}
					<div
						className={`flex flex-col justify-center gap-8 ${isVisible ? "animate-fade-in-up" : "before-animate"}`}
					>
						<Badge
							variant="outline"
							className="inline-flex w-fit items-center gap-2 rounded-full border-primary/30 bg-primary/5 px-4 py-1.5 text-xs font-medium uppercase tracking-wider text-primary"
						>
							<Sparkles className="h-3.5 w-3.5" />
							AI-Powered Job Search
						</Badge>

						<div className="flex flex-col gap-6">
							<h1 className="font-display text-balance text-5xl leading-[1.08] tracking-tight md:text-6xl lg:text-7xl">
								Land your dream role with intelligent resumes
							</h1>
							<p className="max-w-xl text-balance text-lg leading-relaxed text-muted-foreground md:text-xl">
								Tailor every application with AI-powered resume optimization.
								Track your pipeline, generate cover letters, and apply with
								confidence.
							</p>
						</div>

						<div className="flex flex-wrap items-center gap-4">
							<Button
								size="lg"
								className="h-12 rounded-full px-8 text-base shadow-lg shadow-primary/20"
								asChild
							>
								<Link href="/sign-up">
									Start for free
									<ArrowRight className="ml-2 h-5 w-5" />
								</Link>
							</Button>
							<Button
								size="lg"
								variant="outline"
								className="h-12 rounded-full border-border px-8 text-base"
								asChild
							>
								<Link href="#how-it-works">See how it works</Link>
							</Button>
						</div>

						{/* Trust indicators */}
						<div className="flex flex-wrap items-center gap-6 text-sm text-muted-foreground">
							<div className="flex items-center gap-2">
								<div className="h-2 w-2 rounded-full bg-primary" />
								<span>Open source</span>
							</div>
							<div className="flex items-center gap-2">
								<div className="h-2 w-2 rounded-full bg-primary" />
								<span>Self-hosted</span>
							</div>
							<div className="flex items-center gap-2">
								<div className="h-2 w-2 rounded-full bg-primary" />
								<span>Privacy-first</span>
							</div>
						</div>
					</div>

					{/* Right column - editorial visual */}
					<div
						className={`relative hidden lg:flex lg:items-center lg:justify-center ${isVisible ? "animate-fade-in stagger-3" : "before-animate"}`}
					>
						<div className="relative">
							<div className="absolute inset-0 -z-10 rounded-[32px] bg-gradient-to-br from-primary/20 via-accent/10 to-transparent blur-3xl" />
							<div className="relative overflow-hidden rounded-[32px] border border-border/40 bg-card/60 p-8 shadow-2xl shadow-primary/10 backdrop-blur-sm">
								{/* Decorative resume preview */}
								<div className="flex flex-col gap-5 w-[300px]">
									<div className="flex items-center justify-between text-xs font-medium uppercase tracking-widest text-muted-foreground">
										<span>Resume preview</span>
										<span className="rounded-full bg-primary/10 px-3 py-1 text-primary">
											92% match
										</span>
									</div>
									<div className="flex flex-col gap-4">
										{[
											{
												icon: FileText,
												label: "Experience",
												detail: "5 items selected",
											},
											{
												icon: PenTool,
												label: "Skills",
												detail: "12 matched",
											},
											{
												icon: BarChart3,
												label: "AI Score",
												detail: "Excellent",
											},
										].map((item) => (
											<div
												key={item.label}
												className="flex items-center gap-3 rounded-xl border border-border/50 bg-background/50 p-3"
											>
												<div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
													<item.icon className="h-4 w-4 text-primary" />
												</div>
												<div className="flex-1">
													<p className="text-sm font-medium">{item.label}</p>
													<p className="text-xs text-muted-foreground">
														{item.detail}
													</p>
												</div>
											</div>
										))}
									</div>
									<div className="flex gap-2">
										<div className="h-2 flex-1 rounded-full bg-muted">
											<div className="h-full w-[92%] rounded-full bg-primary" />
										</div>
									</div>
									<p className="text-center text-xs text-muted-foreground">
										Tailored for Senior Product Designer at Figma
									</p>
								</div>
							</div>
						</div>
					</div>
				</div>
			</div>
		</section>
	);
}
