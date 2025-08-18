import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { Briefcase } from "lucide-react";

interface HeaderProps {
  isAuthenticated: boolean | null;
}

export function Header({ isAuthenticated }: HeaderProps) {
  return (
    <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto px-4 py-4 flex justify-between items-center">
        <div className="flex items-center space-x-2">
          <Briefcase className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-bold">Job Application Assistant</h1>
        </div>
        <div className="flex items-center space-x-2">
          <ThemeToggle />
          {isAuthenticated === null ? (
            // Loading state
            <div className="space-x-2">
              <div className="w-20 h-9 bg-muted rounded animate-pulse" />
              <div className="w-24 h-9 bg-muted rounded animate-pulse" />
            </div>
          ) : isAuthenticated ? (
            // Authenticated user
            <Button asChild>
              <Link href="/dashboard">Go to Dashboard</Link>
            </Button>
          ) : (
            // Not authenticated
            <>
              <Button variant="outline" asChild>
                <Link href="/dashboard">Try Demo</Link>
              </Button>
              <Button asChild>
                <Link href="/sign-up">Get Started</Link>
              </Button>
            </>
          )}
        </div>
      </div>
    </header>
  );
}