"use client";

import { useEffect, useState } from "react";
import { authClient } from "@/app/utils/authClient";
import { Header } from "@/app/components/landing/header";
import { HeroSection } from "@/app/components/landing/hero-section";
import { FeaturesSection } from "@/app/components/landing/features-section";
import { TechStackSection } from "@/app/components/landing/tech-stack-section";
import { GettingStartedSection } from "@/app/components/landing/getting-started-section";
import { CommunitySection } from "@/app/components/landing/community-section";
import { Footer } from "@/app/components/landing/footer";

export default function Home() {
	const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);

	useEffect(() => {
		// Check if user is authenticated to show appropriate header buttons
		const checkAuth = async () => {
			try {
				const session = await authClient.getSession();
				setIsAuthenticated(!!session);
			} catch {
				setIsAuthenticated(false);
			}
		};

		checkAuth();
	}, []);

	return (
		<div className="min-h-screen bg-background">
			<Header isAuthenticated={isAuthenticated} />

			{/* Main Content */}
			<main>
				<HeroSection />
				<FeaturesSection />
				<TechStackSection />
				<GettingStartedSection />
				<CommunitySection />
			</main>

			<Footer />
		</div>
	);
}