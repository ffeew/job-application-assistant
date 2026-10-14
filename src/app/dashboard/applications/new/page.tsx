"use client";

import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useCreateApplication } from "@/app/dashboard/applications/mutations/use-create-application";
import { PageHeader } from "@/app/dashboard/components/page-header";
import { ApplicationForm } from "../components/application-form";

export default function NewApplicationPage() {
  const router = useRouter();
  const createApplicationMutation = useCreateApplication();

  return (
    <div className="flex max-w-4xl flex-col gap-8">
      <PageHeader
        title="Add application"
        description="Record a job you are applying to. You can tailor a resume to it once it is saved."
        back={{ href: "/dashboard/applications", label: "Applications" }}
      />
      <ApplicationForm
        submitLabel="Save application"
        isPending={createApplicationMutation.isPending}
        onSubmit={(data) => {
          createApplicationMutation.mutate(data, {
            onSuccess: () => {
              toast.success("Application saved");
              router.push("/dashboard/applications");
            },
            onError: () => {
              toast.error("Couldn't save the application. Try again.");
            },
          });
        }}
      />
    </div>
  );
}
