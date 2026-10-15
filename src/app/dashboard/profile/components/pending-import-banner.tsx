"use client";

import { withAsyncHandler } from "@/lib/async-action";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useImportReviewStore } from "@/app/dashboard/profile/store/import-review-store";
import type { PendingReviewItem } from "@/app/dashboard/profile/utils/import-normalizers";
import { useCreateWorkExperience } from "@/app/dashboard/profile/mutations/use-create-work-experience";
import { useCreateEducation } from "@/app/dashboard/profile/mutations/use-create-education";
import { useCreateSkill } from "@/app/dashboard/profile/mutations/use-create-skill";
import { useCreateProject } from "@/app/dashboard/profile/mutations/use-create-project";
import { useCreateCertification } from "@/app/dashboard/profile/mutations/use-create-certification";
import { useCreateAchievement } from "@/app/dashboard/profile/mutations/use-create-achievement";
import { useCreateReference } from "@/app/dashboard/profile/mutations/use-create-reference";

const count = (total: number, singular: string, plural = `${singular}s`) =>
  `${total} ${total === 1 ? singular : plural}`;

// Each entry leaves the review list as soon as it is stored. If a later entry
// fails, saving again continues from there instead of storing the first ones twice.
async function saveEach<T>(
  items: PendingReviewItem<T>[],
  save: (request: T) => Promise<unknown>,
  remove: (id: string) => void,
): Promise<number> {
  for (const item of items) {
    await save(item.request);
    remove(item.id);
  }
  return items.length;
}

export function PendingImportBanner() {
  const [isSaving, setIsSaving] = useState(false);

  const clearImport = useImportReviewStore((state) => state.clear);
  const pendingWorkExperiences = useImportReviewStore(
    (state) => state.workExperiences,
  );
  const pendingEducation = useImportReviewStore((state) => state.education);
  const pendingSkills = useImportReviewStore((state) => state.skills);
  const pendingProjects = useImportReviewStore((state) => state.projects);
  const pendingCertifications = useImportReviewStore(
    (state) => state.certifications,
  );
  const pendingAchievements = useImportReviewStore(
    (state) => state.achievements,
  );
  const pendingReferences = useImportReviewStore((state) => state.references);
  const globalWarnings = useImportReviewStore((state) => state.warnings);

  const removeWorkExperience = useImportReviewStore(
    (state) => state.removeWorkExperienceDraft,
  );
  const removeEducation = useImportReviewStore(
    (state) => state.removeEducationDraft,
  );
  const removeSkill = useImportReviewStore((state) => state.removeSkillDraft);
  const removeProject = useImportReviewStore(
    (state) => state.removeProjectDraft,
  );
  const removeCertification = useImportReviewStore(
    (state) => state.removeCertificationDraft,
  );
  const removeAchievement = useImportReviewStore(
    (state) => state.removeAchievementDraft,
  );
  const removeReference = useImportReviewStore(
    (state) => state.removeReferenceDraft,
  );

  const createWorkExperienceMutation = useCreateWorkExperience();
  const createEducationMutation = useCreateEducation();
  const createSkillMutation = useCreateSkill();
  const createProjectMutation = useCreateProject();
  const createCertificationMutation = useCreateCertification();
  const createAchievementMutation = useCreateAchievement();
  const createReferenceMutation = useCreateReference();

  const pendingSummary = [
    pendingWorkExperiences.length > 0 &&
      count(pendingWorkExperiences.length, "experience"),
    pendingEducation.length > 0 && `${pendingEducation.length} education`,
    pendingSkills.length > 0 && count(pendingSkills.length, "skill"),
    pendingProjects.length > 0 && count(pendingProjects.length, "project"),
    pendingCertifications.length > 0 &&
      count(pendingCertifications.length, "certification"),
    pendingAchievements.length > 0 &&
      count(pendingAchievements.length, "achievement"),
    pendingReferences.length > 0 &&
      count(pendingReferences.length, "reference"),
  ].filter((part): part is string => Boolean(part));

  const totalPendingItems =
    pendingWorkExperiences.length +
    pendingEducation.length +
    pendingSkills.length +
    pendingProjects.length +
    pendingCertifications.length +
    pendingAchievements.length +
    pendingReferences.length;

  const handleDiscard = () => {
    clearImport();
    toast.message("Imported data discarded");
  };

  const handleSaveAll = async () => {
    if (totalPendingItems === 0) {
      toast.info("No pending items to save.");
      return;
    }

    setIsSaving(true);
    const warningMessages = [...globalWarnings];
    const saved: string[] = [];
    const record = (total: number, singular: string, plural?: string) => {
      if (total > 0) saved.push(count(total, singular, plural));
    };

    try {
      record(
        await saveEach(
          pendingWorkExperiences,
          createWorkExperienceMutation.mutateAsync,
          removeWorkExperience,
        ),
        "work experience",
      );
      record(
        await saveEach(
          pendingEducation,
          createEducationMutation.mutateAsync,
          removeEducation,
        ),
        "education entry",
        "education entries",
      );
      record(
        await saveEach(
          pendingSkills,
          createSkillMutation.mutateAsync,
          removeSkill,
        ),
        "skill",
      );
      record(
        await saveEach(
          pendingProjects,
          createProjectMutation.mutateAsync,
          removeProject,
        ),
        "project",
      );
      record(
        await saveEach(
          pendingCertifications,
          createCertificationMutation.mutateAsync,
          removeCertification,
        ),
        "certification",
      );
      record(
        await saveEach(
          pendingAchievements,
          createAchievementMutation.mutateAsync,
          removeAchievement,
        ),
        "achievement",
      );
      record(
        await saveEach(
          pendingReferences,
          createReferenceMutation.mutateAsync,
          removeReference,
        ),
        "reference",
      );

      clearImport();

      if (saved.length > 0) {
        toast.success(`Saved ${saved.join(", ")}.`);
      }
      if (warningMessages.length > 0) {
        const [firstWarning, ...restWarnings] = warningMessages;
        toast.warning(firstWarning, {
          description:
            restWarnings.length > 0
              ? `+${count(restWarnings.length, "additional warning")}.`
              : undefined,
        });
      }
    } catch {
      toast.error(
        "Couldn't save everything. The entries still listed were not saved; try again.",
      );
    } finally {
      setIsSaving(false);
    }
  };

  if (totalPendingItems === 0) {
    return null;
  }

  return (
    <div
      role="status"
      className="folder sticky bottom-0 z-20 -mx-5 flex flex-col gap-3 border-t px-5 py-3 sm:-mx-8 sm:flex-row sm:items-center sm:justify-between sm:px-8"
    >
      <div className="flex flex-col gap-0.5">
        <p className="text-sm font-semibold">
          {count(totalPendingItems, "imported item")} waiting for review
        </p>
        <p className="text-muted-foreground text-sm">
          {pendingSummary.join(", ")}
        </p>
      </div>
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={handleDiscard}
          disabled={isSaving}
        >
          Discard all
        </Button>
        <Button
          size="sm"
          onClick={withAsyncHandler(handleSaveAll)}
          disabled={isSaving}
        >
          {isSaving && <Loader2 className="animate-spin" />}
          {isSaving ? "Saving…" : "Save all"}
        </Button>
      </div>
    </div>
  );
}
