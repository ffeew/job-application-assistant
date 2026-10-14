import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ResumeDemo } from "./resume-demo";

export function HeroSection() {
	return (
		<section className="border-kraft border-t">
			<div className="mx-auto grid w-full max-w-7xl items-start gap-x-10 gap-y-12 px-5 pb-20 sm:px-8 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:pb-28">
				<div className="flex flex-col gap-7 pt-10 lg:pt-24">
					<h1 className="title text-5xl leading-[0.98] text-balance sm:text-6xl xl:text-7xl">
						<span className="block">Paste the job listing.</span>
						<span className="block">Get the one page that answers it.</span>
					</h1>
					<p className="max-w-[46ch] text-lg">
						Keep your whole career in one profile. For each job, the entries
						that fit are selected, typeset, and checked until the resume fits
						on one page.
					</p>
					<div className="flex flex-wrap gap-3">
						<Button size="lg" asChild>
							<Link href="/sign-up">Create account</Link>
						</Button>
						<Button size="lg" variant="outline" asChild>
							<a href="#how-it-works">See how it works</a>
						</Button>
					</div>
				</div>

				<ResumeDemo />
			</div>
		</section>
	);
}
