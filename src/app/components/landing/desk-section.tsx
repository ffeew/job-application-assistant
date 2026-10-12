import { Card } from "@/components/ui/card";
import { Paper } from "@/components/ui/paper";
import {
	StatusMark,
	type ApplicationStatus,
} from "@/app/dashboard/applications/components/status-mark";

// Invented rows that show the tracker's real columns and status marks.
const sampleApplications: {
	position: string;
	company: string;
	status: ApplicationStatus;
	applied: string;
}[] = [
	{
		position: "Platform engineer",
		company: "Arvo Robotics",
		status: "interviewing",
		applied: "2 Oct",
	},
	{
		position: "Backend engineer, payments",
		company: "Mintline",
		status: "applied",
		applied: "29 Sep",
	},
	{
		position: "Engineering manager",
		company: "Corbel Health",
		status: "applied",
		applied: "24 Sep",
	},
	{
		position: "Site reliability engineer",
		company: "Halden Freight",
		status: "offer",
		applied: "5 Sep",
	},
	{
		position: "Staff engineer",
		company: "Quarry Bank",
		status: "rejected",
		applied: "28 Aug",
	},
];

function Caption({
	title,
	children,
}: {
	title: string;
	children: React.ReactNode;
}) {
	return (
		<div className="flex flex-col gap-1">
			<h3 className="text-xl font-semibold">{title}</h3>
			<p className="text-muted-foreground max-w-[55ch]">{children}</p>
		</div>
	);
}

export function DeskSection() {
	return (
		<section className="mx-auto w-full max-w-7xl px-5 py-16 sm:px-8 lg:py-24">
			<h2 className="title text-4xl leading-none sm:text-5xl">
				Also on the desk
			</h2>

			<div className="mt-10 grid gap-x-10 gap-y-12 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)]">
				<div className="flex flex-col gap-5">
					<Caption title="Applications">
						Every job you apply to, with its status, listing, contacts and
						notes. Each one keeps the resume you tailored for it.
					</Caption>
					<Card layout="flush" className="overflow-x-auto">
						<table className="w-full min-w-[30rem] text-left text-sm">
							<caption className="sr-only">Example applications</caption>
							<thead className="text-muted-foreground border-b">
								<tr>
									<th scope="col" className="px-5 py-3 font-medium">
										Position
									</th>
									<th scope="col" className="px-5 py-3 font-medium">
										Status
									</th>
									<th scope="col" className="px-5 py-3 text-right font-medium">
										Applied
									</th>
								</tr>
							</thead>
							<tbody>
								{sampleApplications.map((application) => (
									<tr
										key={application.position}
										className="border-b last:border-b-0"
									>
										<td className="px-5 py-3">
											<p className="font-semibold">{application.position}</p>
											<p className="text-muted-foreground">
												{application.company}
											</p>
										</td>
										<td className="px-5 py-3">
											<StatusMark status={application.status} />
										</td>
										<td className="text-muted-foreground px-5 py-3 text-right tabular-nums">
											{application.applied}
										</td>
									</tr>
								))}
							</tbody>
						</table>
					</Card>
				</div>

				<div className="flex flex-col gap-12">
					<div className="flex flex-col gap-5">
						<Caption title="Cover letters">
							Drafted from the listing and the resume you choose. Edit the
							wording before you save it.
						</Caption>
						<Paper className="flex flex-col gap-3 px-7 py-6 text-[0.9375rem] leading-[1.6]">
							<p>Dear hiring team,</p>
							<p>
								I run the Kubernetes platform at Vantry Logistics, where 40
								engineers deploy across three regions. Your listing asks for
								someone to own the deploy pipeline and share on-call. That has
								been my job for the past four years.
							</p>
						</Paper>
					</div>

					<div className="flex flex-col gap-5">
						<Caption title="Conversation starters">
							A short first message to someone at the company, written from
							what you know about them and your profile.
						</Caption>
						<Card layout="flush" className="p-5 text-sm leading-relaxed">
							Hi Priya, I read your post on testing dispatch models and tried
							the approach on our routing data last week. I run platform
							engineering at Vantry Logistics and would like to hear how your
							team handles rollout. Are you open to a short call?
						</Card>
					</div>
				</div>
			</div>
		</section>
	);
}
