"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Trophy, Plus } from "lucide-react";
import type { AchievementResponse } from "@/lib/validators/profile.validator";

interface AchievementsListProps {
  achievements: AchievementResponse[];
  isLoading: boolean;
}

export function AchievementsList({ achievements: _achievements, isLoading }: AchievementsListProps) {
  if (isLoading) {
    return <div className="animate-pulse h-32 bg-gray-200 rounded"></div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <Trophy className="h-5 w-5" />
            Achievements
          </h2>
          <p className="text-sm text-muted-foreground">
            Highlight your notable achievements
          </p>
        </div>
        <Button disabled>
          <Plus className="mr-2 h-4 w-4" />
          Add Achievement
        </Button>
      </div>

      <Card>
        <CardContent className="py-8 text-center">
          <Trophy className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">Achievements component coming soon</h3>
          <p className="text-muted-foreground">
            This component will be implemented in the next phase.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}