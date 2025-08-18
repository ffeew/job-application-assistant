import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowRight } from "lucide-react";
import { GithubIcon } from "@/components/ui/github-icon";
export function HeroSection() {
	return (
		<section className="py-20 lg:py-32 bg-gradient-to-b from-background to-muted/20">
			<div className="container mx-auto px-4">
				<div className="text-center max-w-4xl mx-auto">
					<Badge variant="secondary" className="mb-4">
						<GithubIcon className="w-3 h-3 mr-1" width={12} height={12} />
						Open Source & Self-Hosted
					</Badge>
					<h1 className="text-4xl md:text-6xl font-bold mb-6 bg-gradient-to-r from-foreground to-muted-foreground bg-clip-text text-transparent">
						Job Application Assistant
					</h1>
					<p className="text-xl md:text-2xl text-muted-foreground mb-8 leading-relaxed">
						A comprehensive, self-hosted platform for managing your job search
						with AI-powered resume building, cover letter generation, and
						application tracking.
					</p>
					<div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-12">
						<Button size="lg" className="text-lg px-8 py-4" asChild>
							<Link href="/dashboard">
								Try Live Demo
								<ArrowRight className="ml-2 h-5 w-5" />
							</Link>
						</Button>
						<Button
							size="lg"
							variant="outline"
							className="text-lg px-8 py-4"
							asChild
						>
							<Link
								href="https://github.com/ffeew/job-application-assistant"
								target="_blank"
							>
								<GithubIcon className="mr-2 h-5 w-5" width={20} height={20} />
								View on Github
							</Link>
						</Button>
					</div>

					{/* Tech Highlights */}
					<div className="grid grid-cols-1 sm:grid-cols-3 gap-8 max-w-2xl mx-auto">
						<div className="text-center">
							<div className="text-3xl font-bold text-primary">Next.js 15</div>
							<div className="text-sm text-muted-foreground">
								Modern Framework
							</div>
						</div>
						<div className="text-center">
							<div className="text-3xl font-bold text-primary">AI Powered</div>
							<div className="text-sm text-muted-foreground">
								Groq Integration
							</div>
						</div>
						<div className="text-center">
							<div className="text-3xl font-bold text-primary">TypeScript</div>
							<div className="text-sm text-muted-foreground">Type Safe</div>
						</div>
					</div>
				</div>
			</div>
		</section>
	);
}
