import type { Metadata } from "next";
import { DM_Serif_Display, DM_Sans } from "next/font/google";
import "./globals.css";
import { QueryProvider } from "@/app/components/providers/query-provider";
import { ThemeProvider } from "@/app/components/providers/theme-provider";
import { Toaster } from "@/components/ui/sonner";
// Import env to trigger validation early
import "@/lib/env";

const dmSerifDisplay = DM_Serif_Display({
	weight: ["400"],
	variable: "--font-serif-display",
	subsets: ["latin"],
	display: "swap",
});

const dmSans = DM_Sans({
	weight: ["400", "500", "700"],
	variable: "--font-sans",
	subsets: ["latin"],
	display: "swap",
});

export const metadata: Metadata = {
	title: "Job Application Assistant - AI-Powered Resume Optimization",
	description:
		"Transform your job search with AI-powered resume optimization, intelligent cover letters, and comprehensive application tracking. Open source and self-hosted.",
};

export default function RootLayout({
	children,
}: Readonly<{
	children: React.ReactNode;
}>) {
	return (
		<html lang="en" suppressHydrationWarning>
			<body
				className={`${dmSans.variable} ${dmSerifDisplay.variable} antialiased`}
			>
				<ThemeProvider
					attribute="class"
					defaultTheme="system"
					enableSystem
					disableTransitionOnChange
				>
					<QueryProvider>
						{children}
						<Toaster />
					</QueryProvider>
				</ThemeProvider>
			</body>
		</html>
	);
}
