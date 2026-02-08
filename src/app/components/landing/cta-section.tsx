"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
import { GithubIcon } from "@/components/ui/github-icon";
import { useScrollAnimation } from "@/app/hooks/use-scroll-animation";

export function CTASection() {
	const { ref, isVisible } = useScrollAnimation();

	return (
		<section ref={ref} className="relative overflow-hidden bg-background py-24 sm:py-32 lg:py-40">
			<div className="absolute inset-0 -z-10 bg-gradient-to-b from-secondary/5 via-transparent to-transparent" />

			<div className="container mx-auto px-4">
				<div
					className={`mx-auto max-w-4xl overflow-hidden rounded-[32px] border border-primary/30 bg-gradient-to-br from-primary/8 via-primary/5 to-transparent p-10 text-center shadow-2xl shadow-primary/15 sm:p-12 lg:p-16 ${isVisible ? "animate-scale-in" : "before-animate"}`}
				>
					<h2 className="font-bold text-balance text-4xl leading-tight tracking-tight md:text-5xl">
						Ready to transform your job search?
					</h2>
					<p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-muted-foreground md:text-xl">
						Join thousands using AI-powered resume optimization to land more
						interviews. Start for free, self-host for complete control.
					</p>

					<div className="mt-10 flex flex-wrap items-center justify-center gap-4">
						<Button
							size="lg"
							className="h-14 rounded-full px-10 text-lg shadow-xl shadow-primary/30 hover:shadow-2xl hover:shadow-primary/40"
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
							className="h-14 rounded-full border-2 border-primary/30 px-10 text-lg hover:border-primary/50 hover:bg-primary/5"
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
