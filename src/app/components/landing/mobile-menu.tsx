"use client";

import { useState } from "react";
import Link from "next/link";
import { Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
	Sheet,
	SheetContent,
	SheetHeader,
	SheetTitle,
	SheetTrigger,
} from "@/components/ui/sheet";

interface MobileMenuProps {
	isAuthenticated: boolean | null;
}

const navLinks = [
	{ href: "#features", label: "Features" },
	{ href: "#how-it-works", label: "How it works" },
];

export function MobileMenu({ isAuthenticated }: MobileMenuProps) {
	const [open, setOpen] = useState(false);

	return (
		<Sheet open={open} onOpenChange={setOpen}>
			<SheetTrigger asChild className="md:hidden">
				<Button variant="ghost" size="icon" className="h-10 w-10">
					<Menu className="h-5 w-5" />
					<span className="sr-only">Open menu</span>
				</Button>
			</SheetTrigger>
			<SheetContent side="right" className="w-[300px] sm:w-[350px]">
				<SheetHeader>
					<SheetTitle className="font-display text-left text-xl">
						Menu
					</SheetTitle>
				</SheetHeader>
				<nav className="mt-8 flex flex-col gap-6">
					{navLinks.map((link) => (
						<Link
							key={link.href}
							href={link.href}
							onClick={() => setOpen(false)}
							className="text-lg font-medium text-foreground transition-colors hover:text-primary"
						>
							{link.label}
						</Link>
					))}
					<div className="mt-4 flex flex-col gap-3 border-t border-border pt-6">
						{isAuthenticated === null ? (
							<>
								<div className="h-11 animate-pulse rounded-full bg-muted" />
								<div className="h-11 animate-pulse rounded-full bg-muted" />
							</>
						) : isAuthenticated ? (
							<Button asChild size="lg" className="w-full rounded-full">
								<Link href="/dashboard" onClick={() => setOpen(false)}>
									Go to dashboard
								</Link>
							</Button>
						) : (
							<>
								<Button
									variant="outline"
									asChild
									size="lg"
									className="w-full rounded-full"
								>
									<Link href="/dashboard" onClick={() => setOpen(false)}>
										Try demo
									</Link>
								</Button>
								<Button asChild size="lg" className="w-full rounded-full">
									<Link href="/sign-up" onClick={() => setOpen(false)}>
										Get started
									</Link>
								</Button>
							</>
						)}
					</div>
				</nav>
			</SheetContent>
		</Sheet>
	);
}
