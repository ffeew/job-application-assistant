"use client";

import { runAsyncAction, withAsyncHandler } from "@/lib/async-action";
import { useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { FolderTab } from "@/components/ui/folder-tab";
import {
	Sheet,
	SheetContent,
	SheetHeader,
	SheetTitle,
	SheetTrigger,
} from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { Wordmark } from "@/components/wordmark";
import { useQueryClient } from "@tanstack/react-query";
import { clearAccountState } from "@/app/utils/account-state";
import { authClient } from "@/app/utils/authClient";
import { useCoverLetterStore } from "@/app/dashboard/cover-letters/store/use-cover-letter-store";
import { useDashboardStore } from "@/app/dashboard/store/use-dashboard-store";
import { cn } from "@/lib/utils";
import { LogOut, Menu } from "lucide-react";

const navigation = [
	{ name: "Dashboard", href: "/dashboard" },
	{ name: "Profile", href: "/dashboard/profile" },
	{ name: "Applications", href: "/dashboard/applications" },
	{ name: "Resumes", href: "/dashboard/resumes" },
	{ name: "Cover letters", href: "/dashboard/cover-letters" },
	{ name: "Conversation starters", href: "/dashboard/conversation-starters" },
];

// The dashboard root would otherwise match every nested route.
function isActiveRoute(pathname: string, href: string) {
	if (href === "/dashboard") return pathname === href;
	return pathname === href || pathname.startsWith(`${href}/`);
}

function TabRow({ pathname }: { pathname: string }) {
	return (
		<nav
			aria-label="Main"
			className="mx-auto hidden w-full max-w-6xl px-5 sm:px-8 lg:block"
		>
			<ul className="flex items-end pt-4">
				{navigation.map((item) => {
					const isActive = isActiveRoute(pathname, item.href);
					return (
						<li key={item.href} className="-ml-1 flex first:ml-0">
							<FolderTab asChild open={isActive}>
								<Link
									href={item.href}
									aria-current={isActive ? "page" : undefined}
								>
									{item.name}
								</Link>
							</FolderTab>
						</li>
					);
				})}
			</ul>
		</nav>
	);
}

function NavLinks({
	pathname,
	onNavigate,
}: {
	pathname: string;
	onNavigate: () => void;
}) {
	return (
		<nav aria-label="Main">
			<ul className="flex flex-col gap-1">
				{navigation.map((item) => {
					const isActive = isActiveRoute(pathname, item.href);
					return (
						<li key={item.href}>
							<Link
								href={item.href}
								aria-current={isActive ? "page" : undefined}
								onClick={onNavigate}
								className={cn(
									"flex min-h-11 items-center rounded-md px-3 text-sm transition-colors",
									isActive
										? "bg-card shadow-sheet font-semibold"
										: "hover:bg-accent",
								)}
							>
								{item.name}
							</Link>
						</li>
					);
				})}
			</ul>
		</nav>
	);
}

export default function DashboardLayout({
	children,
}: {
	children: React.ReactNode;
}) {
	const user = useDashboardStore((state) => state.user);
	const isLoading = useDashboardStore((state) => state.isLoading);
	const sidebarOpen = useDashboardStore((state) => state.sidebarOpen);

	const setUser = useDashboardStore((state) => state.setUser);
	const setLoading = useDashboardStore((state) => state.setLoading);
	const setSidebarOpen = useDashboardStore((state) => state.setSidebarOpen);

	const pathname = usePathname();
	const router = useRouter();
	const queryClient = useQueryClient();

	useEffect(() => {
		const checkAuth = async () => {
			try {
				const session = await authClient.getSession();
				if (!session.data?.user) {
					// The session ended without a sign-out, so nothing was cleared yet.
					clearAccountState(queryClient);
					router.push("/sign-in");
					return;
				}
				useCoverLetterStore.getState().claimFor(session.data.user.id);
				setUser({ name: session.data.user.name, email: session.data.user.email });
			} catch {
				router.push("/sign-in");
			} finally {
				setLoading(false);
			}
		};

		runAsyncAction(checkAuth());
	}, [router, queryClient, setUser, setLoading]);

	const handleSignOut = async () => {
		try {
			await authClient.signOut();
		} catch {
			// A failed request must not keep the account's data on screen.
		}
		clearAccountState(queryClient);
		// The draft is persisted, so it would otherwise stay readable in this browser.
		useCoverLetterStore.getState().reset();
		router.push("/sign-in");
	};

	const currentSection =
		navigation.find((item) => isActiveRoute(pathname, item.href))?.name ??
		"Dashboard";

	return (
		<div className="flex min-h-screen flex-col">
			<a
				href="#main"
				className="bg-primary text-primary-foreground sr-only z-50 rounded-md px-4 py-2 text-sm font-medium focus:not-sr-only focus:fixed focus:top-3 focus:left-3"
			>
				Skip to content
			</a>

			<header className="band z-30 max-lg:sticky max-lg:top-0">
				<div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4 py-2 pr-2 pl-5 sm:pr-5 sm:pl-8 lg:pt-4 lg:pr-8 lg:pb-0">
					<Link href="/dashboard" className="rounded-sm">
						<Wordmark />
					</Link>
					<div className="flex items-center gap-1">
						{user && (
							<div className="max-w-64 min-w-0 px-2 text-right leading-tight max-lg:hidden">
								<p className="truncate text-sm font-semibold">{user.name}</p>
								<p className="text-muted-foreground truncate text-xs">
									{user.email}
								</p>
							</div>
						)}
						<ThemeToggle />
						<Button
							variant="ghost"
							size="sm"
							onClick={withAsyncHandler(handleSignOut)}
							className="max-lg:hidden"
						>
							<LogOut />
							Sign out
						</Button>
						<Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
							<SheetTrigger asChild>
								<Button variant="ghost" size="icon" className="lg:hidden">
									<Menu className="size-5" />
									<span className="sr-only">Open navigation</span>
								</Button>
							</SheetTrigger>
							<SheetContent side="left" className="w-72 gap-0 px-3 pb-4">
								<SheetHeader className="px-3">
									<SheetTitle>Navigation</SheetTitle>
								</SheetHeader>
								<div className="flex flex-1 flex-col justify-between gap-6">
									<NavLinks
										pathname={pathname}
										onNavigate={() => setSidebarOpen(false)}
									/>
									<div className="border-kraft/50 flex flex-col gap-3 border-t pt-4">
										<div className="min-w-0 px-3">
											<p className="truncate text-sm font-semibold">
												{user?.name}
											</p>
											<p className="text-muted-foreground truncate text-sm">
												{user?.email}
											</p>
										</div>
										<Button
											variant="ghost"
											size="sm"
											onClick={withAsyncHandler(handleSignOut)}
											className="justify-start"
										>
											<LogOut />
											Sign out
										</Button>
									</div>
								</div>
							</SheetContent>
						</Sheet>
					</div>
				</div>
			</header>

			<div className="band">
				<TabRow pathname={pathname} />
				<div className="flex px-5 pt-3 sm:px-8 lg:hidden">
					<FolderTab open>{currentSection}</FolderTab>
				</div>
			</div>

			<main id="main" className="border-kraft flex-1 border-t">
				<div className="mx-auto w-full max-w-6xl px-5 py-8 sm:px-8 lg:py-10">
					{isLoading ? (
						<div className="flex flex-col gap-6">
							<Skeleton className="h-9 w-56" />
							<Skeleton className="h-5 w-80 max-w-full" />
							<Skeleton className="h-64" />
						</div>
					) : (
						children
					)}
				</div>
			</main>
		</div>
	);
}
