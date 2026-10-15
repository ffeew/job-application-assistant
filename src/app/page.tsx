import { Header } from "@/app/components/landing/header";
import { HeroSection } from "@/app/components/landing/hero-section";
import { HowItWorksSection } from "@/app/components/landing/how-it-works-section";
import { DeskSection } from "@/app/components/landing/desk-section";
import { SelfHostingSection } from "@/app/components/landing/self-hosting-section";
import { Footer } from "@/app/components/landing/footer";

export default function Home() {
  return (
    <div className="min-h-screen">
      {/* On wide screens the strip leaves room for the hero's tabs to rise into it. */}
      <div className="band lg:pb-10">
        <Header />
      </div>

      <main>
        <HeroSection />
        <HowItWorksSection />
        <DeskSection />
        <SelfHostingSection />
      </main>

      <Footer />
    </div>
  );
}
