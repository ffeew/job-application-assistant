"use client";

import { formatMonthYear } from "@/lib/format-month-year";

import { withAsyncHandler } from "@/lib/async-action";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { useCreateEducation } from "@/app/dashboard/profile/mutations/use-create-education";
import { useUpdateEducation } from "@/app/dashboard/profile/mutations/use-update-education";
import { useDeleteEducation } from "@/app/dashboard/profile/mutations/use-delete-education";
import { createEducationSchema } from "@/app/api/profile/validators";
import type {
  EducationJsonResponse,
  CreateEducationRequest,
} from "@/app/api/profile/validators";
import { FormFieldError } from "@/components/ui/form-field-error";
import { useProfileUIStore } from "@/app/dashboard/profile/store/profile-ui-store";
import { useImportReviewStore } from "@/app/dashboard/profile/store/import-review-store";
import { ProfileItemSkeleton } from "../profile-item-skeleton";
import {
  AddButton,
  DeleteEntryDialog,
  EntryMeta,
  EntryPanel,
  EntryRow,
  EntrySheet,
  FormActions,
  PendingPanel,
  PendingRow,
  SectionEmpty,
  SectionHeader,
} from "../section-parts";

interface EducationSectionProps {
  education: EducationJsonResponse[];
  isLoading: boolean;
}

export function EducationSection({
  education,
  isLoading,
}: EducationSectionProps) {
  const editingState = useProfileUIStore((state) => state.editingState);
  const isSheetOpen = useProfileUIStore((state) => state.isSheetOpen);
  const startAdding = useProfileUIStore((state) => state.startAdding);
  const startEditing = useProfileUIStore((state) => state.startEditing);
  const cancelEditing = useProfileUIStore((state) => state.cancelEditing);
  const savingItemId = useProfileUIStore((state) => state.savingItemId);
  const setSavingItemId = useProfileUIStore((state) => state.setSavingItemId);
  const deleteConfirmation = useProfileUIStore(
    (state) => state.deleteConfirmation,
  );
  const openDeleteConfirmation = useProfileUIStore(
    (state) => state.openDeleteConfirmation,
  );
  const closeDeleteConfirmation = useProfileUIStore(
    (state) => state.closeDeleteConfirmation,
  );

  const pendingItems = useImportReviewStore((state) => state.education);
  const removePendingItem = useImportReviewStore(
    (state) => state.removeEducationDraft,
  );

  const createMutation = useCreateEducation();
  const deleteMutation = useDeleteEducation();

  const isEditingEducation =
    isSheetOpen && editingState?.section === "education";
  const editingEducation =
    isEditingEducation && editingState.itemId
      ? education.find((e) => e.id === editingState.itemId)
      : null;

  const handleDelete = () => {
    if (!deleteConfirmation || deleteConfirmation.section !== "education")
      return;
    deleteMutation.mutate(deleteConfirmation.itemId, {
      onSuccess: () => {
        toast.success("Education entry deleted");
        closeDeleteConfirmation();
      },
      onError: () => {
        toast.error("Couldn't delete the entry. Try again.");
      },
    });
  };

  const handleSavePending = async (
    id: string,
    data: CreateEducationRequest,
  ) => {
    setSavingItemId(id);
    try {
      await createMutation.mutateAsync(data);
      removePendingItem(id);
      toast.success("Education entry saved");
    } catch {
      toast.error("Couldn't save the entry. Try again.");
    } finally {
      setSavingItemId(null);
    }
  };

  if (isLoading) {
    return <ProfileItemSkeleton />;
  }

  // An empty section offers its one action in the empty state instead.
  const isEmpty = education.length === 0 && pendingItems.length === 0;

  const addButton = (
    <AddButton onClick={() => startAdding("education")}>
      Add education
    </AddButton>
  );

  return (
    <>
      <div className="flex flex-col gap-6">
        <SectionHeader
          title="Education"
          description="Degrees and courses, most recent first."
          action={isEmpty ? undefined : addButton}
        />

        {pendingItems.length > 0 && (
          <PendingPanel
            count={pendingItems.length}
            singular="education entry"
            plural="education entries"
          >
            {pendingItems.map((item) => (
              <PendingRow
                key={item.id}
                name={item.request.degree}
                isSaving={savingItemId === item.id}
                onDiscard={() => removePendingItem(item.id)}
                onSave={withAsyncHandler(() =>
                  handleSavePending(item.id, item.request),
                )}
              >
                <EducationSummary education={item.request} pending />
              </PendingRow>
            ))}
          </PendingPanel>
        )}

        {isEmpty && (
          <SectionEmpty title="No education yet" action={addButton}>
            Add the degrees or courses you want on your resumes.
          </SectionEmpty>
        )}

        {education.length > 0 && (
          <EntryPanel>
            {education.map((edu) => (
              <EntryRow
                key={edu.id}
                name={edu.degree}
                onEdit={() => startEditing("education", edu.id)}
                onDelete={() => openDeleteConfirmation("education", edu.id)}
              >
                <EducationSummary education={edu} />
              </EntryRow>
            ))}
          </EntryPanel>
        )}
      </div>

      <EntrySheet
        open={isEditingEducation}
        onClose={cancelEditing}
        title={editingEducation ? "Edit education" : "Add education"}
        description="Appears in the Education section of your resumes."
      >
        <EducationForm
          education={editingEducation}
          onSuccess={cancelEditing}
          onCancel={cancelEditing}
        />
      </EntrySheet>

      <DeleteEntryDialog
        open={deleteConfirmation?.section === "education"}
        onClose={closeDeleteConfirmation}
        onConfirm={handleDelete}
        title="Delete this education entry?"
      />
    </>
  );
}

function EducationSummary({
  education,
  pending = false,
}: {
  education: CreateEducationRequest;
  pending?: boolean;
}) {
  const Heading = pending ? "h4" : "h3";
  const dates = [
    formatMonthYear(education.startDate),
    formatMonthYear(education.endDate),
  ]
    .filter(Boolean)
    .join(" to ");

  return (
    <>
      <div>
        <Heading className="font-semibold">
          {education.degree}
          {education.fieldOfStudy && `, ${education.fieldOfStudy}`}
        </Heading>
        <p className="text-muted-foreground">{education.institution}</p>
      </div>
      <EntryMeta>
        {dates && <span>{dates}</span>}
        {education.location && <span>{education.location}</span>}
        {education.gpa && <span>GPA {education.gpa}</span>}
        {education.honors && <span>{education.honors}</span>}
      </EntryMeta>
      {pending && education.relevantCoursework && (
        <p className="text-muted-foreground text-sm">
          Coursework: {education.relevantCoursework}
        </p>
      )}
    </>
  );
}

function EducationForm({
  education,
  onSuccess,
  onCancel,
}: {
  education?: EducationJsonResponse | null;
  onSuccess: () => void;
  onCancel: () => void;
}) {
  const createMutation = useCreateEducation();
  const updateMutation = useUpdateEducation();

  const form = useForm({
    resolver: zodResolver(createEducationSchema),
    defaultValues: {
      degree: education?.degree || "",
      fieldOfStudy: education?.fieldOfStudy ?? null,
      institution: education?.institution || "",
      location: education?.location ?? null,
      startDate: education?.startDate ?? null,
      endDate: education?.endDate ?? null,
      gpa: education?.gpa ?? null,
      honors: education?.honors ?? null,
      relevantCoursework: education?.relevantCoursework ?? null,
      displayOrder: education?.displayOrder ?? 0,
    },
  });

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = form;

  const onSubmit = (data: unknown) => {
    const validatedData = data as CreateEducationRequest;
    if (education) {
      updateMutation.mutate(
        { id: education.id, data: validatedData },
        {
          onSuccess: () => {
            toast.success("Changes saved");
            onSuccess();
          },
          onError: () => toast.error("Couldn't save the changes. Try again."),
        },
      );
    } else {
      createMutation.mutate(validatedData, {
        onSuccess: () => {
          toast.success("Education entry saved");
          onSuccess();
        },
        onError: () => toast.error("Couldn't save the entry. Try again."),
      });
    }
  };

  return (
    <form
      onSubmit={withAsyncHandler(handleSubmit(onSubmit))}
      className="flex flex-col gap-6 p-4 pt-2"
    >
      <div className="grid grid-cols-2 gap-4">
        <div className="flex flex-col gap-2">
          <Label htmlFor="degree">Degree *</Label>
          <Input id="degree" {...register("degree")} />
          <FormFieldError message={errors.degree?.message} />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="fieldOfStudy">Field of study</Label>
          <Input id="fieldOfStudy" {...register("fieldOfStudy")} />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="flex flex-col gap-2">
          <Label htmlFor="institution">Institution *</Label>
          <Input id="institution" {...register("institution")} />
          <FormFieldError message={errors.institution?.message} />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="location">Location</Label>
          <Input id="location" {...register("location")} />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="flex flex-col gap-2">
          <Label htmlFor="startDate">Start date</Label>
          <Input id="startDate" type="month" {...register("startDate")} />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="endDate">End date</Label>
          <Input id="endDate" type="month" {...register("endDate")} />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="flex flex-col gap-2">
          <Label htmlFor="gpa">GPA</Label>
          <Input id="gpa" {...register("gpa")} placeholder="e.g. 3.8/4.0" />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="honors">Honors</Label>
          <Input id="honors" {...register("honors")} />
        </div>
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="relevantCoursework">Relevant coursework</Label>
        <Textarea
          id="relevantCoursework"
          {...register("relevantCoursework")}
          rows={2}
        />
      </div>
      <FormActions
        onCancel={onCancel}
        isSubmitting={
          isSubmitting || createMutation.isPending || updateMutation.isPending
        }
      />
    </form>
  );
}
