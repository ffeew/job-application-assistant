import { Stamp } from "@/components/ui/stamp";
import { cn } from "@/lib/utils";
import type { ApplicationJsonResponse } from "@/app/api/applications/validators";

export type ApplicationStatus = ApplicationJsonResponse["status"];

export const applicationStatuses = [
  "applied",
  "interviewing",
  "offer",
  "rejected",
  "withdrawn",
] as const satisfies readonly ApplicationStatus[];

export const statusLabels: Record<ApplicationStatus, string> = {
  applied: "Applied",
  interviewing: "Interviewing",
  offer: "Offer",
  rejected: "Rejected",
  withdrawn: "Withdrawn",
};

export const statusFills: Record<ApplicationStatus, string> = {
  applied: "bg-status-applied",
  interviewing: "bg-status-interviewing",
  offer: "bg-status-offer",
  rejected: "bg-status-rejected",
  withdrawn: "bg-status-withdrawn",
};

export const statusInks: Record<ApplicationStatus, string> = {
  applied: "text-status-applied",
  interviewing: "text-status-interviewing",
  offer: "text-status-offer",
  rejected: "text-status-rejected",
  withdrawn: "text-status-withdrawn",
};

const decided: readonly ApplicationStatus[] = [
  "offer",
  "rejected",
  "withdrawn",
];

/** Status inks need a sheet beneath them to preserve contrast. */
export function StatusMark({
  status,
  className,
}: {
  status: ApplicationStatus;
  className?: string;
}) {
  return (
    <Stamp
      data-slot="status-mark"
      frame={decided.includes(status) ? "double" : "single"}
      className={cn(statusInks[status], className)}
    >
      {statusLabels[status]}
    </Stamp>
  );
}
