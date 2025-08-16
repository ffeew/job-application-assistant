"use client";

import { useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { authClient } from "@/app/utils/authClient";

export default function Home() {
  useEffect(() => {
    // Check if user is authenticated and redirect to dashboard
    const checkAuth = async () => {
      try {
        const session = await authClient.getSession();
        if (session) {
          window.location.href = "/dashboard";
        }
      } catch (error) {
        // User not authenticated, stay on landing page
      }
    };
    checkAuth();
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold">Job Application Assistant</h1>
          <div className="space-x-2">
            <Button variant="outline" asChild>
              <Link href="/sign-in">Sign In</Link>
            </Button>
            <Button asChild>
              <Link href="/sign-up">Sign Up</Link>
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-16">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold mb-4">
            Streamline Your Job Search
          </h2>
          <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
            Create tailored resumes, generate personalized cover letters, and track your applications all in one place.
          </p>
          <Button size="lg" asChild>
            <Link href="/sign-up">Get Started</Link>
          </Button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8 max-w-6xl mx-auto px-4">
          <Card className="h-full">
            <CardHeader className="pb-4">
              <CardTitle className="text-lg sm:text-xl">Resume Management</CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <CardDescription className="text-sm sm:text-base leading-relaxed">
                Create and manage multiple versions of your resume. Customize them for different job applications.
              </CardDescription>
            </CardContent>
          </Card>

          <Card className="h-full">
            <CardHeader className="pb-4">
              <CardTitle className="text-lg sm:text-xl">AI Cover Letters</CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <CardDescription className="text-sm sm:text-base leading-relaxed">
                Generate personalized cover letters using AI based on job descriptions and your resume.
              </CardDescription>
            </CardContent>
          </Card>

          <Card className="h-full sm:col-span-2 lg:col-span-1">
            <CardHeader className="pb-4">
              <CardTitle className="text-lg sm:text-xl">Application Tracking</CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <CardDescription className="text-sm sm:text-base leading-relaxed">
                Keep track of all your job applications, their status, and important dates in one dashboard.
              </CardDescription>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
