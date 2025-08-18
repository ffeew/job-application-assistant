import Link from "next/link";
import { Briefcase, Mail } from "lucide-react";
import { GithubIcon } from "@/components/ui/github-icon";

const projectLinks = [
	{ href: "/dashboard", label: "Live Demo" },
	{
		href: "https://github.com/ffeew/job-application-assistant",
		label: "Repository",
		external: true,
	},
	{
		href: "https://github.com/ffeew/job-application-assistant/releases",
		label: "Releases",
		external: true,
	},
	{
		href: "https://github.com/ffeew/job-application-assistant/blob/main/CHANGELOG.md",
		label: "Changelog",
		external: true,
	},
];

const communityLinks = [
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
		href: "https://github.com/ffeew/job-application-assistant/discussions",
		label: "Discussions",
		external: true,
	},
	{
		href: "https://github.com/ffeew/job-application-assistant?tab=readme-ov-file#-contributing",
		label: "Contributing",
		external: true,
	},
];

export function Footer() {
	return (
		<footer className="bg-muted/50 py-16">
			<div className="container mx-auto px-4">
				<div className="grid grid-cols-1 md:grid-cols-4 gap-8">
					<div className="md:col-span-2">
						<div className="flex items-center space-x-2 mb-4">
							<Briefcase className="h-6 w-6 text-primary" />
							<h3 className="text-lg font-bold">Job Application Assistant</h3>
						</div>
						<p className="text-muted-foreground mb-6 max-w-md">
							An open source, self-hosted platform for managing your job search
							with AI-powered resume building, cover letter generation, and
							application tracking.
						</p>
						<div className="flex space-x-4">
							<Link
								href="https://github.com/ffeew/job-application-assistant"
								target="_blank"
								className="w-8 h-8 rounded bg-muted hover:bg-muted/80 flex items-center justify-center transition-colors"
							>
								<GithubIcon className="w-4 h-4" width={16} height={16} />
							</Link>
							<Link
								href="mailto:contact@example.com"
								className="w-8 h-8 rounded bg-muted hover:bg-muted/80 flex items-center justify-center transition-colors"
							>
								<Mail className="w-4 h-4" />
							</Link>
						</div>
					</div>

					<div>
						<h4 className="font-semibold mb-4">Project</h4>
						<ul className="space-y-2 text-sm text-muted-foreground">
							{projectLinks.map((link, index) => (
								<li key={index}>
									<Link
										href={link.href}
										{...(link.external ? { target: "_blank" } : {})}
										className="hover:text-foreground transition-colors"
									>
										{link.label}
									</Link>
								</li>
							))}
						</ul>
					</div>

					<div>
						<h4 className="font-semibold mb-4">Community</h4>
						<ul className="space-y-2 text-sm text-muted-foreground">
							{communityLinks.map((link, index) => (
								<li key={index}>
									<Link
										href={link.href}
										{...(link.external ? { target: "_blank" } : {})}
										className="hover:text-foreground transition-colors"
									>
										{link.label}
									</Link>
								</li>
							))}
						</ul>
					</div>
				</div>

				<div className="border-t mt-12 pt-8 text-center text-sm text-muted-foreground">
					<p>
						&copy; 2024 Job Application Assistant. Released under the MIT
						License.
					</p>
				</div>
			</div>
		</footer>
	);
}
