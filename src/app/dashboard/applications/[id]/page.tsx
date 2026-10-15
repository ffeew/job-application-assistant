"use client";

import { runAsyncAction } from "@/lib/async-action";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Notice } from "@/components/ui/notice";
import { FileText } from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";
import { useApplication } from "@/app/dashboard/applications/queries/use-applications";
import { useUpdateApplication } from "@/app/dashboard/applications/mutations/use-update-application";
import { PageHeader } from "@/app/dashboard/components/page-header";
import { ApplicationDetailSkeleton } from "../components/application-detail-skeleton";
import { ApplicationForm } from "../components/application-form";

export default function EditApplicationPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const [resolvedParams, setResolvedParams] = useState<{ id: string } | null>(
    null,
  );
  const router = useRouter();
  const {
    data: application,
    isLoading,
    error,
  } = useApplication(resolvedParams?.id || "");
  const updateApplicationMutation = useUpdateApplication();

  useEffect(() => {
    const resolveParams = async () => {
      const resolved = await params;
      setResolvedParams(resolved);
    };
    runAsyncAction(resolveParams());
  }, [params]);

  if (!resolvedParams || isLoading) {
    return <ApplicationDetailSkeleton />;
  }

  if (error || !application) {
    return (
      <div className="flex max-w-4xl flex-col gap-8">
        <PageHeader
          title="Edit application"
          back={{ href: "/dashboard/applications", label: "Applications" }}
        />
        <Notice tone="error" title="This application didn't load">
          It may have been deleted, or the server could not be reached. Go back
          to your applications and open it again.
        </Notice>
      </div>
    );
  }

  return (
    <div className="flex max-w-4xl flex-col gap-8">
      <PageHeader
        title="Edit application"
        description={`${application.position} at ${application.company}`}
        back={{ href: "/dashboard/applications", label: "Applications" }}
        actions={
          <Button variant="outline" asChild>
            <Link href={`/dashboard/applications/${resolvedParams.id}/resume`}>
              <FileText />
              Tailor resume
            </Link>
          </Button>
        }
      />

      <ApplicationForm
        application={application}
        submitLabel="Save changes"
        isPending={updateApplicationMutation.isPending}
        onSubmit={(data) => {
          updateApplicationMutation.mutate(
            { id: resolvedParams.id, data },
            {
              onSuccess: () => {
                toast.success("Changes saved");
                router.push("/dashboard/applications");
              },
              onError: () => {
                toast.error("Couldn't save the changes. Try again.");
              },
            },
          );
        }}
      />
    </div>
  );
}
