import type { Metadata } from "next";
import { DM_Sans } from "next/font/google";
import "./globals.css";
import { QueryProvider } from "@/app/components/providers/query-provider";
import { ThemeProvider } from "@/app/components/providers/theme-provider";
import { Toaster } from "@/components/ui/sonner";
import "@/lib/env";

const dmSans = DM_Sans({
	weight: ["400", "500", "700"],
	variable: "--font-sans",
	subsets: ["latin"],
	display: "swap",
});

export const metadata: Metadata = {
	title: "Job Application Assistant - AI-Powered Resume Optimization",
	description:
		"Build your profile, tailor resumes and cover letters with AI, and track applications in a self-hosted workspace.",
};

export default function RootLayout({
	children,
}: Readonly<{
	children: React.ReactNode;
}>) {
	return (
		<html lang="en" suppressHydrationWarning>
			<body className={`${dmSans.variable} antialiased`}>
				<ThemeProvider
					attribute="class"
					defaultTheme="dark"
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
