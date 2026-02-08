"use client";

import { useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { authClient } from "@/app/utils/authClient";
import { useDashboardStore } from "@/app/dashboard/store/use-dashboard-store";
import {
	LayoutDashboard,
	FileText,
	Briefcase,
	PenTool,
	User,
	LogOut,
	Menu,
	X,
	MessageSquareText,
} from "lucide-react";

const navigation = [
	{ name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
	{ name: "Profile", href: "/dashboard/profile", icon: User },
	{ name: "Resumes", href: "/dashboard/resumes", icon: FileText },
	{ name: "Applications", href: "/dashboard/applications", icon: Briefcase },
	{ name: "Cover Letters", href: "/dashboard/cover-letters", icon: PenTool },
	{
		name: "Conversation Starters",
		href: "/dashboard/conversation-starters",
		icon: MessageSquareText,
	},
];

export default function DashboardLayout({
	children,
}: {
	children: React.ReactNode;
}) {
	// Zustand store selectors
	const user = useDashboardStore((state) => state.user);
	const isLoading = useDashboardStore((state) => state.isLoading);
	const sidebarOpen = useDashboardStore((state) => state.sidebarOpen);

	// Zustand store actions
	const setUser = useDashboardStore((state) => state.setUser);
	const setLoading = useDashboardStore((state) => state.setLoading);
	const toggleSidebar = useDashboardStore((state) => state.toggleSidebar);
	const setSidebarOpen = useDashboardStore((state) => state.setSidebarOpen);

	const pathname = usePathname();
	const router = useRouter();

	useEffect(() => {
		const checkAuth = async () => {
			try {
				const session = await authClient.getSession();
				if (!session) {
					router.push("/sign-in");
					return;
				}
				setUser(session.data?.user ? { name: session.data.user.name, email: session.data.user.email } : null);
			} catch {
				router.push("/sign-in");
			} finally {
				setLoading(false);
			}
		};

		checkAuth();
	}, [router, setUser, setLoading]);

	const handleSignOut = async () => {
		try {
			await authClient.signOut();
			router.push("/sign-in");
		} catch (error) {
			console.error("Error signing out:", error);
			// Even if sign out fails, redirect to sign-in page
			router.push("/sign-in");
		}
	};

	if (isLoading) {
		return (
			<div className="min-h-screen flex items-center justify-center">
				<div className="text-lg">Loading...</div>
			</div>
		);
	}

	return (
		<div className="min-h-screen bg-background">
			{/* Mobile menu button */}
			<div className="md:hidden fixed top-4 left-4 z-50">
				<Button
					variant="outline"
					size="sm"
					onClick={toggleSidebar}
				>
					{sidebarOpen ? (
						<X className="h-4 w-4" />
					) : (
						<Menu className="h-4 w-4" />
					)}
				</Button>
			</div>

			{/* Sidebar */}
			<div
				className={`fixed inset-y-0 left-0 z-40 w-64 bg-card border-r transform ${
					sidebarOpen ? "translate-x-0" : "-translate-x-full"
				} transition-transform duration-200 ease-in-out md:translate-x-0`}
			>
				<div className="flex flex-col h-full">
					<div className="flex items-center justify-between px-6 py-4 border-b">
						<h1 className="text-xl font-bold">Job Assistant</h1>
						<ThemeToggle />
					</div>

					<nav className="flex-1 px-4 py-6 space-y-2">
						{navigation.map((item) => {
							const isActive = pathname === item.href;
							return (
								<Link
									key={item.name}
									href={item.href}
									className={`flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors ${
										isActive
											? "bg-primary text-primary-foreground"
											: "text-muted-foreground hover:text-foreground hover:bg-muted"
									}`}
									onClick={() => setSidebarOpen(false)}
								>
									<item.icon className="mr-3 h-4 w-4" />
									{item.name}
								</Link>
							);
						})}
					</nav>

					<div className="p-4 border-t">
						<div className="flex items-center mb-3">
							<div className="flex-1">
								<p className="text-sm font-medium">{user?.name}</p>
								<p className="text-xs text-muted-foreground">{user?.email}</p>
							</div>
						</div>
						<Button
							variant="outline"
							size="sm"
							onClick={handleSignOut}
							className="w-full"
						>
							<LogOut className="mr-2 h-4 w-4" />
							Sign Out
						</Button>
					</div>
				</div>
			</div>

			{/* Main content */}
			<div className="md:ml-64">
				<main className="p-6">{children}</main>
			</div>

			{/* Sidebar overlay */}
			{sidebarOpen && (
				<div
					className="fixed inset-0 z-30 bg-black bg-opacity-50 md:hidden"
					onClick={() => setSidebarOpen(false)}
				/>
			)}
		</div>
	);
}
