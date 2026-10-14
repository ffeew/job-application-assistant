import { NextRequest, NextResponse } from "next/server";
import { routeErrorResponse } from "@/app/api/route-error";
import { auth } from "@/lib/auth";
import { ApplicationsService } from "@/app/api/applications/service";
import {
  enqueueGenerationJob,
  getGenerationJob,
} from "@/app/api/resume-generation/jobs/service";
import { jobIntentSchema } from "@/app/api/resume-generation/jobs/validators";
import { ResumesService } from "@/app/api/resumes/service";
import { jobApplicationResumeRequestSchema } from "@/app/api/profile/validators";
import { z } from "zod";
import { saveTailoredResumeRequestSchema } from "./validators";
import { generationErrorResponse } from "@/app/api/resume-generation/errors";
import { storeResumePdf } from "@/app/api/stored-files";
import { serializeGeneratedResume } from "@/lib/resume-document";
import { RequestError } from "@/lib/request-error";

const applicationsService = new ApplicationsService();
const resumesService = new ResumesService();

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: applicationId } = await params;
    const body: unknown = await request.json();
    // Merging the path ID must not turn a non-object body into a valid request.
    const requestFields = z.record(z.string(), z.unknown()).parse(body);
    const validatedRequest = jobApplicationResumeRequestSchema.parse({
      ...requestFields,
      applicationId,
    });

    const format = request.nextUrl.searchParams.get("format") ?? "preview";
    if (!["pdf", "preview"].includes(format)) {
      return NextResponse.json(
        { error: "Use PDF or preview format." },
        { status: 400 },
      );
    }
    const intent = jobIntentSchema.parse(
      requestFields.intent ?? (format === "pdf" ? "download" : "preview"),
    );
    const job = await enqueueGenerationJob(session.user.id, {
      kind: "application",
      intent,
      request: validatedRequest,
    });
    return NextResponse.json(job, {
      status: 202,
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    return generationErrorResponse(error);
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: applicationId } = await params;
    const application = await applicationsService.getApplicationById(
      session.user.id,
      applicationId,
    );

    if (!application) {
      return NextResponse.json(
        { error: "Application not found" },
        { status: 404 },
      );
    }

    const existingTailoredResume =
      await resumesService.getTailoredResumeByApplication(
        session.user.id,
        applicationId,
      );

    return NextResponse.json({
      id: application.id,
      company: application.company,
      position: application.position,
      jobDescription: application.jobDescription,
      hasJobDescription: !!application.jobDescription,
      location: application.location,
      status: application.status,
      tailoredResume: existingTailoredResume
        ? {
            id: existingTailoredResume.id,
            title: existingTailoredResume.title,
            updatedAt: existingTailoredResume.updatedAt,
          }
        : null,
    });
  } catch (error) {
    return routeErrorResponse(error, "Failed to fetch application");
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: applicationId } = await params;
    const body: unknown = await request.json();
    const validatedData = saveTailoredResumeRequestSchema.parse(body);

    const application = await applicationsService.getApplicationById(
      session.user.id,
      applicationId,
    );

    if (!application) {
      return NextResponse.json(
        { error: "Application not found" },
        { status: 404 },
      );
    }

    // Finished jobs are removed after a week, and a job belongs to one
    // application: a preview made elsewhere must not be saved here.
    const job = await getGenerationJob(session.user.id, validatedData.jobId);
    if (
      job?.status !== "completed" ||
      !job.result ||
      job.payload.kind !== "application" ||
      job.payload.request.applicationId !== applicationId
    ) {
      throw new RequestError(
        "That preview is no longer available. Preview again, then save.",
        404,
      );
    }
    const content = serializeGeneratedResume(job.result);

    const existingResume = await resumesService.getTailoredResumeByApplication(
      session.user.id,
      applicationId,
    );
    // The resume is saved even if the PDF could not be kept; it is then
    // compiled when the resume is opened. The service removes the file again
    // if the save itself fails.
    const pdfKey = await storeResumePdf(
      session.user.id,
      Buffer.from(job.result.pdfBase64, "base64"),
    );

    let resume;
    if (existingResume) {
      resume = await resumesService.updateResume(
        session.user.id,
        existingResume.id,
        { title: validatedData.title, content },
        pdfKey,
      );
    } else {
      resume = await resumesService.createResume(
        session.user.id,
        {
          title: validatedData.title,
          content,
          isDefault: false,
          jobApplicationId: applicationId,
          isTailored: true,
        },
        pdfKey,
      );
    }

    if (!resume) {
      throw new Error("Failed to save tailored resume");
    }

    return NextResponse.json({
      success: true,
      resume: {
        id: resume.id,
        title: resume.title,
        isTailored: resume.isTailored,
        jobApplicationId: resume.jobApplicationId,
        updatedAt: resume.updatedAt,
      },
      isNew: !existingResume,
    });
  } catch (error) {
    return routeErrorResponse(error, "Failed to save tailored resume");
  }
}
