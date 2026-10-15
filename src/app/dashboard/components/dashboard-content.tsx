"use client";

import Link from "next/link";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Notice } from "@/components/ui/notice";
import type { ActivityItem } from "@/app/api/dashboard/validators";
import { cn } from "@/lib/utils";
import { useDashboardStats } from "../queries/use-dashboard-stats";
import { useDashboardActivity } from "../queries/use-dashboard-activity";
import {
  applicationStatuses,
  statusFills,
  statusLabels,
  StatusMark,
} from "../applications/components/status-mark";
import { DashboardSkeleton } from "./dashboard-skeleton";
import { EmptyState } from "./empty-state";
import { PageHeader } from "./page-header";

const plural = (count: number, noun: string) =>
  `${count} ${noun}${count === 1 ? "" : "s"}`;

const formatRelativeTime = (timestamp: string) => {
  const date = new Date(timestamp);
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);

  if (seconds < 60) return "Just now";
  if (seconds < 3600)
    return `${plural(Math.floor(seconds / 60), "minute")} ago`;
  if (seconds < 86400)
    return `${plural(Math.floor(seconds / 3600), "hour")} ago`;
  if (seconds < 604800)
    return `${plural(Math.floor(seconds / 86400), "day")} ago`;
  return date.toLocaleDateString();
};

const activityNouns: Record<ActivityItem["type"], string> = {
  application: "Application",
  resume: "Resume",
  cover_letter: "Cover letter",
};

const activityVerbs: Record<ActivityItem["action"], string> = {
  created: "added",
  updated: "updated",
  deleted: "deleted",
};

const addApplicationButton = (
  <Button asChild>
    <Link href="/dashboard/applications/new">
      <Plus />
      Add application
    </Link>
  </Button>
);

export function DashboardContent() {
  const {
    data: stats,
    isLoading: statsLoading,
    error: statsError,
    refetch: refetchStats,
  } = useDashboardStats();
  const {
    data: activity = [],
    isLoading: activityLoading,
    error: activityError,
    refetch: refetchActivity,
  } = useDashboardActivity();

  if (statsLoading || activityLoading) {
    return <DashboardSkeleton />;
  }

  const error = statsError ?? activityError;
  if (error || !stats) {
    return (
      <div className="flex flex-col gap-8">
        <PageHeader title="Dashboard" />
        <Notice tone="error" title="The dashboard didn't load">
          <p>{error?.message ?? "No data came back from the server."}</p>
          <Button
            variant="outline"
            size="sm"
            className="mt-3"
            onClick={() => {
              void refetchStats();
              void refetchActivity();
            }}
          >
            Try again
          </Button>
        </Notice>
      </div>
    );
  }

  const counts = stats.applicationsByStatus;
  const total = stats.totalApplications;
  const inProgress = counts.applied + counts.interviewing;
  const segments = applicationStatuses.filter((status) => counts[status] > 0);

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        title="Dashboard"
        description="Where your applications stand and what changed recently."
        actions={addApplicationButton}
      />

      {total === 0 ? (
        <EmptyState
          title="No applications yet"
          actions={
            <>
              {addApplicationButton}
              <Button variant="outline" asChild>
                <Link href="/dashboard/profile">Open your profile</Link>
              </Button>
            </>
          }
        >
          Fill in your profile first, then add the job you want to apply to.
          Each application can have its own tailored resume.
        </EmptyState>
      ) : (
        <section aria-labelledby="pipeline-title">
          <Card layout="flush" className="flex flex-col gap-6 p-6">
            <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1">
              <h2 id="pipeline-title" className="text-lg font-semibold">
                Applications
              </h2>
              <Link
                href="/dashboard/applications"
                className="text-link text-sm underline underline-offset-4 hover:no-underline"
              >
                View all applications
              </Link>
            </div>

            <ul className="grid grid-cols-2 gap-x-6 gap-y-6 sm:grid-cols-3 lg:grid-cols-5">
              {applicationStatuses.map((status) => (
                <li key={status} className="flex flex-col items-start gap-3">
                  <span
                    className={cn(
                      "title text-5xl leading-none tabular-nums",
                      counts[status] === 0 && "text-muted-foreground/60",
                    )}
                  >
                    {counts[status]}
                  </span>
                  <StatusMark status={status} />
                </li>
              ))}
            </ul>

            {/* The counts above carry every value, so the strip is decorative for assistive tech. */}
            <div aria-hidden="true" className="flex gap-0.5">
              {segments.map((status) => (
                <div
                  key={status}
                  className="group relative min-w-3 basis-0"
                  // Segment width is the data: one flex unit per application.
                  style={{ flexGrow: counts[status] }}
                >
                  <div
                    className={`h-4 transition-[filter] group-first:rounded-l-sm group-last:rounded-r-sm group-hover:brightness-125 ${statusFills[status]}`}
                  />
                  <div className="bg-foreground text-background pointer-events-none absolute bottom-full left-1/2 mb-1 hidden -translate-x-1/2 rounded-md px-2 py-1 text-xs whitespace-nowrap group-hover:block">
                    {statusLabels[status]}: {counts[status]}
                  </div>
                </div>
              ))}
            </div>

            <p className="text-muted-foreground text-sm">
              <strong className="text-foreground font-semibold">
                {plural(total, "application")}
              </strong>
              . {inProgress} in progress
              {counts.offer > 0 &&
                `, ${plural(counts.offer, "offer")} (${Math.round((counts.offer / total) * 100)}% of all applications)`}
              .
            </p>
          </Card>
        </section>
      )}

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <section aria-labelledby="activity-title">
          <Card layout="flush">
            <h2
              id="activity-title"
              className="border-b px-6 py-4 text-lg font-semibold"
            >
              Recent activity
            </h2>
            {activity.length === 0 ? (
              <p className="text-muted-foreground px-6 py-6 text-sm">
                Nothing yet. Changes to your applications, resumes and cover
                letters show up here.
              </p>
            ) : (
              <ul>
                {activity.map((item) => (
                  <li
                    key={item.id}
                    className="grid gap-x-6 gap-y-0.5 border-b px-6 py-3 text-sm last:border-b-0 sm:grid-cols-[minmax(0,1fr)_auto]"
                  >
                    <div className="min-w-0">
                      <p className="truncate font-medium">{item.title}</p>
                      <p className="text-muted-foreground">
                        {activityNouns[item.type]} {activityVerbs[item.action]}
                      </p>
                    </div>
                    <p className="text-muted-foreground tabular-nums sm:text-right">
                      {formatRelativeTime(item.createdAt)}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </section>

        <section aria-labelledby="documents-title">
          <Card layout="flush">
            <h2
              id="documents-title"
              className="border-b px-6 py-4 text-lg font-semibold"
            >
              Documents
            </h2>
            <ul className="text-sm">
              <li className="flex items-center justify-between gap-4 border-b px-6 py-3">
                <Link
                  href="/dashboard/resumes"
                  className="text-link underline underline-offset-4 hover:no-underline"
                >
                  Resumes
                </Link>
                <span className="font-semibold tabular-nums">
                  {stats.totalResumes}
                </span>
              </li>
              <li className="flex items-center justify-between gap-4 px-6 py-3">
                <Link
                  href="/dashboard/cover-letters"
                  className="text-link underline underline-offset-4 hover:no-underline"
                >
                  Cover letters
                </Link>
                <span className="font-semibold tabular-nums">
                  {stats.totalCoverLetters}
                </span>
              </li>
            </ul>
            <div className="flex flex-col gap-2 border-t p-4">
              <Button variant="outline" asChild>
                <Link href="/dashboard/resumes/generate">
                  Generate resume from profile
                </Link>
              </Button>
              <Button variant="outline" asChild>
                <Link href="/dashboard/cover-letters/new">
                  Write cover letter
                </Link>
              </Button>
            </div>
          </Card>
        </section>
      </div>
    </div>
  );
}
