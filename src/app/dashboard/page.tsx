"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FileText, Briefcase, PenTool, Plus } from "lucide-react";
import { useDashboardData } from "@/hooks";

export default function DashboardPage() {
  const { stats, activity, isLoading, isError, error, refetch } = useDashboardData();

  const formatRelativeTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diffInSeconds < 60) return "Just now";
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)} minutes ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)} hours ago`;
    if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)} days ago`;
    return date.toLocaleDateString();
  };

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'application':
        return Briefcase;
      case 'cover_letter':
        return PenTool;
      case 'resume':
      default:
        return FileText;
    }
  };

  const getActivityIconColor = (type: string, action: string) => {
    const actionIntensity = action === 'created' ? '600' : action === 'updated' ? '500' : '400';
    const baseColors = {
      application: `text-blue-${actionIntensity}`,
      cover_letter: `text-purple-${actionIntensity}`,
      resume: `text-green-${actionIntensity}`,
    };
    return baseColors[type as keyof typeof baseColors] || `text-gray-${actionIntensity}`;
  };

  const getActivityBackgroundColor = (type: string) => {
    const backgroundColors = {
      application: 'bg-blue-100 dark:bg-blue-900',
      cover_letter: 'bg-purple-100 dark:bg-purple-900',
      resume: 'bg-green-100 dark:bg-green-900',
    };
    return backgroundColors[type as keyof typeof backgroundColors] || 'bg-gray-100 dark:bg-gray-900';
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Dashboard</h1>
            <p className="text-muted-foreground">Loading your job search activity...</p>
          </div>
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <div className="h-4 w-24 bg-muted rounded animate-pulse" />
                <div className="h-4 w-4 bg-muted rounded animate-pulse" />
              </CardHeader>
              <CardContent>
                <div className="h-8 w-16 bg-muted rounded animate-pulse mb-2" />
                <div className="h-3 w-20 bg-muted rounded animate-pulse" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Dashboard</h1>
            <p className="text-muted-foreground">Error loading dashboard</p>
          </div>
        </div>
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <p className="text-red-600 mb-4">{error?.message || 'Failed to load dashboard data'}</p>
            <Button onClick={() => refetch()}>Try Again</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground">
            Welcome back! Here&apos;s an overview of your job search activity.
          </p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Resumes</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.totalResumes || 0}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Applications</CardTitle>
            <Briefcase className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.totalApplications || 0}</div>
            <p className="text-xs text-muted-foreground">
              {(stats?.applicationsByStatus.applied || 0) + (stats?.applicationsByStatus.interviewing || 0)} active
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Cover Letters</CardTitle>
            <PenTool className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.totalCoverLetters || 0}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Success Rate</CardTitle>
            <Briefcase className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats ? Math.round(((stats.applicationsByStatus.offer || 0) / Math.max(stats.totalApplications, 1)) * 100) : 0}%
            </div>
            <p className="text-xs text-muted-foreground">
              Offer rate
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
        <Card className="w-full min-w-0 overflow-hidden">
          <CardHeader className="pb-3 sm:pb-4">
            <CardTitle className="text-base sm:text-lg truncate">Resume Management</CardTitle>
            <CardDescription className="text-sm leading-relaxed">
              Create and manage your resumes
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-0 px-4 sm:px-6">
            <div className="flex flex-wrap gap-2">
              <Button asChild className="text-xs sm:text-sm">
                <Link href="/dashboard/resumes/new">
                  <Plus className="mr-1 sm:mr-2 h-3 w-3 sm:h-4 sm:w-4" />
                  New Resume
                </Link>
              </Button>
              <Button variant="outline" asChild className="text-xs sm:text-sm">
                <Link href="/dashboard/resumes">View All</Link>
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="w-full min-w-0 overflow-hidden">
          <CardHeader className="pb-3 sm:pb-4">
            <CardTitle className="text-base sm:text-lg truncate">Job Applications</CardTitle>
            <CardDescription className="text-sm leading-relaxed">
              Track your job applications
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-0 px-4 sm:px-6">
            <div className="flex flex-wrap gap-2">
              <Button asChild className="text-xs sm:text-sm">
                <Link href="/dashboard/applications/new">
                  <Plus className="mr-1 sm:mr-2 h-3 w-3 sm:h-4 sm:w-4" />
                  Add Application
                </Link>
              </Button>
              <Button variant="outline" asChild className="text-xs sm:text-sm">
                <Link href="/dashboard/applications">View All</Link>
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="w-full min-w-0 overflow-hidden sm:col-span-2 lg:col-span-1">
          <CardHeader className="pb-3 sm:pb-4">
            <CardTitle className="text-base sm:text-lg truncate">Cover Letters</CardTitle>
            <CardDescription className="text-sm leading-relaxed">
              Generate AI-powered cover letters
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-0 px-4 sm:px-6">
            <div className="flex flex-wrap gap-2">
              <Button asChild className="text-xs sm:text-sm">
                <Link href="/dashboard/cover-letters/new">
                  <Plus className="mr-1 sm:mr-2 h-3 w-3 sm:h-4 sm:w-4" />
                  Generate Letter
                </Link>
              </Button>
              <Button variant="outline" asChild className="text-xs sm:text-sm">
                <Link href="/dashboard/cover-letters">View All</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
          <CardDescription>
            Your latest job search activities
          </CardDescription>
        </CardHeader>
        <CardContent>
          {activity.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <p>No recent activity yet.</p>
              <p className="text-sm">Start by creating a resume or adding a job application!</p>
            </div>
          ) : (
            <div className="space-y-4">
              {activity.map((activityItem) => {
                const IconComponent = getActivityIcon(activityItem.type);
                const iconColor = getActivityIconColor(activityItem.type, activityItem.action);
                const backgroundColor = getActivityBackgroundColor(activityItem.type);
                
                return (
                  <div key={activityItem.id} className="flex items-center space-x-4">
                    <div className={`${backgroundColor} p-2 rounded-full`}>
                      <IconComponent className={`h-4 w-4 ${iconColor}`} />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium">{activityItem.title}</p>
                      {activityItem.description && (
                        <p className="text-xs text-muted-foreground">{activityItem.description}</p>
                      )}
                      <p className="text-xs text-muted-foreground">
                        {formatRelativeTime(activityItem.createdAt.toISOString())}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}