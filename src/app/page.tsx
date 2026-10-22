import { connection } from "next/server";
import { Header } from "@/app/components/landing/header";
import { HeroSection } from "@/app/components/landing/hero-section";
import { HowItWorksSection } from "@/app/components/landing/how-it-works-section";
import { DeskSection } from "@/app/components/landing/desk-section";
import { SelfHostingSection } from "@/app/components/landing/self-hosting-section";
import { Footer } from "@/app/components/landing/footer";
import { env } from "@/lib/env";

export default async function Home() {
  // DISABLE_SIGNUP is read when the page is requested. A prerendered page
  // would keep whatever value the image was built with.
  await connection();
  const signUpOpen = !env.DISABLE_SIGNUP;

  return (
    <div className="min-h-screen">
      {/* On wide screens the strip leaves room for the hero's tabs to rise into it. */}
      <div className="band lg:pb-10">
        <Header signUpOpen={signUpOpen} />
      </div>

      <main>
        <HeroSection signUpOpen={signUpOpen} />
        <HowItWorksSection />
        <DeskSection />
        <SelfHostingSection />
      </main>

      <Footer signUpOpen={signUpOpen} />
    </div>
  );
}
