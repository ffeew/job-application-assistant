"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
import { GithubIcon } from "@/components/ui/github-icon";
import { useScrollAnimation } from "@/app/hooks/use-scroll-animation";

export function CTASection() {
	const { ref, isVisible } = useScrollAnimation();

	return (
		<section ref={ref} className="relative overflow-hidden bg-background py-20 sm:py-28 lg:py-36">
			<div className="absolute inset-0 -z-10 bg-gradient-to-b from-primary/5 via-transparent to-transparent" />

			<div className="container mx-auto px-4">
				<div
					className={`mx-auto max-w-4xl overflow-hidden rounded-[32px] border border-primary/20 bg-gradient-to-br from-primary/10 via-accent/5 to-transparent p-10 text-center shadow-2xl shadow-primary/10 sm:p-12 lg:p-16 ${isVisible ? "animate-scale-in" : "before-animate"}`}
				>
					<h2 className="font-display text-balance text-4xl leading-tight md:text-5xl">
						Ready to transform your job search?
					</h2>
					<p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-muted-foreground md:text-xl">
						Join thousands using AI-powered resume optimization to land more
						interviews. Start for free, self-host for complete control.
					</p>

					<div className="mt-10 flex flex-wrap items-center justify-center gap-4">
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
							<Link
								href="https://github.com/ffeew/job-application-assistant"
								target="_blank"
							>
								<GithubIcon className="mr-2 h-5 w-5" width={20} height={20} />
								View on GitHub
							</Link>
						</Button>
					</div>

					<p className="mt-8 text-sm text-muted-foreground">
						No credit card required &middot; Open source &middot; Self-hosted
					</p>
				</div>
			</div>
		</section>
	);
}
