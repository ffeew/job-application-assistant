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
import { Skeleton } from "@/components/ui/skeleton";
import { REPOSITORY_URL, sectionLinks } from "./links";

interface MobileMenuProps {
	isSignedIn: boolean | null;
}

export function MobileMenu({ isSignedIn }: MobileMenuProps) {
	const [open, setOpen] = useState(false);
	const close = () => setOpen(false);

	return (
		<Sheet open={open} onOpenChange={setOpen}>
			<SheetTrigger asChild className="md:hidden">
				<Button variant="ghost" size="icon">
					<Menu className="size-5" />
					<span className="sr-only">Open menu</span>
				</Button>
			</SheetTrigger>
			<SheetContent side="right" className="w-[300px]">
				<SheetHeader>
					<SheetTitle>Menu</SheetTitle>
				</SheetHeader>
				<nav className="flex flex-col gap-1 px-4 text-base font-medium">
					{sectionLinks.map((link) => (
						<a
							key={link.href}
							href={link.href}
							onClick={close}
							className="hover:bg-accent rounded-md px-3 py-3"
						>
							{link.label}
						</a>
					))}
					<a
						href={REPOSITORY_URL}
						target="_blank"
						rel="noopener noreferrer"
						className="hover:bg-accent rounded-md px-3 py-3"
					>
						GitHub
					</a>
				</nav>
				<div className="flex flex-col gap-2 border-t p-4">
					{isSignedIn === null ? (
						<>
							<Skeleton className="h-12" />
							<Skeleton className="h-12" />
						</>
					) : isSignedIn ? (
						<Button asChild size="lg">
							<Link href="/dashboard" onClick={close}>
								Open dashboard
							</Link>
						</Button>
					) : (
						<>
							<Button asChild size="lg">
								<Link href="/sign-up" onClick={close}>
									Create account
								</Link>
							</Button>
							<Button variant="outline" asChild size="lg">
								<Link href="/sign-in" onClick={close}>
									Sign in
								</Link>
							</Button>
						</>
					)}
				</div>
			</SheetContent>
		</Sheet>
	);
}
