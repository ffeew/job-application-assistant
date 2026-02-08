import Link from "next/link";
import { Briefcase, Mail } from "lucide-react";
import { GithubIcon } from "@/components/ui/github-icon";

const productLinks = [
	{ href: "/dashboard", label: "Try demo" },
	{ href: "/sign-up", label: "Sign up" },
	{ href: "#features", label: "Features" },
	{ href: "#how-it-works", label: "How it works" },
];

const resourceLinks = [
	{
		href: "https://github.com/ffeew/job-application-assistant",
		label: "GitHub",
		external: true,
	},
	{
		href: "https://github.com/ffeew/job-application-assistant/docs",
		label: "Documentation",
		external: true,
	},
	{
		href: "https://github.com/ffeew/job-application-assistant/issues",
		label: "Issues",
		external: true,
	},
	{
		href: "https://github.com/ffeew/job-application-assistant/releases",
		label: "Releases",
		external: true,
	},
];

export function Footer() {
	const year = new Date().getFullYear();

	return (
		<footer className="relative border-t border-border/60 bg-gradient-to-b from-background to-accent/5 py-16 lg:py-20">
			<div className="container mx-auto px-4">
				<div className="grid grid-cols-1 gap-12 lg:grid-cols-[1.5fr_1fr_1fr]">
					{/* Brand column */}
					<div className="flex flex-col gap-6">
						<div className="flex items-center gap-3">
							<span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary/10 text-primary">
								<Briefcase className="h-5 w-5" />
							</span>
							<div>
								<h3 className="font-bold text-lg tracking-tight">
									Job Application Assistant
								</h3>
								<p className="text-xs uppercase tracking-wider text-muted-foreground">
									Open source &middot; AI-powered
								</p>
							</div>
						</div>
						<p className="max-w-sm text-sm leading-relaxed text-muted-foreground">
							Transform your job search with AI-powered resume optimization,
							intelligent cover letters, and comprehensive application tracking.
						</p>
						<div className="flex items-center gap-3">
							<Link
								href="https://github.com/ffeew/job-application-assistant"
								target="_blank"
								className="flex h-9 w-9 items-center justify-center rounded-full border border-border/60 text-muted-foreground transition-all hover:border-primary hover:text-primary"
							>
								<GithubIcon className="h-4 w-4" width={16} height={16} />
							</Link>
							<Link
								href="mailto:contact@example.com"
								className="flex h-9 w-9 items-center justify-center rounded-full border border-border/60 text-muted-foreground transition-all hover:border-primary hover:text-primary"
							>
								<Mail className="h-4 w-4" />
							</Link>
						</div>
					</div>

					{/* Product links */}
					<div>
						<h4 className="mb-4 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
							Product
						</h4>
						<ul className="flex flex-col gap-3 text-sm">
							{productLinks.map((link) => (
								<li key={link.label}>
									<Link
										href={link.href}
										className="text-muted-foreground transition-colors hover:text-foreground"
									>
										{link.label}
									</Link>
								</li>
							))}
						</ul>
					</div>

					{/* Resource links */}
					<div>
						<h4 className="mb-4 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
							Resources
						</h4>
						<ul className="flex flex-col gap-3 text-sm">
							{resourceLinks.map((link) => (
								<li key={link.label}>
									<Link
										href={link.href}
										{...(link.external
											? { target: "_blank", rel: "noopener noreferrer" }
											: {})}
										className="text-muted-foreground transition-colors hover:text-foreground"
									>
										{link.label}
									</Link>
								</li>
							))}
						</ul>
					</div>
				</div>

				{/* Bottom bar */}
				<div className="mt-12 flex flex-col gap-4 border-t border-border/60 pt-8 text-sm text-muted-foreground md:flex-row md:items-center md:justify-between">
					<p>
						&copy; {year} Job Application Assistant. Released under the MIT
						License.
					</p>
					<p className="text-xs">
						Built with Next.js, Tailwind, Turso &amp; Groq
					</p>
				</div>
			</div>
		</footer>
	);
}
