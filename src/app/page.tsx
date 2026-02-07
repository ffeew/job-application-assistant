"use client";

import { useEffect, useState } from "react";
import { authClient } from "@/app/utils/authClient";
import { Header } from "@/app/components/landing/header";
import { HeroSection } from "@/app/components/landing/hero-section";
import { TrustBar } from "@/app/components/landing/trust-bar";
import { FeaturesSection } from "@/app/components/landing/features-section";
import { HowItWorksSection } from "@/app/components/landing/how-it-works-section";
import { CTASection } from "@/app/components/landing/cta-section";
import { ForDevelopersSection } from "@/app/components/landing/for-developers-section";
import { Footer } from "@/app/components/landing/footer";

export default function Home() {
	const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);

	useEffect(() => {
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

			<main>
				<HeroSection />
				<TrustBar />
				<FeaturesSection />
				<HowItWorksSection />
				<CTASection />
				<ForDevelopersSection />
			</main>

			<Footer />
		</div>
	);
}
