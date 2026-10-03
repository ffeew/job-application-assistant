import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { Briefcase } from "lucide-react";
import { MobileMenu } from "./mobile-menu";

interface HeaderProps {
	isAuthenticated: boolean | null;
}

export function Header({ isAuthenticated }: HeaderProps) {
	return (
		<header className="sticky top-0 z-50 border-b border-border/60 bg-background/80 backdrop-blur-xl supports-[backdrop-filter]:bg-background/60">
			<div className="container mx-auto flex items-center justify-between gap-4 px-4 py-4">
				<Link href="#hero" className="flex items-center gap-2 text-left">
					<span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary/10 text-primary">
						<Briefcase className="h-5 w-5" />
					</span>
					<div className="hidden sm:block">
						<h1 className="font-bold text-lg leading-tight tracking-tight md:text-xl">
							Job Application Assistant
						</h1>
						<p className="text-xs text-muted-foreground md:text-sm">
							AI-crafted resumes, confident applications.
						</p>
					</div>
				</Link>

				<nav className="hidden items-center gap-6 text-sm font-medium text-muted-foreground md:flex">
					<Link
						href="#features"
						className="transition-colors hover:text-foreground"
					>
						Features
					</Link>
					<Link
						href="#how-it-works"
						className="transition-colors hover:text-foreground"
					>
						How it works
					</Link>
				</nav>

				<div className="flex items-center gap-2">
					<ThemeToggle />

					<div className="hidden md:flex md:items-center md:gap-2">
						{isAuthenticated === null ? (
							<>
								<div className="h-9 w-20 animate-pulse rounded-full bg-muted" />
								<div className="h-9 w-24 animate-pulse rounded-full bg-muted" />
							</>
						) : isAuthenticated ? (
							<Button asChild className="rounded-full px-5">
								<Link href="/dashboard">Go to dashboard</Link>
							</Button>
						) : (
							<>
								<Button
									variant="ghost"
									asChild
									className="rounded-full px-5 text-sm font-medium"
								>
									<Link href="/dashboard">Try demo</Link>
								</Button>
								<Button asChild className="rounded-full px-5">
									<Link href="/sign-up">Get started</Link>
								</Button>
							</>
						)}
					</div>

					<MobileMenu isAuthenticated={isAuthenticated} />
				</div>
			</div>
		</header>
	);
}
